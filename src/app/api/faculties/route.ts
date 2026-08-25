import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { faculties } from "@/db/schema/faculties";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(faculties).orderBy(faculties.code);
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } });
  } catch (e) {
    console.error("[api/faculties]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not load faculties." } }, { status: 500 });
  }
}
