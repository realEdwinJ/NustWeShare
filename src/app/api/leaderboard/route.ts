import { NextResponse } from "next/server";
import { eq, desc, count, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { paperFiles } from "@/db/schema/paper_files";
import { papers } from "@/db/schema/papers";

export const dynamic = "force-dynamic";

// GET /api/leaderboard?limit=20 — ordered by approved papers desc (Spec 22)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);

  try {
    const db = getDb();

    // Count approved papers per user: paper_files where is_canonical true + paper status active + uploader not null
    // For ghost, we can also count total anonymous
    const leaderboard = await db
      .select({
        userId: paperFiles.uploaderId,
        username: users.username,
        displayName: users.displayName,
        count: count(paperFiles.id),
      })
      .from(paperFiles)
      .innerJoin(papers, eq(paperFiles.paperId, papers.id))
      .innerJoin(users, eq(paperFiles.uploaderId, users.id))
      .where(eq(papers.status, "active"))
      .groupBy(paperFiles.uploaderId, users.username, users.displayName)
      .orderBy(desc(count(paperFiles.id)))
      .limit(limit);

    // Get anonymous count
    const anonRes = await db
      .select({ c: count() })
      .from(paperFiles)
      .innerJoin(papers, eq(paperFiles.paperId, papers.id))
      .where(sql`${paperFiles.uploaderId} IS NULL AND ${papers.status} = 'active' AND ${paperFiles.isCanonical} = true`);
    const anonCount = Number(anonRes[0]?.c ?? 0);

    const ranked = leaderboard.map((r, idx) => ({
      rank: idx + 1,
      userId: r.userId,
      username: r.username,
      displayName: r.displayName,
      approvedCount: Number(r.count),
    }));

    // If anonymous has uploads, include as entry if in top
    if (anonCount > 0) {
      // Insert anonymous in ranked order for display (Spec 22 example: Anonymous — 97 papers)
      ranked.push({ rank: ranked.length + 1, userId: null as any, username: "Anonymous", displayName: "Anonymous", approvedCount: anonCount });
      ranked.sort((a, b) => b.approvedCount - a.approvedCount);
      ranked.forEach((r, idx) => (r.rank = idx + 1));
      // Trim to limit
      if (ranked.length > limit) ranked.length = limit;
    }

    return NextResponse.json({ data: ranked }, { headers: { "Cache-Control": "public, s-maxage=300" } });
  } catch (e) {
    console.error("[api/leaderboard]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not load leaderboard." } }, { status: 500 });
  }
}
