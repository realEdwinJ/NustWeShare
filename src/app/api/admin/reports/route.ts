import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reports } from "@/db/schema/reports";
import { papers } from "@/db/schema/papers";
import { modules } from "@/db/schema/modules";
import { getUserFromRequest } from "@/lib/auth/current";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") return jsonError("FORBIDDEN", "Moderators only.", 403);
  const db = getDb();
  const rows = await db
    .select({
      paperId: papers.id,
      status: papers.status,
      moduleCode: modules.code,
      academicYear: papers.academicYear,
      semester: papers.semester,
      assessmentType: papers.assessmentType,
      assessmentNumber: papers.assessmentNumber,
      reportCount: sql<number>`count(${reports.id})`.mapWith(Number),
      reasons: sql<string[]>`array_agg(distinct ${reports.reason}::text)`,
      lastReportAt: sql<Date>`max(${reports.createdAt})`,
    })
    .from(reports)
    .innerJoin(papers, eq(reports.paperId, papers.id))
    .innerJoin(modules, eq(papers.moduleId, modules.id))
    .groupBy(papers.id, modules.code)
    .orderBy(desc(sql`max(${reports.createdAt})`))
    .limit(200);
  return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "no-store" } });
}
