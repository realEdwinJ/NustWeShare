import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { paperFiles } from "@/db/schema/paper_files";
import { paperRequests } from "@/db/schema/paper_requests";
import { getStorage } from "@/lib/r2/client";
import type { AssessmentType } from "./format";

/** Soft-delete a paper and remove its stored files. */
export async function removePaper(paperId: string, reason: string) {
  const db = getDb();
  await db.update(papers).set({ status: "deleted", deletedAt: new Date(), deletionReason: reason.slice(0, 50), updatedAt: new Date() }).where(eq(papers.id, paperId));
  const files = await db.select({ key: paperFiles.r2ObjectKey }).from(paperFiles).where(eq(paperFiles.paperId, paperId));
  const storage = getStorage();
  await Promise.all(files.map((f) => storage.delete(f.key).catch(() => {})));
}

/** Mark open requests that match a newly added paper as fulfilled. */
export async function fulfilRequests(p: { id: string; moduleId: string; academicYear: number; assessmentType: AssessmentType }) {
  const db = getDb();
  const open = await db
    .select()
    .from(paperRequests)
    .where(and(eq(paperRequests.moduleId, p.moduleId), isNull(paperRequests.fulfilledPaperId)));
  const matching = open.filter(
    (r) => (r.academicYear == null || r.academicYear === p.academicYear) && (r.assessmentType == null || r.assessmentType === p.assessmentType)
  );
  for (const r of matching) {
    await db.update(paperRequests).set({ fulfilledPaperId: p.id, fulfilledAt: new Date() }).where(eq(paperRequests.id, r.id));
  }
  return matching.length;
}

/** Whether a paper identity is already used by another active paper. */
export async function identityTaken(p: { id: string; moduleId: string; academicYear: number; semester: number; assessmentType: string; assessmentNumber: number | null }) {
  const db = getDb();
  const rows = await db
    .select({ id: papers.id })
    .from(papers)
    .where(
      and(
        eq(papers.moduleId, p.moduleId),
        eq(papers.academicYear, p.academicYear),
        eq(papers.semester, p.semester),
        eq(papers.assessmentType, p.assessmentType as any),
        p.assessmentNumber == null ? isNull(papers.assessmentNumber) : eq(papers.assessmentNumber, p.assessmentNumber),
        eq(papers.status, "active"),
        ne(papers.id, p.id)
      )
    )
    .limit(1);
  return rows[0]?.id ?? null;
}

/** True if the stored object exists. */
export async function storedFileExists(key: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const bucket = getCloudflareContext()?.env?.PAPERS_BUCKET;
    if (bucket) return !!(await bucket.head(key));
  } catch {}
  const storage = getStorage();
  return (await storage.get(key)) !== null;
}

/**
 * Called when a paper's file can't be found in storage. If none of its files exist, the paper is hidden
 * (status "pending", reason "file_missing") so it stops appearing as downloadable; re-uploading heals it.
 * Returns true if the paper was hidden.
 */
export async function handleMissingFile(paperId: string): Promise<boolean> {
  const db = getDb();
  const files = await db.select({ key: paperFiles.r2ObjectKey }).from(paperFiles).where(eq(paperFiles.paperId, paperId));
  for (const f of files) if (await storedFileExists(f.key)) return false;
  await db
    .update(papers)
    .set({ status: "pending", deletionReason: "file_missing", updatedAt: new Date() })
    .where(and(eq(papers.id, paperId), eq(papers.status, "active")));
  console.warn("[integrity] paper hidden, file missing", { paperId });
  return true;
}

/**
 * The uploader of a paper's main file withdraws it. Other students' backup copies are preserved: the best
 * remaining healthy backup becomes the main file. The paper is removed only if no usable backup exists.
 * Returns "promoted" or "removed".
 */
export async function withdrawMainFile(paperId: string): Promise<"promoted" | "removed"> {
  const db = getDb();
  const files = await db.select().from(paperFiles).where(eq(paperFiles.paperId, paperId));
  const main = files.find((f) => f.isCanonical);
  const candidates: typeof files = [];
  for (const f of files) if (!f.isCanonical && (await storedFileExists(f.r2ObjectKey))) candidates.push(f);
  if (!main || candidates.length === 0) {
    await removePaper(paperId, "uploader");
    return "removed";
  }
  const { pickBestFile, setCanonical } = await import("./canonical");
  const best = pickBestFile(candidates)!;
  await setCanonical(paperId, best.id);
  await db.delete(paperFiles).where(eq(paperFiles.id, main.id));
  await getStorage().delete(main.r2ObjectKey).catch(() => {});
  return "promoted";
}
