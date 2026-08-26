import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { modules } from "@/db/schema/modules";
import { programmes } from "@/db/schema/programmes";
import { rateLimit, limits } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limit search per IP (Spec 52)
  const rl = rateLimit({ key: `search:${ip}`, limit: limits.search.limit, windowMs: limits.search.windowMs });
  if (!rl.allowed) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many searches. Try again soon." } }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });
  }

  if (!q || q.length < 1) {
    return NextResponse.json({ data: { modules: [], programmes: [] } });
  }
  if (q.length > 100) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Query too long" } }, { status: 400 });
  }

  // Sanitize ILIKE pattern: escape % _ \ to prevent wildcard injection
  const escaped = q.replace(/[%_\\]/g, "\\$&");
  const like = `%${escaped}%`;

  try {
    const db = getDb();
    // Modules search with ranking (Spec 37: partial matches ELC, Electronic, 511S)
    const modRows = await db
      .select()
      .from(modules)
      .where(sql`${modules.code} ILIKE ${like} ESCAPE '\' OR ${modules.name} ILIKE ${like} ESCAPE '\'`)
      .orderBy(modules.code)
      .limit(20);

    // Programmes search
    const progRows = await db
      .select()
      .from(programmes)
      .where(sql`${programmes.code} ILIKE ${like} ESCAPE '\' OR ${programmes.name} ILIKE ${like} ESCAPE '\'`)
      .orderBy(programmes.code)
      .limit(10);

    return NextResponse.json(
      { data: { modules: modRows, programmes: progRows }, query: q },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  } catch (e: any) {
    console.error("[api/search]", e?.message ?? e);
    // Never leak internal DB details to client (Spec 62)
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Search unavailable. Please try again." } }, { status: 500 });
  }
}
