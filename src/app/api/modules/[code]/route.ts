import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { modules } from "@/db/schema/modules";
import { programmeModules } from "@/db/schema/programme_modules";
import { programmes } from "@/db/schema/programmes";
import { departments } from "@/db/schema/departments";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = decodeURIComponent(code).trim().toUpperCase();
  if (!normalizedCode || normalizedCode.length > 20) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid module code" } }, { status: 400 });
  }
  try {
    const db = getDb();
    const mod = await db.select().from(modules).where(eq(modules.code, normalizedCode)).limit(1);
    if (mod.length === 0) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Module not found" } }, { status: 404 });

    // Find all programmes that use this module (canonical dedup per Spec 7)
    const links = await db
      .select({ programmeCode: programmes.code, programmeName: programmes.name, yearLevel: programmeModules.yearLevel, semester: programmeModules.semester })
      .from(programmeModules)
      .innerJoin(programmes, eq(programmeModules.programmeId, programmes.id))
      .where(eq(programmeModules.moduleId, mod[0].id))
      .orderBy(programmes.code);

    // Department info if available
    let department: { name: string; slug: string } | null = null;
    if (mod[0].departmentId) {
      const dep = await db.select().from(departments).where(eq(departments.id, mod[0].departmentId)).limit(1);
      if (dep.length) department = { name: dep[0].name, slug: dep[0].slug };
    }

    return NextResponse.json(
      { data: { ...mod[0], programmes: links, department } },
      { headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
  } catch (e) {
    console.error("[api/modules/[code]]", (e as any)?.message ?? e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not load module." } }, { status: 500 });
  }
}
