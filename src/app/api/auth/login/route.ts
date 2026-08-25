import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { verifyPin, normalizeUsername } from "@/lib/auth/hash";
import { createSessionToken } from "@/lib/auth/session";
import { rateLimit, limits } from "@/lib/security/rateLimit";
import { hashIp } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = hashIp(ip).slice(0, 16);
  const rl = rateLimit({ key: `login:${ipHash}`, limit: limits.login.limit, windowMs: limits.login.windowMs });
  if (!rl.allowed) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many login attempts. Try again soon." } }, { status: 429 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid request." } }, { status: 400 });
  }

  const username = String(body.username || "").trim();
  const pin = String(body.pin || "").trim();
  if (!username || !/^\d{5}$/.test(pin)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Username and 5-digit PIN required." } }, { status: 400 });
  }

  const normalized = normalizeUsername(username);

  try {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.normalizedUsername, normalized)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid username or PIN." } }, { status: 401 });
    }
    const user = rows[0];

    // Check lockout
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      const mins = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return NextResponse.json({ error: { code: "PIN_LOCKED", message: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` } }, { status: 429 });
    }

    const ok = await verifyPin(pin, user.pinHash);
    if (!ok) {
      const attempts = (user.failedAttempts || 0) + 1;
      let lockedUntil: Date | null = null;
      if (attempts >= 5) {
        // Progressive lockout: 15 min * (attempts-4)
        const mins = 15 * (attempts - 4);
        lockedUntil = new Date(Date.now() + mins * 60 * 1000);
      }
      await db.update(users).set({ failedAttempts: attempts, lockedUntil }).where(eq(users.id, user.id));
      if (attempts >= 5) {
        const mins = 15 * (attempts - 4);
        return NextResponse.json({ error: { code: "PIN_LOCKED", message: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` } }, { status: 429 });
      }
      return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid username or PIN." } }, { status: 401 });
    }

    // Success: reset attempts
    await db.update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));

    const { getEnv } = await import("@/lib/env");
    const env = getEnv();
    const token = createSessionToken(user.id, env.APP_SECRET);

    const res = NextResponse.json({ data: { id: user.id, username: user.username, displayName: user.displayName } });
    res.cookies.set("session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 30 * 24 * 60 * 60, path: "/" });
    return res;
  } catch (e) {
    console.error("[api/auth/login]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Login failed." } }, { status: 500 });
  }
}
