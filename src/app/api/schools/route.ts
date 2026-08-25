import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { faculties } from "@/db/schema/faculties";
import { schools } from "@/db/schema/schools";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const facultySlug = req.nextUrl.searchParams.get("facultySlug");
  if (!facultySlug) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "facultySlug required" } }, { status: 400 });
  try {
    const db = getDb();
    // Find faculty by slug to get id, then filter schools
    const fac = await db.select().from(faculties).where(eq(faculties.slug, facultySlug)).limit(1);
    if (fac.length === 0) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Faculty not found" } }, { status: 404 });
    const rows = await db.select().from(schools).where(eq(schools.facultyId, fac[0].id)).orderBy(schools.name);
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (e) {
    console.error("[api/schools]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not load schools." } }, { status: 500 });
  }
}
