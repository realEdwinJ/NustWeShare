import { NextRequest, NextResponse } from "next/server";
import { rateLimit, limits } from "@/lib/security/rateLimit";
import { hashIp } from "@/lib/security/sanitize";
import { getClientIp, jsonError } from "@/lib/http";
import { searchCatalog } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const rl = rateLimit({ key: `search:${hashIp(getClientIp(req)).slice(0, 16)}`, limit: limits.search.limit * 2, windowMs: limits.search.windowMs });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many searches. Try again soon." } },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }
  if (!q) return NextResponse.json({ data: { modules: [], programmes: [] } });
  if (q.length > 100) return jsonError("VALIDATION_ERROR", "Query too long");
  try {
    const data = await searchCatalog(q, { moduleLimit: Number(req.nextUrl.searchParams.get("limit")) || 20 });
    return NextResponse.json({ data, query: q }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch (e: any) {
    console.error("[api/search]", e?.message ?? e);
    return jsonError("DB_ERROR", "Search unavailable. Please try again.", 500);
  }
}
