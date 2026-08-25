import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { modules } from "@/db/schema/modules";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const moduleId = req.nextUrl.searchParams.get("moduleId");
  const moduleCode = req.nextUrl.searchParams.get("moduleCode");
  const year = req.nextUrl.searchParams.get("year");
  const type = req.nextUrl.searchParams.get("type");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10), 100);
  const page = Math.max(parseInt(req.nextUrl.searchParams.get("page") || "1", 10), 1);
  const offset = (page - 1) * limit;

  try {
    const db = getDb();
    let moduleFilterId = moduleId;
    if (moduleCode && !moduleId) {
      const mod = await db.select().from(modules).where(eq(modules.code, moduleCode.toUpperCase())).limit(1);
      if (mod.length === 0) return NextResponse.json({ data: [], total: 0 });
      moduleFilterId = mod[0].id;
    }

    const conditions: any[] = [eq(papers.status, "active")];
    if (moduleFilterId) conditions.push(eq(papers.moduleId, moduleFilterId));
    if (year) conditions.push(eq(papers.academicYear, parseInt(year, 10)));
    if (type) conditions.push(eq(papers.assessmentType, type as any));

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const rows = await db
      .select({
        id: papers.id,
        moduleId: papers.moduleId,
        academicYear: papers.academicYear,
        semester: papers.semester,
        assessmentType: papers.assessmentType,
        assessmentNumber: papers.assessmentNumber,
        views: papers.views,
        downloads: papers.downloads,
        createdAt: papers.createdAt,
        moduleCode: modules.code,
        moduleName: modules.name,
      })
      .from(papers)
      .innerJoin(modules, eq(papers.moduleId, modules.id))
      .where(where)
      .orderBy(desc(papers.academicYear), desc(papers.createdAt))
      .limit(limit)
      .offset(offset);

    const totalRes = await db.select({ c: sql<number>`count(*)` }).from(papers).where(where);
    const total = Number(totalRes[0]?.c ?? 0);

    return NextResponse.json({ data: rows, total, page, limit }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch (e) {
    console.error("[api/papers]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not load papers." } }, { status: 500 });
  }
}
