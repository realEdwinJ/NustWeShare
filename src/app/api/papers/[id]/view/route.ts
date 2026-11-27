import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { getClientIp, isUuid, jsonError } from "@/lib/http";
import { rateLimitShared } from "@/lib/security/rateLimit";
import { hashIp } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

// POST /api/papers/[id]/view — count a read; refreshes from the same network within an hour count once (Spec 42).
// De-duplicated server-side so no per-paper cookies accumulate in the browser.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Paper not found.", 404);
  try {
    const first = await rateLimitShared({ key: `view:${hashIp(getClientIp(req)).slice(0, 16)}:${id}`, limit: 1, windowMs: 60 * 60 * 1000 });
    if (!first.allowed) return NextResponse.json({ ok: true, deduped: true });
    await getDb().update(papers).set({ views: sql`${papers.views} + 1` }).where(and(eq(papers.id, id), eq(papers.status, "active")));
    return NextResponse.json({ ok: true, deduped: false });
  } catch (e) {
    console.error("[api/papers/[id]/view]", e);
    return jsonError("DB_ERROR", "Could not track view.", 500);
  }
}
