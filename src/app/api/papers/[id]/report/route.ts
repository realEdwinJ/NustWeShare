import { NextRequest, NextResponse } from "next/server";
import { eq, count } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { reports } from "@/db/schema/reports";
import { hashIp } from "@/lib/security/sanitize";
import { rateLimitShared, limits } from "@/lib/security/rateLimit";
import { logger } from "@/lib/logger";
import { removePaper } from "@/lib/papers/moderation";
import { getUserFromRequest } from "@/lib/auth/current";
import { getClientIp } from "@/lib/http";

export const dynamic = "force-dynamic";

const VALID_REASONS = new Set(["duplicate", "wrong_module", "wrong_year", "wrong_assessment_type", "corrupted", "not_paper", "other"]);

// POST /api/papers/[id]/report — anonymous, one report per reporter per paper, auto 5-delete (Spec 33-34)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  const rl = await rateLimitShared({ key: `report:${ipHash.slice(0, 16)}`, limit: limits.report.limit, windowMs: limits.report.windowMs });
  if (!rl.allowed) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many reports. Try again soon." } }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid request." } }, { status: 400 });
  }

  const reason = String(body.reason || "").toLowerCase();
  const details = typeof body.details === "string" ? body.details.slice(0, 500) : null;

  if (!VALID_REASONS.has(reason)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid report reason." } }, { status: 400 });
  }

  const reporterId: string | null = (await getUserFromRequest(req))?.id ?? null;

  try {
    const db = getDb();

    // Check paper exists and active
    const pap = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
    if (pap.length === 0) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Paper not found." } }, { status: 404 });
    if (pap[0].status === "deleted") return NextResponse.json({ error: { code: "PAPER_DELETED", message: "This paper is no longer available." } }, { status: 410 });

    // Check duplicate report from same reporter (Spec 34) — use DB-level filter, not in-memory
    const { and } = await import("drizzle-orm");
    if (reporterId) {
      const existing = await db.select().from(reports).where(and(eq(reports.paperId, id), eq(reports.reporterId, reporterId))).limit(1);
      if (existing.length > 0) {
        return NextResponse.json({ error: { code: "ALREADY_REPORTED", message: "You've already reported this paper." } }, { status: 409 });
      }
    } else {
      const existing = await db.select().from(reports).where(and(eq(reports.paperId, id), eq(reports.reporterIpHash, ipHash))).limit(1);
      if (existing.length > 0) {
        return NextResponse.json({ error: { code: "ALREADY_REPORTED", message: "You've already reported this paper." } }, { status: 409 });
      }
    }

    // Insert report — DB unique indexes will also enforce (Spec 34)
    try {
      await db.insert(reports).values({ paperId: id, reason: reason as any, details, reporterId, reporterIpHash: ipHash });
    } catch (e: any) {
      const msg = String(e.message || "") + String((e as any)?.cause?.message || "");
      if (msg.includes("uq_reports") || msg.includes("unique") || msg.includes("duplicate key")) {
        return NextResponse.json({ error: { code: "ALREADY_REPORTED", message: "You've already reported this paper." } }, { status: 409 });
      }
      throw e;
    }

    logger.reportActivity({ paperId: id, reason, reporterId: reporterId ? reporterId.slice(0, 8) : "ghost" });

    // Count reports for this paper
    const cntRes = await db.select({ c: count() }).from(reports).where(eq(reports.paperId, id));
    const reportCount = Number(cntRes[0]?.c ?? 0);

    // Auto 5-report soft delete (Spec 34-35)
    if (reportCount >= 5) {
      // Check if already deleted
      const fresh = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
      if (fresh[0]?.status !== "deleted") {
        await removePaper(id, "5_reports");
        logger.info("paper_auto_deleted_5_reports", { paperId: id, reportCount });
        return NextResponse.json({ ok: true, deleted: true, reportCount, message: "Paper removed after 5 reports. Thank you for keeping the community clean." });
      }
    }

    return NextResponse.json({ ok: true, deleted: false, reportCount, message: "Report received. Thank you." });
  } catch (e) {
    console.error("[api/papers/[id]/report]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not submit report." } }, { status: 500 });
  }
}
