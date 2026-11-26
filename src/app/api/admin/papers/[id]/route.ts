import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { reports } from "@/db/schema/reports";
import { getUserFromRequest } from "@/lib/auth/current";
import { removePaper } from "@/lib/papers/moderation";
import { isUuid, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/admin/papers/[id] { action: "dismiss" | "remove" }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Paper not found.", 404);
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") return jsonError("FORBIDDEN", "Moderators only.", 403);
  const body = await readJson(req);
  const db = getDb();
  if (body?.action === "dismiss") {
    await db.delete(reports).where(eq(reports.paperId, id));
    return NextResponse.json({ data: { ok: true } });
  }
  if (body?.action === "remove") {
    const p = await db.select({ status: papers.status }).from(papers).where(eq(papers.id, id)).limit(1);
    if (!p[0]) return jsonError("NOT_FOUND", "Paper not found.", 404);
    if (p[0].status !== "deleted") await removePaper(id, "moderator");
    return NextResponse.json({ data: { ok: true } });
  }
  return jsonError("VALIDATION_ERROR", "Unknown action.");
}
