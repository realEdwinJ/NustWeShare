import { NextRequest, NextResponse } from "next/server";
import { listPapersByIds } from "@/lib/papers/queries";
import { isUuid } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/papers/batch?ids=a,b,c — public card data for guest libraries (max 100)
export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") || "").split(",").filter(isUuid).slice(0, 100);
  try {
    const list = await listPapersByIds(ids);
    return NextResponse.json({ data: list });
  } catch (e) {
    console.error("[api/papers/batch]", e);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
