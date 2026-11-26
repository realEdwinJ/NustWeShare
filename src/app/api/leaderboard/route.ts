import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/papers/queries";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("period");
  const period = p === "week" || p === "month" ? p : "all";
  try {
    const { rows, anonymousPapers } = await getLeaderboard({ period, limit: 50 });
    return NextResponse.json({ data: rows, anonymousPapers, period }, { headers: { "Cache-Control": "public, s-maxage=120" } });
  } catch (e) {
    console.error("[api/leaderboard]", e);
    return jsonError("DB_ERROR", "Could not load leaderboard.", 500);
  }
}
