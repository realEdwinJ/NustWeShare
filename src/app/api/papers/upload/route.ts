import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { modules } from "@/db/schema/modules";
import { papers } from "@/db/schema/papers";
import { paperFiles } from "@/db/schema/paper_files";
import { randomUUID } from "crypto";
import { validatePdfFile, validatePdfMagic } from "@/lib/validation/pdf";
import { AppError } from "@/lib/errors";
import { sha256 } from "@/lib/duplicates/sha256";
import { fingerprintFromText } from "@/lib/duplicates/textFingerprint";
import { extractPdfText } from "@/lib/pdf/extractText";
import { findOrCreatePaper } from "@/lib/papers/resolve";
import { getStorage } from "@/lib/r2/client";
import { buildR2Key } from "@/lib/r2/keys";
import { sanitizeFilename, hashIp } from "@/lib/security/sanitize";
import { rateLimitShared, limits } from "@/lib/security/rateLimit";
import { logger } from "@/lib/logger";
import { getUserFromRequest } from "@/lib/auth/current";
import { getModuleByCode } from "@/lib/papers/queries";
import { fulfilRequests, storedFileExists } from "@/lib/papers/moderation";
import { getClientIp } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/papers/upload — ghost-first, module required, multi-file, per-file metadata optional
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimitShared({ key: `upload:${hashIp(ip).slice(0, 16)}`, limit: limits.upload.limit, windowMs: limits.upload.windowMs });
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

  // Optional profile: signed-in uploads count towards your profile; "anonymous" hides your name publicly
  const currentUser = await getUserFromRequest(req);
  const uploaderId: string | null = currentUser?.id ?? null;
  const anonField = form.get("anonymous");
  const hideUploader = currentUser ? (anonField != null ? String(anonField) === "1" || String(anonField) === "true" : currentUser.uploadAnonymously) : false;

  const storage = getStorage();
  const ipHash = hashIp(ip);
  // Faculty slug for the R2 key — via module → department → school → faculty
  let facultySlug = "general";
  try {
    const info = await getModuleByCode(moduleRow.code);
    if (info?.facultySlug) facultySlug = info.facultySlug;
  } catch {}

  const results: Array<{ filename: string; status: "added" | "duplicate" | "alternate" | "error"; paperId?: string; message?: string; duplicatePaper?: any }> = [];

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
        // Same bytes as a record whose paper is hidden/removed or whose object vanished → replace the stale record
        const prevPaper = await db.select({ status: papers.status, reason: papers.deletionReason }).from(papers).where(eq(papers.id, existingFile[0].paperId)).limit(1);
        if (prevPaper[0]?.status === "deleted" && prevPaper[0].reason !== "uploader") {
          throw new AppError("This exact file was removed by moderators or after community reports, so it can't be re-uploaded.", "REMOVED_CONTENT", 409);
        }
        const stale = prevPaper[0]?.status !== "active" || !(await storedFileExists(existingFile[0].r2ObjectKey));
        if (stale) {
          await db.delete(paperFiles).where(eq(paperFiles.id, existingFile[0].id));
          existingFile.length = 0;
        }
      }
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
      // Never invent the year or semester — a wrong guess silently files the paper in the wrong place
      if (meta.academicYear == null) throw new AppError("Choose the year for this paper.", "YEAR_REQUIRED", 400);
      if (meta.semester == null) throw new AppError("Choose the semester for this paper.", "SEMESTER_REQUIRED", 400);
      const academicYear = Number(meta.academicYear);
      const semester = Number(meta.semester);
      const assessmentType = (meta.assessmentType as any) ?? null; // may be null if skipped (Spec 13 optional)
      const assessmentNumber = meta.assessmentNumber ?? null;

      // Type is required by the schema; a skipped type defaults to EXAM (which needs no number)
      const finalType = assessmentType || "EXAM";
      const finalNumber = finalType === "EXAM" || finalType === "SUPPLEMENTARY" ? null : (assessmentNumber ?? null);

      // Validate year/semester range
      if (!Number.isInteger(academicYear) || academicYear < 2000 || academicYear > nowYear) throw new AppError("That year doesn\u2019t look right.", "INVALID_YEAR", 400);
      if (semester !== 1 && semester !== 2) throw new AppError("Semester must be 1 or 2.", "INVALID_SEMESTER", 400);

      // Find or create paper identity (Spec 30)
      const { id: paperId, created: paperCreated } = await findOrCreatePaper({
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
      const extracted = await extractPdfText(buf);
      if (extracted.error) logger.warn("text_extraction_failed", { filename: originalName, error: extracted.error.slice(0, 200) });
      if (extracted.text.trim().length > 50) {
        textFingerprint = fingerprintFromText(extracted.text);
        // Same text as a paper with a different identity → likely a mislabelled duplicate. Same identity is fine (another scan).
        const existingByText = await db
          .select({ paperId: paperFiles.paperId })
          .from(paperFiles)
          .innerJoin(papers, eq(paperFiles.paperId, papers.id))
          .where(and(eq(paperFiles.textFingerprint, textFingerprint), eq(papers.status, "active")))
          .limit(1);
        if (existingByText.length > 0 && existingByText[0].paperId !== paperId) {
          if (paperCreated) await db.delete(papers).where(eq(papers.id, paperId)).catch(() => {});
          results.push({
            filename: originalName,
            status: "duplicate",
            paperId: existingByText[0].paperId,
            message: "This looks like a paper we already have (same text), filed under different details. Check the year, semester and type.",
          });
          continue;
        }
      }

      // An existing paper with a working file keeps it (and its uploader's credit). A new copy is stored
      // only as a non-canonical backup; it becomes the served file only if the paper has no working file.
      let becomesCanonical = paperCreated;
      if (!paperCreated) {
        const current = await db
          .select({ key: paperFiles.r2ObjectKey })
          .from(paperFiles)
          .where(and(eq(paperFiles.paperId, paperId), eq(paperFiles.isCanonical, true)));
        let healthy = false;
        for (const c of current) if (await storedFileExists(c.key)) { healthy = true; break; }
        becomesCanonical = !healthy;
      }

      // Generate R2 key and store
      const fileId = randomUUID();
      const r2Key = buildR2Key({ facultySlug, moduleCode: moduleRow.code, academicYear, paperId, fileId });

      await storage.put(r2Key, buf, "application/pdf");

      // Create paper_files row. The DB allows one canonical file per paper; if a concurrent upload claimed it
      // first, this copy is stored as a backup instead.
      const fileValues = {
        paperId,
        r2ObjectKey: r2Key,
        originalFilename: originalName,
        fileSize: buf.length,
        mimeType: "application/pdf",
        sha256: hash,
        pageCount,
        textFingerprint,
        perceptualHash: null, // Level 4 stub
        uploaderId,
        hideUploader,
        uploadIpHash: ipHash,
      };
      try {
        if (becomesCanonical) {
          // Demote the old (broken) canonical file first so the new one can take the slot
          await db.update(paperFiles).set({ isCanonical: false }).where(eq(paperFiles.paperId, paperId));
          try {
            await db.insert(paperFiles).values({ ...fileValues, isCanonical: true });
          } catch (e: any) {
            const m = String(e?.message || "") + String(e?.cause?.message || "");
            if (!m.includes("uq_pf_one_canonical")) throw e;
            becomesCanonical = false;
            await db.insert(paperFiles).values({ ...fileValues, isCanonical: false });
          }
        } else {
          await db.insert(paperFiles).values({ ...fileValues, isCanonical: false });
        }
      } catch (e) {
        // Don't leave an unreferenced object in storage if the DB write failed
        await storage.delete(r2Key).catch(() => {});
        throw e;
      }

      if (!becomesCanonical) {
        results.push({
          filename: originalName,
          status: "alternate",
          paperId,
          message: "We already have this paper, so your copy was kept as a backup. It won't replace the existing file.",
        });
        continue;
      }

      // Update contribution stats for logged-in uploader (Spec 22)
      if (uploaderId) {
        try {
          const { contributionStats } = await import("@/db/schema/contribution_stats");
          const existing = await db.select().from(contributionStats).where(eq(contributionStats.userId, uploaderId)).limit(1);
          if (existing.length === 0) {
            await db.insert(contributionStats).values({ userId: uploaderId, approvedCount: 1 });
          } else {
            await db.update(contributionStats).set({ approvedCount: (existing[0].approvedCount || 0) + 1, lastContributionAt: new Date() }).where(eq(contributionStats.userId, uploaderId));
          }
        } catch {}
      }

      try {
        await fulfilRequests({ id: paperId, moduleId: moduleRow.id, academicYear, assessmentType: finalType as any });
      } catch {}
      results.push({ filename: originalName, status: "added", paperId, message: "Paper added successfully." });
    } catch (err: any) {
      const msg = err?.message || "Failed to process file.";
      if (err instanceof AppError) {
        logger.uploadError({ filename: originalName, error: msg, ipHash: ipHash.slice(0, 8) });
        results.push({ filename: originalName, status: "error", message: msg });
        continue;
      }
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
  const backups = results.filter((r) => r.status === "alternate").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    results,
    summary: { total: files.length, added, backups, duplicates, errors },
    message: `Thank you for contributing to NustWeShare ❤️ Papers uploaded: ${files.length} · Added: ${added} · Kept as backup: ${backups} · Duplicates: ${duplicates}`,
  });
}
