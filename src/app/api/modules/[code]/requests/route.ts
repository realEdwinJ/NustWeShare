import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { modules } from "@/db/schema/modules";
import { paperRequests, paperRequestVotes } from "@/db/schema/paper_requests";
import { getUserFromRequest } from "@/lib/auth/current";
import { getClientIp, jsonError, readJson } from "@/lib/http";
import { hashIp } from "@/lib/security/sanitize";
import { rateLimitShared } from "@/lib/security/rateLimit";
import { ASSESSMENT_TYPES } from "@/lib/papers/format";

export const dynamic = "force-dynamic";

async function findModule(code: string) {
  const db = getDb();
  const m = await db.select({ id: modules.id }).from(modules).where(eq(modules.code, code.toUpperCase())).limit(1);
  return m[0] ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const mod = await findModule(code);
    if (!mod) return jsonError("NOT_FOUND", "Module not found.", 404);
    const db = getDb();
    const rows = await db
      .select()
      .from(paperRequests)
      .where(and(eq(paperRequests.moduleId, mod.id), isNull(paperRequests.fulfilledPaperId)))
      .orderBy(desc(paperRequests.votes), desc(paperRequests.createdAt))
      .limit(20);
    return NextResponse.json({
      data: rows.map((r) => ({ id: r.id, academicYear: r.academicYear, assessmentType: r.assessmentType, note: r.note, votes: r.votes, createdAt: r.createdAt })),
    });
  } catch (e) {
    console.error("[requests GET]", e);
    return jsonError("DB_ERROR", "Could not load requests.", 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ipHash = hashIp(getClientIp(req));
  const rl = await rateLimitShared({ key: `req:${ipHash.slice(0, 16)}`, limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) return jsonError("RATE_LIMITED", "Too many requests. Try again later.", 429);
  const body = await readJson(req);
  const year = body?.academicYear ? Number(body.academicYear) : null;
  const type = body?.assessmentType ? String(body.assessmentType).toUpperCase() : null;
  const note = body?.note ? String(body.note).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200) : null;
  if (year !== null && (!Number.isInteger(year) || year < 2000 || year > new Date().getFullYear())) return jsonError("VALIDATION_ERROR", "Invalid year.");
  if (type !== null && !(ASSESSMENT_TYPES as readonly string[]).includes(type)) return jsonError("VALIDATION_ERROR", "Invalid type.");
  const mod = await findModule(code);
  if (!mod) return jsonError("NOT_FOUND", "Module not found.", 404);
  const user = await getUserFromRequest(req);
  const voter = user ? `u:${user.id}` : `ip:${ipHash}`;
  const db = getDb();

  // Same request already open → count as an upvote instead of a duplicate
  const open = await db
    .select()
    .from(paperRequests)
    .where(and(eq(paperRequests.moduleId, mod.id), isNull(paperRequests.fulfilledPaperId)));
  const same = open.find((r) => r.academicYear === year && (r.assessmentType ?? null) === type);
  if (same) {
    const inserted = await db.insert(paperRequestVotes).values({ requestId: same.id, voterHash: voter.slice(0, 64) }).onConflictDoNothing().returning();
    if (inserted.length) await db.update(paperRequests).set({ votes: same.votes + 1 }).where(eq(paperRequests.id, same.id));
    return NextResponse.json({ data: { id: same.id, merged: true } });
  }
  if (open.length >= 50) return jsonError("TOO_MANY", "This module already has many open requests.", 429);
  const [r] = await db
    .insert(paperRequests)
    .values({ moduleId: mod.id, academicYear: year, assessmentType: type as any, note, requesterId: user?.id ?? null, requesterIpHash: ipHash })
    .returning({ id: paperRequests.id });
  await db.insert(paperRequestVotes).values({ requestId: r.id, voterHash: voter.slice(0, 64) }).onConflictDoNothing();
  return NextResponse.json({ data: { id: r.id, merged: false } }, { status: 201 });
}
