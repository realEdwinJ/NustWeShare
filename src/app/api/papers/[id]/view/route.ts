import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";

export const dynamic = "force-dynamic";

// POST /api/papers/[id]/view — increment views with dedup via cookie (Spec 42)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieName = `viewed_${id}`;
  const alreadyViewed = req.cookies.get(cookieName)?.value === "1";
  if (alreadyViewed) {
    return NextResponse.json({ ok: true, deduped: true });
  }
  try {
    const db = getDb();
    await db.update(papers).set({ views: sql`${papers.views} + 1` }).where(eq(papers.id, id));
    const res = NextResponse.json({ ok: true, deduped: false });
    // Set cookie 1 hour to dedup refreshes (Spec 42)
    res.cookies.set(cookieName, "1", { httpOnly: true, sameSite: "lax", maxAge: 3600, path: "/" });
    return res;
  } catch (e) {
    console.error("[api/papers/[id]/view]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not track view." } }, { status: 500 });
  }
}
