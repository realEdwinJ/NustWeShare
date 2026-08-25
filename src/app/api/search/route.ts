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

  try {
    const db = getDb();
    const like = `%${q}%`;
    const prefixLike = `${q}%`;
    // Modules search with ranking (Spec 37: partial matches ELC, Electronic, 511S)
    // Use ILIKE and order by relevance: exact code > prefix > contains > name
    const modRows = await db
      .select()
      .from(modules)
      .where(sql`${modules.code} ILIKE ${like} OR ${modules.name} ILIKE ${like}`)
      .orderBy(
        sql`CASE WHEN lower(${modules.code}) = lower(${q}) THEN 0 WHEN ${modules.code} ILIKE ${prefixLike} THEN 1 WHEN ${modules.code} ILIKE ${like} THEN 2 WHEN ${modules.name} ILIKE ${prefixLike} THEN 3 ELSE 4 END`,
        modules.code
      )
      .limit(20);

    // Programmes search
    const progRows = await db
      .select()
      .from(programmes)
      .where(sql`${programmes.code} ILIKE ${like} OR ${programmes.name} ILIKE ${like}`)
      .orderBy(programmes.code)
      .limit(10);

    return NextResponse.json(
      { data: { modules: modRows, programmes: progRows }, query: q },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  } catch (e) {
    console.error("[api/search]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Search unavailable." } }, { status: 500 });
  }
}
