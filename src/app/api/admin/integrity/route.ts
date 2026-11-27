import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { paperFiles } from "@/db/schema/paper_files";
import { systemState } from "@/db/schema/system_state";
import { getUserFromRequest } from "@/lib/auth/current";
import { handleMissingFile, storedFileExists } from "@/lib/papers/moderation";
import { jsonError } from "@/lib/http";
import { getStorage } from "@/lib/r2/client";
import { extractPdfText } from "@/lib/pdf/extractText";
import { fingerprintFromText } from "@/lib/duplicates/textFingerprint";

export const dynamic = "force-dynamic";

// POST /api/admin/integrity — checks every active paper's stored file; hides papers whose file is gone.
// Processes up to `limit` papers per call (default 300) so it stays within Worker time limits; pass `after` to continue.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") return jsonError("FORBIDDEN", "Moderators only.", 403);
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 300, 1000);
  const db = getDb();
  const rows = await db
    .select({ paperId: papers.id, fileId: paperFiles.id, key: paperFiles.r2ObjectKey, fp: paperFiles.textFingerprint })
    .from(papers)
    .innerJoin(paperFiles, and(eq(paperFiles.paperId, papers.id), eq(paperFiles.isCanonical, true)))
    .where(eq(papers.status, "active"))
    .orderBy(papers.id)
    .limit(limit);
  const hidden: string[] = [];
  let checked = 0;
  let fingerprinted = 0;
  const storage = getStorage();
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const results = await Promise.all(batch.map(async (r) => ({ r, ok: await storedFileExists(r.key) })));
    for (const { r, ok } of results) {
      checked++;
      if (!ok && (await handleMissingFile(r.paperId))) hidden.push(r.paperId);

    }
  }
  // Backfill text fingerprints (near-duplicate detection) for every file lacking one — served files and
  // backups alike — capped per run to stay within Worker limits
  const missingFp = await db
    .select({ id: paperFiles.id, key: paperFiles.r2ObjectKey })
    .from(paperFiles)
    .innerJoin(papers, eq(paperFiles.paperId, papers.id))
    .where(and(isNull(paperFiles.textFingerprint), eq(papers.status, "active")))
    .limit(40);
  let unreadable = 0;
  let deadBackups = 0;
  for (const f of missingFp) {
    const bytes = await storage.get(f.key);
    if (!bytes) {
      // A backup whose stored file is gone can never be promoted — drop the dead record
      const removed = await db
        .delete(paperFiles)
        .where(and(eq(paperFiles.id, f.id), eq(paperFiles.isCanonical, false)))
        .returning({ id: paperFiles.id });
      deadBackups += removed.length;
      continue;
    }
    const { text } = await extractPdfText(bytes);
    if (text.trim().length > 50) {
      await db.update(paperFiles).set({ textFingerprint: fingerprintFromText(text) }).where(eq(paperFiles.id, f.id));
      fingerprinted++;
    } else unreadable++; // scanned image without a text layer
  }

  const result = { checked, unreadable, deadBackups, fingerprinted, hidden: hidden.length, hiddenIds: hidden, checkedAt: new Date().toISOString(), by: user.username };
  await db
    .insert(systemState)
    .values({ key: "integrity_scan", value: result })
    .onConflictDoUpdate({ target: systemState.key, set: { value: result, updatedAt: new Date() } })
    .catch(() => {});
  return NextResponse.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
}
