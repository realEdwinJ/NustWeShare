import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { verifyPin, normalizeUsername } from "@/lib/auth/hash";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { rateLimit, limits } from "@/lib/security/rateLimit";
import { hashIp } from "@/lib/security/sanitize";
import { getClientIp, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

function lockMessage(until: Date) {
  const mins = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));
  return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
}

export async function POST(req: NextRequest) {
  const ipHash = hashIp(getClientIp(req)).slice(0, 16);
  const rl = rateLimit({ key: `login:${ipHash}`, limit: limits.login.limit * 2, windowMs: limits.login.windowMs });
  if (!rl.allowed) return jsonError("RATE_LIMITED", "Too many login attempts from this network. Try again soon.", 429);

  const body = await readJson(req);
  if (!body) return jsonError("INVALID_REQUEST", "Invalid request.");
  const username = String(body.username || "").trim();
  const pin = String(body.pin || "").trim();
  if (!username || !/^\d{5}$/.test(pin)) return jsonError("VALIDATION_ERROR", "Enter your username and 5-digit PIN.");

  try {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.normalizedUsername, normalizeUsername(username))).limit(1);
    if (rows.length === 0) {
      // Spend similar time as a real check to avoid username enumeration by timing
      await verifyPin(pin, "$2b$10$m9T4wvitKFDwe3gz0SlGBeIibXu04CGTXcmiwyjz8POmUt9Z6aWKS").catch(() => false);
      return jsonError("INVALID_CREDENTIALS", "Invalid username or PIN.", 401);
    }
    const user = rows[0];
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return jsonError("PIN_LOCKED", lockMessage(user.lockedUntil), 429);
    }

    const ok = await verifyPin(pin, user.pinHash);
    if (!ok) {
      const attempts = (user.failedAttempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * (attempts - 4) * 60 * 1000) : null;
      await db.update(users).set({ failedAttempts: attempts, lockedUntil }).where(eq(users.id, user.id));
      if (lockedUntil) return jsonError("PIN_LOCKED", lockMessage(lockedUntil), 429);
      const left = 5 - attempts;
      return jsonError("INVALID_CREDENTIALS", `Invalid username or PIN. ${left} attempt${left === 1 ? "" : "s"} left before a temporary lock.`, 401);
    }

    await db.update(users).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const { getEnv } = await import("@/lib/env");
    const token = createSessionToken(user.id, getEnv().APP_SECRET, user.sessionVersion ?? 0);
    const res = NextResponse.json({ data: { id: user.id, username: user.username, displayName: user.displayName } });
    const remember = body.remember !== false;
    res.cookies.set(SESSION_COOKIE, token, remember ? sessionCookieOptions() : { ...sessionCookieOptions(), maxAge: undefined as any });
    return res;
  } catch (e) {
    console.error("[api/auth/login]", e);
    return jsonError("DB_ERROR", "Login failed. Please try again.", 500);
  }
}
