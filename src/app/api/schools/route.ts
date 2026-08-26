import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { faculties } from "@/db/schema/faculties";
import { schools } from "@/db/schema/schools";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const facultySlugRaw = req.nextUrl.searchParams.get("facultySlug");
  if (!facultySlugRaw) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "facultySlug required" } }, { status: 400 });
  const facultySlug = facultySlugRaw.trim().toLowerCase();
  try {
    const db = getDb();
    // Find faculty by slug (case-insensitive) to get id, then filter schools
    const fac = await db.select().from(faculties).where(eq(faculties.slug, facultySlug)).limit(1);
    if (fac.length === 0) return NextResponse.json({ data: [], total: 0, message: "Faculty not found — no schools available" }, { status: 200 });
    const rows = await db.select().from(schools).where(eq(schools.facultyId, fac[0].id)).orderBy(schools.name);
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (e) {
    console.error("[api/schools]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not load schools." } }, { status: 500 });
  }
}
