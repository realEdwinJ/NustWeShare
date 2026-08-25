import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { departments } from "@/db/schema/departments";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const schoolSlug = req.nextUrl.searchParams.get("schoolSlug");
  if (!schoolSlug) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "schoolSlug required" } }, { status: 400 });
  try {
    const db = getDb();
    const sch = await db.select().from(schools).where(eq(schools.slug, schoolSlug)).limit(1);
    if (sch.length === 0) return NextResponse.json({ error: { code: "NOT_FOUND", message: "School not found" } }, { status: 404 });
    const rows = await db.select().from(departments).where(eq(departments.schoolId, sch[0].id)).orderBy(departments.name);
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (e) {
    console.error("[api/departments]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not load departments." } }, { status: 500 });
  }
}
