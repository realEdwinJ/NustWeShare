import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paperFiles } from "@/db/schema/paper_files";
import { contributionStats } from "@/db/schema/contribution_stats";

// The served (canonical) file for a paper; falls back to the oldest file if none is flagged.
export async function getCanonicalFile(paperId: string) {
  const db = getDb();
  const files = await db.select().from(paperFiles).where(eq(paperFiles.paperId, paperId)).orderBy(paperFiles.createdAt);
  if (files.length === 0) return null;
  const canonical = files.find((f) => f.isCanonical) ?? files[0];
  return canonical;
}

/**
 * Make `fileId` the served file for a paper. The previous main file becomes a backup, and contribution
 * credit moves with it (leaderboard/profile credit is derived from the canonical file).
 */
export async function setCanonical(paperId: string, fileId: string) {
  const db = getDb();
  const before = await db
    .select({ id: paperFiles.id, uploaderId: paperFiles.uploaderId })
    .from(paperFiles)
    .where(and(eq(paperFiles.paperId, paperId), eq(paperFiles.isCanonical, true)))
    .limit(1);
  if (before[0]?.id === fileId) return;
  // Demote first: the DB allows only one canonical file per paper
  await db.update(paperFiles).set({ isCanonical: false }).where(eq(paperFiles.paperId, paperId));
  const [after] = await db
    .update(paperFiles)
    .set({ isCanonical: true })
    .where(and(eq(paperFiles.paperId, paperId), eq(paperFiles.id, fileId)))
    .returning({ uploaderId: paperFiles.uploaderId });
  const prevUploader = before[0]?.uploaderId ?? null;
  const nextUploader = after?.uploaderId ?? null;
  if (prevUploader !== nextUploader) {
    if (prevUploader)
      await db
        .update(contributionStats)
        .set({ approvedCount: sql`greatest(${contributionStats.approvedCount} - 1, 0)`, updatedAt: new Date() })
        .where(eq(contributionStats.userId, prevUploader))
        .catch(() => {});
    if (nextUploader)
      await db
        .insert(contributionStats)
        .values({ userId: nextUploader, approvedCount: 1, lastContributionAt: new Date() })
        .onConflictDoUpdate({ target: contributionStats.userId, set: { approvedCount: sql`${contributionStats.approvedCount} + 1`, updatedAt: new Date() } })
        .catch(() => {});
  }
}

// Choose best file as canonical per heuristic
export function pickBestFile(files: Array<{ id: string; textFingerprint: string | null; pageCount: number | null; fileSize: number; createdAt: Date }>) {
  if (files.length === 0) return null;
  // Score: +10 if has textFingerprint, + pageCount, - fileSize penalty if too large, prefer newer
  const scored = files.map((f) => {
    let score = 0;
    if (f.textFingerprint) score += 10;
    if (f.pageCount) score += Math.min(f.pageCount, 10);
    // Prefer reasonable size 200KB-2MB, penalize very small or very large
    if (f.fileSize > 200_000 && f.fileSize < 2_000_000) score += 5;
    return { f, score };
  });
  scored.sort((a, b) => b.score - a.score || b.f.createdAt.getTime() - a.f.createdAt.getTime());
  return scored[0].f;
}
