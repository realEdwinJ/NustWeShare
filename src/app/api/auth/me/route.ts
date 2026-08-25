import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ data: null }, { status: 200 });
  try {
    const { verifySessionToken } = await import("@/lib/auth/session");
    const { getEnv } = await import("@/lib/env");
    const env = getEnv();
    const userId = verifySessionToken(token, env.APP_SECRET);
    if (!userId) return NextResponse.json({ data: null });

    const db = getDb();
    const rows = await db.select({ id: users.id, username: users.username, displayName: users.displayName, createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1);
    if (rows.length === 0) return NextResponse.json({ data: null });
    return NextResponse.json({ data: rows[0] });
  } catch {
    return NextResponse.json({ data: null });
  }
}
