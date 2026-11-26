import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookmarks } from "@/db/schema/bookmarks";
import { modules } from "@/db/schema/modules";
import { papers } from "@/db/schema/papers";
import { getUserFromRequest } from "@/lib/auth/current";
import { isUuid, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ data: { papers: [], modules: [] } }, { headers: { "Cache-Control": "no-store" } });
  const db = getDb();
  const rows = await db.select().from(bookmarks).where(eq(bookmarks.userId, user.id)).orderBy(desc(bookmarks.createdAt));
  return NextResponse.json(
    { data: { papers: rows.filter((r) => r.paperId).map((r) => r.paperId), modules: rows.filter((r) => r.moduleId).map((r) => r.moduleId) } },
    { headers: { "Cache-Control": "no-store" } }
  );
}

async function resolveTarget(body: any) {
  const db = getDb();
  if (isUuid(body?.paperId)) {
    const p = await db.select({ id: papers.id }).from(papers).where(eq(papers.id, body.paperId)).limit(1);
    return p[0] ? { paperId: p[0].id } : null;
  }
  if (typeof body?.moduleCode === "string") {
    const m = await db.select({ id: modules.id }).from(modules).where(eq(modules.code, body.moduleCode.toUpperCase())).limit(1);
    return m[0] ? { moduleId: m[0].id } : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError("UNAUTHORIZED", "Log in to save papers and follow modules.", 401);
  const target = await resolveTarget(await readJson(req));
  if (!target) return jsonError("NOT_FOUND", "Nothing to save.", 404);
  const db = getDb();
  try {
    await db.insert(bookmarks).values({ userId: user.id, ...target }).onConflictDoNothing();
  } catch (e) {
    console.error("[bookmarks POST]", e);
    return jsonError("DB_ERROR", "Could not save.", 500);
  }
  return NextResponse.json({ data: { saved: true } });
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError("UNAUTHORIZED", "You need to be logged in.", 401);
  const target = await resolveTarget(await readJson(req));
  if (!target) return jsonError("NOT_FOUND", "Nothing to remove.", 404);
  const db = getDb();
  const cond = "paperId" in target ? eq(bookmarks.paperId, target.paperId!) : eq(bookmarks.moduleId, target.moduleId!);
  await db.delete(bookmarks).where(and(eq(bookmarks.userId, user.id), cond));
  return NextResponse.json({ data: { saved: false } });
}
