import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paperRequests, paperRequestVotes } from "@/db/schema/paper_requests";
import { getUserFromRequest } from "@/lib/auth/current";
import { getClientIp, isUuid, jsonError } from "@/lib/http";
import { hashIp } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Request not found.", 404);
  const user = await getUserFromRequest(req);
  const voter = (user ? `u:${user.id}` : `ip:${hashIp(getClientIp(req))}`).slice(0, 64);
  const db = getDb();
  const exists = await db.select({ id: paperRequests.id }).from(paperRequests).where(eq(paperRequests.id, id)).limit(1);
  if (!exists.length) return jsonError("NOT_FOUND", "Request not found.", 404);
  const inserted = await db.insert(paperRequestVotes).values({ requestId: id, voterHash: voter }).onConflictDoNothing().returning();
  let votes: number;
  if (inserted.length) {
    const [u] = await db.update(paperRequests).set({ votes: sql`${paperRequests.votes} + 1` }).where(eq(paperRequests.id, id)).returning({ v: paperRequests.votes });
    votes = u.v;
  } else {
    const [u] = await db.select({ v: paperRequests.votes }).from(paperRequests).where(eq(paperRequests.id, id));
    votes = u.v;
  }
  return NextResponse.json({ data: { votes, alreadyVoted: !inserted.length } });
}
