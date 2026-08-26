import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { faculties } from "@/db/schema/faculties";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(faculties).orderBy(faculties.code);
    // Gracefully handle empty DB (e.g., fresh deploy without seed) — return empty, not error
    if (rows.length === 0) {
      return NextResponse.json({ data: [], total: 0, message: "No faculties yet — run db:seed" }, { headers: { "Cache-Control": "public, s-maxage=60" } });
    }
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } });
  } catch (e) {
    console.error("[api/faculties]", (e as any)?.message ?? e);
    // Return 200 with empty to avoid cascading frontend crashes when DB temporarily unavailable
    return NextResponse.json({ data: [], total: 0, message: "Faculties temporarily unavailable" }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
