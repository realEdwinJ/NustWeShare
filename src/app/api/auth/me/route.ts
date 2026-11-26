import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/current";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ data: null }, { headers: { "Cache-Control": "no-store" } });
  const { id, username, displayName, role, avatarColor, avatarEmoji, preferences, createdAt } = user;
  return NextResponse.json(
    { data: { id, username, displayName, role, avatarColor, avatarEmoji, preferences, createdAt } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
