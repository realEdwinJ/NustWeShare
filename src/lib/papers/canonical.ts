import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paperFiles } from "@/db/schema/paper_files";

// Select canonical file per Spec 31: prefer readable, complete, text layer, good size, correctly oriented
// For MVP, heuristic: textFingerprint not null > higher pageCount > smaller fileSize (reasonable) > newest
export async function getCanonicalFile(paperId: string) {
  const db = getDb();
  const files = await db.select().from(paperFiles).where(eq(paperFiles.paperId, paperId)).orderBy(paperFiles.createdAt);
  if (files.length === 0) return null;
  const canonical = files.find((f) => f.isCanonical) ?? files[0];
  return canonical;
}

export async function setCanonical(paperId: string, fileId: string) {
  const db = getDb();
  // Clear existing canonicals for this paper
  await db.update(paperFiles).set({ isCanonical: false }).where(eq(paperFiles.paperId, paperId));
  await db.update(paperFiles).set({ isCanonical: true }).where(and(eq(paperFiles.paperId, paperId), eq(paperFiles.id, fileId)));
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
