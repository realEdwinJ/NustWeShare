import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { verifyPin, normalizeUsername } from "@/lib/auth/hash";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { rateLimitShared, limits } from "@/lib/security/rateLimit";
import { hashIp } from "@/lib/security/sanitize";
import { getClientIp, jsonError, readJson } from "@/lib/http";
import { KNOWN_DEVICE_COOKIE, addKnownDevice, isKnownDevice, knownDeviceCookieOptions } from "@/lib/auth/knownDevice";

export const dynamic = "force-dynamic";

function lockMessage(until: Date) {
  const mins = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));
  return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
}

export async function POST(req: NextRequest) {
  const ipHash = hashIp(getClientIp(req)).slice(0, 16);
  const rl = await rateLimitShared({ key: `login:${ipHash}`, limit: limits.login.limit * 2, windowMs: limits.login.windowMs });
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

    // Lockout model (decays on its own, can't be weaponised by one attacker):
    //  • per network: 5 wrong PINs → that network waits 15 min (other networks unaffected)
    //  • account-wide: only when ≥3 different networks are failing within their windows AND ≥15 failures
    //    in total (a distributed guessing attempt); it lifts automatically as those windows expire.
    const agg = await db.execute(sql`
      SELECT count(*)::int AS nets, coalesce(sum(count), 0)::int AS fails, max(reset_at) AS until
      FROM rate_limits WHERE key LIKE ${`pinfail:${user.id}:%`} AND reset_at > now() AND count > 0`);
    const a0 = (agg.rows as any[])[0] ?? {};
    const { getEnv } = await import("@/lib/env");
    const secret = getEnv().APP_SECRET;
    const knownDevice = isKnownDevice(req.cookies.get(KNOWN_DEVICE_COOKIE)?.value, user.id, secret);
    if (Number(a0.nets) >= 3 && Number(a0.fails) >= 15 && !knownDevice) {
      return jsonError(
        "PIN_LOCKED",
        `${lockMessage(new Date(a0.until))} Someone is guessing this account's PIN from several networks. You can still sign in from a device you've used before, or reset your PIN with your recovery code.`,
        429
      );
    }
    const netKey = `pinfail:${user.id}:${ipHash}`;
    const peek = await db.execute(sql`SELECT count, reset_at FROM rate_limits WHERE key = ${netKey} AND reset_at > now()`);
    const cur = (peek.rows as any[])[0];
    if (cur && Number(cur.count) >= 5) return jsonError("PIN_LOCKED", lockMessage(new Date(cur.reset_at)), 429);

    const ok = await verifyPin(pin, user.pinHash);
    if (!ok) {
      const after = await rateLimitShared({ key: netKey, limit: 5, windowMs: 15 * 60 * 1000 });
      await db.update(users).set({ failedAttempts: sql`${users.failedAttempts} + 1` }).where(eq(users.id, user.id));
      if (!after.allowed || after.remaining === 0) return jsonError("PIN_LOCKED", lockMessage(new Date(after.resetAt)), 429);
      const left = after.remaining;
      return jsonError("INVALID_CREDENTIALS", `Invalid username or PIN. ${left} attempt${left === 1 ? "" : "s"} left before a short pause.`, 401);
    }

    await db.execute(sql`DELETE FROM rate_limits WHERE key = ${`pinfail:${user.id}:${ipHash}`}`).catch(() => {});
    await db.update(users).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const token = createSessionToken(user.id, secret, user.sessionVersion ?? 0);
    const res = NextResponse.json({ data: { id: user.id, username: user.username, displayName: user.displayName } });
    const remember = body.remember !== false;
    res.cookies.set(SESSION_COOKIE, token, remember ? sessionCookieOptions() : { ...sessionCookieOptions(), maxAge: undefined as any });
    res.cookies.set(KNOWN_DEVICE_COOKIE, addKnownDevice(req.cookies.get(KNOWN_DEVICE_COOKIE)?.value, user.id, secret), knownDeviceCookieOptions);
    return res;
  } catch (e) {
    console.error("[api/auth/login]", e);
    return jsonError("DB_ERROR", "Login failed. Please try again.", 500);
  }
}
