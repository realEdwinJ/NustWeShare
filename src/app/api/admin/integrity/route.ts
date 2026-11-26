import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { paperFiles } from "@/db/schema/paper_files";
import { getUserFromRequest } from "@/lib/auth/current";
import { handleMissingFile, storedFileExists } from "@/lib/papers/moderation";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/admin/integrity — checks every active paper's stored file; hides papers whose file is gone.
// Processes up to `limit` papers per call (default 300) so it stays within Worker time limits; pass `after` to continue.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") return jsonError("FORBIDDEN", "Moderators only.", 403);
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 300, 1000);
  const db = getDb();
  const rows = await db
    .select({ paperId: papers.id, key: paperFiles.r2ObjectKey })
    .from(papers)
    .innerJoin(paperFiles, and(eq(paperFiles.paperId, papers.id), eq(paperFiles.isCanonical, true)))
    .where(eq(papers.status, "active"))
    .orderBy(papers.id)
    .limit(limit);
  const hidden: string[] = [];
  let checked = 0;
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const results = await Promise.all(batch.map(async (r) => ({ r, ok: await storedFileExists(r.key) })));
    for (const { r, ok } of results) {
      checked++;
      if (!ok && (await handleMissingFile(r.paperId))) hidden.push(r.paperId);
    }
  }
  return NextResponse.json({ data: { checked, hidden: hidden.length, hiddenIds: hidden } }, { headers: { "Cache-Control": "no-store" } });
}
