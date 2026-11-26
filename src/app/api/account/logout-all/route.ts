import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { getUserFromRequest } from "@/lib/auth/current";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/account/logout-all — invalidates every session; keeps this device signed in unless ?all=1
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError("UNAUTHORIZED", "You need to be logged in.", 401);
  const db = getDb();
  const updated = await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, user.id))
    .returning({ v: users.sessionVersion });
  const res = NextResponse.json({ data: { ok: true } });
  if (req.nextUrl.searchParams.get("all") === "1") {
    res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  } else {
    const { getEnv } = await import("@/lib/env");
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id, getEnv().APP_SECRET, updated[0].v), sessionCookieOptions());
  }
  return res;
}
