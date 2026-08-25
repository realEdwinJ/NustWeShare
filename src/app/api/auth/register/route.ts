import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { contributionStats } from "@/db/schema/contribution_stats";
import { hashPin, normalizeUsername } from "@/lib/auth/hash";
import { createSessionToken } from "@/lib/auth/session";
import { rateLimit, limits } from "@/lib/security/rateLimit";
import { hashIp } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit({ key: `register:${hashIp(ip).slice(0, 16)}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many registrations. Try later." } }, { status: 429 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid request." } }, { status: 400 });
  }

  const username = String(body.username || "").trim();
  const displayName = String(body.displayName || body.display_name || "").trim();
  const pin = String(body.pin || "").trim();

  if (!username || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Username must be 3-20 chars, letters/numbers/underscore only." } }, { status: 400 });
  }
  if (!displayName || displayName.length < 1 || displayName.length > 50) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Display name required (1-50 chars)." } }, { status: 400 });
  }
  if (!/^\d{5}$/.test(pin)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "PIN must be exactly 5 digits." } }, { status: 400 });
  }

  const normalized = normalizeUsername(username);

  try {
    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.normalizedUsername, normalized)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: { code: "USERNAME_TAKEN", message: "That username is already taken. Please choose another." } }, { status: 409 });
    }

    const pinHash = await hashPin(pin);
    const inserted = await db.insert(users).values({ username, normalizedUsername: normalized, displayName, pinHash }).returning({ id: users.id, username: users.username, displayName: users.displayName });
    const user = inserted[0];

    // Create contribution stats
    try {
      await db.insert(contributionStats).values({ userId: user.id, approvedCount: 0, pendingCount: 0, rejectedCount: 0 });
    } catch {}

    const { getEnv } = await import("@/lib/env");
    const env = getEnv();
    const token = createSessionToken(user.id, env.APP_SECRET);

    const res = NextResponse.json({ data: { id: user.id, username: user.username, displayName: user.displayName } }, { status: 201 });
    res.cookies.set("session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 30 * 24 * 60 * 60, path: "/" });
    return res;
  } catch (e) {
    console.error("[api/auth/register]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not create profile." } }, { status: 500 });
  }
}
