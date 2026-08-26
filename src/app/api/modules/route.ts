import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { programmes } from "@/db/schema/programmes";
import { modules } from "@/db/schema/modules";
import { programmeModules } from "@/db/schema/programme_modules";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const programmeCodeRaw = req.nextUrl.searchParams.get("programmeCode");
  const programmeCode = programmeCodeRaw ? programmeCodeRaw.trim().toUpperCase() : null;
  const departmentSlug = req.nextUrl.searchParams.get("departmentSlug");
  const q = req.nextUrl.searchParams.get("q");
  const limitRaw = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
  const limit = Math.min(Number.isFinite(limitRaw) ? limitRaw : 50, 100);

  try {
    const db = getDb();

    // If programmeCode provided, return modules for that programme via join (canonical dedup handled)
    if (programmeCode) {
      const prog = await db.select().from(programmes).where(eq(programmes.code, programmeCode)).limit(1);
      if (prog.length === 0) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Programme not found" } }, { status: 404 });
      const progId = prog[0].id;
      // Join via programme_modules to get distinct modules
      const rows = await db
        .select({ id: modules.id, code: modules.code, name: modules.name, yearLevel: programmeModules.yearLevel, semester: programmeModules.semester })
        .from(programmeModules)
        .innerJoin(modules, eq(programmeModules.moduleId, modules.id))
        .where(eq(programmeModules.programmeId, progId))
        .orderBy(asc(programmeModules.yearLevel), asc(programmeModules.semester), asc(modules.code))
        .limit(limit);
      return NextResponse.json({ data: rows, programme: prog[0] }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    }

    // Fallback: list modules with optional search q (used for upload selector)
    if (q) {
      const trimmed = q.trim();
      if (trimmed.length < 1) return NextResponse.json({ data: [] });
      if (trimmed.length > 100) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Query too long" } }, { status: 400 });
      const escaped = trimmed.replace(/[%_\\]/g, "\\$&");
      const like = `%${escaped}%`;
      const { sql } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(modules)
        .where(sql`${modules.code} ILIKE ${like} ESCAPE '\' OR ${modules.name} ILIKE ${like} ESCAPE '\'`)
        .orderBy(modules.code)
        .limit(20);
      return NextResponse.json({ data: rows });
    }

    // List all modules paginated (for browse)
    const rows = await db.select().from(modules).orderBy(modules.code).limit(limit);
    return NextResponse.json({ data: rows });
  } catch (e) {
    console.error("[api/modules]", (e as any)?.message ?? e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not load modules." } }, { status: 500 });
  }
}
