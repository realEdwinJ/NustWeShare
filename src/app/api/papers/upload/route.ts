import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { modules } from "@/db/schema/modules";
import { papers } from "@/db/schema/papers";
import { paperFiles } from "@/db/schema/paper_files";
import { randomUUID } from "crypto";
import { validatePdfFile, validatePdfMagic } from "@/lib/validation/pdf";
import { sha256 } from "@/lib/duplicates/sha256";
import { fingerprintFromText, normalizeText } from "@/lib/duplicates/textFingerprint";
import { findOrCreatePaper } from "@/lib/papers/resolve";
import { getStorage } from "@/lib/r2/client";
import { buildR2Key } from "@/lib/r2/keys";
import { sanitizeFilename, hashIp } from "@/lib/security/sanitize";
import { rateLimit, limits } from "@/lib/security/rateLimit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// POST /api/papers/upload — ghost-first, module required, multi-file, per-file metadata optional
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const rl = rateLimit({ key: `upload:${hashIp(ip).slice(0, 16)}`, limit: limits.upload.limit, windowMs: limits.upload.windowMs });
  if (!rl.allowed) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many uploads. Try again later." } }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid form data." } }, { status: 400 });
  }

  // Honeypot check (Spec 52 upload abuse) — hidden field 'website' should be empty
  const honeypot = form.get("website") as string | null;
  if (honeypot && String(honeypot).trim().length > 0) {
    return NextResponse.json({ error: { code: "BOT_DETECTED", message: "Bot detected." } }, { status: 400 });
  }

  const moduleId = form.get("moduleId") as string | null;
  if (!moduleId) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Module is required. Please select a valid NUST module." } }, { status: 400 });
  }

  // Validate module exists (Spec 60: server resolves canonical) — with graceful DB fallback
  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch (e: any) {
    console.error("[upload] DB unavailable", e?.message ?? e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Upload temporarily unavailable — database not connected. Please try again." } }, { status: 503 });
  }
  let moduleRow: typeof modules.$inferSelect | undefined;
  try {
    const trimmed = moduleId.trim();
    const mod = await db.select().from(modules).where(eq(modules.code, trimmed.toUpperCase())).limit(1);
    moduleRow = mod[0];
    if (!moduleRow) {
      const byId = await db.select().from(modules).where(eq(modules.id, trimmed)).limit(1);
      moduleRow = byId[0];
    }
    if (!moduleRow) {
      const { sql } = await import("drizzle-orm");
      const byCodeCI = await db.select().from(modules).where(sql`lower(${modules.code}) = lower(${trimmed})`).limit(1);
      moduleRow = byCodeCI[0];
    }
  } catch (e: any) {
    console.error("[upload] module lookup failed", e?.message ?? e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not verify module. Please try again." } }, { status: 500 });
  }
  if (!moduleRow) {
    return NextResponse.json({ error: { code: "MODULE_NOT_FOUND", message: "We couldn't find that module. Please select a valid NUST module." } }, { status: 404 });
  }

  // Collect files — dedupe, handle both generic entries and explicit 'files' key
  const files: File[] = [];
  const seen = new Set<string>();
  for (const [, value] of form.entries()) {
    if (value instanceof File && value.size > 0) {
      const key = `${value.name}-${value.size}`;
      if (!seen.has(key)) {
        seen.add(key);
        files.push(value);
      }
    }
  }
  // Also ensure getAll('files') captured (some browsers send differently)
  try {
    const allFiles = form.getAll("files").filter((v) => v instanceof File) as File[];
    for (const f of allFiles) {
      const key = `${f.name}-${f.size}`;
      if (!seen.has(key) && f.size > 0) {
        seen.add(key);
        files.push(f);
      }
    }
  } catch {}

  if (files.length === 0) {
    return NextResponse.json({ error: { code: "NO_FILES", message: "No files provided." } }, { status: 400 });
  }
  if (files.length > 10) {
    return NextResponse.json({ error: { code: "TOO_MANY_FILES", message: "Too many files. Max 10 per upload." } }, { status: 400 });
  }

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  if (totalSize > 12 * 1024 * 1024) {
    return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Total upload too large. Max 12 MB per request." } }, { status: 413 });
  }

  // Parse per-file metadata JSON if provided
  let metadataArray: Array<{ filename?: string; assessmentType?: string | null; assessmentNumber?: number | null; academicYear?: number | null; semester?: number | null }> = [];
  const metaRaw = form.get("metadata") as string | null;
  if (metaRaw) {
    try {
      metadataArray = JSON.parse(metaRaw);
    } catch {}
  }

  // Check session for uploaderId (optional profile)
  let uploaderId: string | null = null;
  const sessionCookie = req.cookies.get("session")?.value;
  if (sessionCookie) {
    try {
      const { verifySessionToken } = await import("@/lib/auth/session");
      const { getEnv } = await import("@/lib/env");
      const env = getEnv();
      const uid = verifySessionToken(sessionCookie, env.APP_SECRET);
      if (uid) uploaderId = uid;
    } catch {}
  }

  const storage = getStorage();
  let ipHash: string;
  try {
    ipHash = hashIp(ip);
  } catch {
    ipHash = "unknown";
  }
  // Determine faculty slug for R2 key — prefer module's direct department → school → faculty, fallback to programme chain
  let facultySlug = "fci";
  try {
    const { faculties } = await import("@/db/schema/faculties");
    const { schools } = await import("@/db/schema/schools");
    const { departments } = await import("@/db/schema/departments");
    // First: try module.departmentId directly (canonical)
    if (moduleRow.departmentId) {
      const dept = await db.select().from(departments).where(eq(departments.id, moduleRow.departmentId)).limit(1);
      if (dept.length) {
        const sch = await db.select().from(schools).where(eq(schools.id, dept[0].schoolId)).limit(1);
        if (sch.length) {
          const fac = await db.select().from(faculties).where(eq(faculties.id, sch[0].facultyId)).limit(1);
          if (fac.length) facultySlug = fac[0].slug;
        }
      }
    }
    // Fallback: via programmeModules chain if direct failed
    if (facultySlug === "fci" && !moduleRow.departmentId) {
      const { programmeModules } = await import("@/db/schema/programme_modules");
      const { programmes } = await import("@/db/schema/programmes");
      const pm = await db.select().from(programmeModules).where(eq(programmeModules.moduleId, moduleRow.id)).limit(1);
      if (pm.length > 0) {
        const prog = await db.select().from(programmes).where(eq(programmes.id, pm[0].programmeId)).limit(1);
        if (prog.length) {
          const dept = await db.select().from(departments).where(eq(departments.id, prog[0].departmentId)).limit(1);
          if (dept.length) {
            const sch = await db.select().from(schools).where(eq(schools.id, dept[0].schoolId)).limit(1);
            if (sch.length) {
              const fac = await db.select().from(faculties).where(eq(faculties.id, sch[0].facultyId)).limit(1);
              if (fac.length) facultySlug = fac[0].slug;
            }
          }
        }
      }
    }
  } catch {}

  const results: Array<{ filename: string; status: "added" | "duplicate" | "error"; paperId?: string; message?: string; duplicatePaper?: any }> = [];

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const originalName = sanitizeFilename(file.name);
    const meta = metadataArray[idx] || metadataArray.find((m) => m.filename === file.name) || {};

    try {
      // Client pre-validation already but enforce server-side (Spec 15)
      validatePdfFile({ size: file.size, type: file.type, name: originalName });

      const buf = Buffer.from(await file.arrayBuffer());

      validatePdfMagic(buf);

      // SHA-256 Level 1 (Spec 26)
      const hash = sha256(buf);
      const existingFile = await db.select().from(paperFiles).where(eq(paperFiles.sha256, hash)).limit(1);
      if (existingFile.length > 0) {
        // Exact binary duplicate — return existing paper, don't store again (Spec 74)
        const existingPaper = await db.select().from(papers).where(eq(papers.id, existingFile[0].paperId)).limit(1);
        results.push({
          filename: originalName,
          status: "duplicate",
          paperId: existingPaper[0]?.id,
          message: "Exact duplicate — file already exists. Using existing paper.",
          duplicatePaper: existingPaper[0] ? { id: existingPaper[0].id, moduleId: existingPaper[0].moduleId } : undefined,
        });
        continue;
      }

      // Extract metadata for paper identity — use provided or fallback to current year/semester
      const nowYear = new Date().getFullYear();
      const academicYear = meta.academicYear ?? nowYear;
      const semester = meta.semester ?? 1;
      const assessmentType = (meta.assessmentType as any) ?? null; // may be null if skipped (Spec 13 optional)
      const assessmentNumber = meta.assessmentNumber ?? null;

      // If assessmentType is null/undefined (skipped), we need to still create paper? Spec says module is mandatory, other details optional.
      // For skipped, we can default to EXAM? No, better to create paper with minimal identity: use EXAM with null number? But spec says EXAM/SUPP no number, others need number.
      // ForMVP, if type is null, default to EXAM and allow paper creation — or create paper with type EXAM and year/semester only
      // Alternatively, if skipped, we can still create paper with provided year/semester but type null -> we need to handle nullable type? But papers table requires assessmentType not null.
      // So we must default: if not provided, use "EXAM" as generic, or "TEST" with null?
      // For spec compliance, we should require type if not skipped; if skipped we can use "EXAM" as fallback but mark as pending?
      // Simpler: if type is null, use "EXAM" (since it doesn't require number)
      const finalType = assessmentType || "EXAM";
      const finalNumber = finalType === "EXAM" || finalType === "SUPPLEMENTARY" ? null : (assessmentNumber ?? null);

      // Validate year/semester range
      if (academicYear < 2000 || academicYear > 2035) throw new Error("Invalid year");
      if (semester !== 1 && semester !== 2) throw new Error("Invalid semester");

      // Find or create paper identity (Spec 30)
      const { id: paperId } = await findOrCreatePaper({
        moduleId: moduleRow.id,
        academicYear,
        semester,
        assessmentType: finalType as any,
        assessmentNumber: finalNumber,
      });

      // Extract page count via pdf-lib (for metadata, not critical)
      let pageCount: number | null = null;
      try {
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        pageCount = doc.getPageCount();
      } catch {}

      // Text fingerprint Level 3 (Spec 28) — try extract text via pdfjs
      let textFingerprint: string | null = null;
      try {
        // Use pdfjs-serverless to extract text in Workers
        const pdfjs: any = await import("pdfjs-serverless");
        const loadingTask = pdfjs.getDocument({ data: buf, verbosity: 0 });
        const pdf = await loadingTask.promise;
        let rawText = "";
        const maxPages = Math.min(pdf.numPages, 5);
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((it: any) => (it.str ? it.str : "")).join(" ");
          rawText += strings + " ";
        }
        if (rawText.trim().length > 50) {
          textFingerprint = fingerprintFromText(rawText);
          // Check for near-duplicate via text fingerprint (different scan, same content)
          const existingByText = await db.select().from(paperFiles).where(eq(paperFiles.textFingerprint, textFingerprint)).limit(1);
          if (existingByText.length > 0) {
            // Not exact binary but same text content — flag as potential duplicate, but still allow? For MVP, we flag but still store as separate file under same paper?
            // Per Spec 32, show duplicate dialog but allow upload anyway — for API, we can return duplicate status but still create file?
            // For now, treat as duplicate but still create? Let's return duplicate status with existing paper, but still allow caller to decide "upload anyway" via flag
            // If caller didn't set force, we return duplicate
            // Check if existing file's paper is same identity? If same paper identity, it's expected to be same paper (Spec 30: multiple files per paper)
            // So we should not block if it's same paper identity — just create new file under same paper
            // Only flag if different paper identity but same text
            const existingPaperForText = await db.select().from(papers).where(eq(papers.id, existingByText[0].paperId)).limit(1);
            if (existingPaperForText[0] && existingPaperForText[0].id !== paperId) {
              results.push({
                filename: originalName,
                status: "duplicate",
                paperId: existingPaperForText[0].id,
                message: "Possible duplicate — text fingerprint matches existing paper.",
                duplicatePaper: existingPaperForText[0],
              });
              continue;
            }
          }
        }
      } catch (e) {
        // Text extraction failed — likely scanned PDF, will be handled via perceptual hash stub (Level 4) in future
        // For now, no fingerprint
      }

      // Generate R2 key and store
      const fileId = randomUUID();
      const r2Key = buildR2Key({ facultySlug, moduleCode: moduleRow.code, academicYear, paperId, fileId });

      await storage.put(r2Key, buf, "application/pdf");

      // Create paper_files row
      const inserted = await db
        .insert(paperFiles)
        .values({
          paperId,
          r2ObjectKey: r2Key,
          originalFilename: originalName,
          fileSize: buf.length,
          mimeType: "application/pdf",
          sha256: hash,
          pageCount,
          textFingerprint,
          perceptualHash: null, // Level 4 stub
          isCanonical: true, // will be adjusted if multiple files per paper
          uploaderId,
          uploadIpHash: ipHash,
        })
        .returning({ id: paperFiles.id });

      // Update contribution stats for logged-in uploader (Spec 22)
      if (uploaderId) {
        try {
          const { contributionStats } = await import("@/db/schema/contribution_stats");
          const { eq: eq2 } = await import("drizzle-orm");
          const existing = await db.select().from(contributionStats).where(eq2(contributionStats.userId, uploaderId)).limit(1);
          if (existing.length === 0) {
            await db.insert(contributionStats).values({ userId: uploaderId, approvedCount: 1 });
          } else {
            await db.update(contributionStats).set({ approvedCount: (existing[0].approvedCount || 0) + 1, lastContributionAt: new Date() }).where(eq2(contributionStats.userId, uploaderId));
          }
        } catch {}
      }

      // If this paper now has multiple files, ensure only one canonical (prefer newest with text)
      try {
        const allFiles = await db.select().from(paperFiles).where(eq(paperFiles.paperId, paperId));
        if (allFiles.length > 1) {
          // Pick best as canonical via heuristic
          const { pickBestFile } = await import("@/lib/papers/canonical");
          const best = pickBestFile(allFiles.map((f) => ({ id: f.id, textFingerprint: f.textFingerprint, pageCount: f.pageCount, fileSize: f.fileSize, createdAt: f.createdAt })));
          if (best) {
            const { setCanonical } = await import("@/lib/papers/canonical");
            await setCanonical(paperId, best.id);
          }
        }
      } catch {}

      results.push({ filename: originalName, status: "added", paperId, message: "Paper added successfully." });
    } catch (err: any) {
      const msg = err?.message || "Failed to process file.";
      // Map known errors to friendly messages (Spec 62)
      let friendly = msg;
      if (msg.includes("3 MB") || msg.toLowerCase().includes("larger")) friendly = "This PDF is larger than the 3 MB limit.";
      else if (msg.toLowerCase().includes("valid pdf") || msg.toLowerCase().includes("pdf")) friendly = "That file doesn't look like a valid PDF.";
      else if (msg.includes("module")) friendly = msg;
      logger.uploadError({ filename: originalName, error: msg, ipHash: ipHash.slice(0, 8) });
      results.push({ filename: originalName, status: "error", message: friendly });
    }
  }

  const added = results.filter((r) => r.status === "added").length;
  const duplicates = results.filter((r) => r.status === "duplicate").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    results,
    summary: { total: files.length, added, duplicates, errors },
    message: `Thank you for contributing to NustWeShare ❤️ Papers uploaded: ${files.length} Successfully added: ${added} Potential duplicates: ${duplicates}`,
  });
}
