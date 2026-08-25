import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { departments } from "@/db/schema/departments";
import { programmes } from "@/db/schema/programmes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const departmentSlug = req.nextUrl.searchParams.get("departmentSlug");
  const departmentId = req.nextUrl.searchParams.get("departmentId");
  if (!departmentSlug && !departmentId) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "departmentSlug or departmentId required" } }, { status: 400 });
  }
  try {
    const db = getDb();
    let deptId = departmentId;
    if (departmentSlug) {
      const dep = await db.select().from(departments).where(eq(departments.slug, departmentSlug)).limit(1);
      if (dep.length === 0) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Department not found" } }, { status: 404 });
      deptId = dep[0].id;
    }
    const rows = await db.select().from(programmes).where(eq(programmes.departmentId, deptId!)).orderBy(programmes.code);
    // Return with pagination headers
    return NextResponse.json({ data: rows, total: rows.length }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (e) {
    console.error("[api/programmes]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not load programmes." } }, { status: 500 });
  }
}
