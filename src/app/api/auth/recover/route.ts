import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { hashPin, normalizeUsername } from "@/lib/auth/hash";
import { generateRecoveryCode, hashRecoveryCode, verifyRecoveryCode } from "@/lib/auth/recovery";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { rateLimitShared } from "@/lib/security/rateLimit";
import { hashIp } from "@/lib/security/sanitize";
import { getClientIp, jsonError, readJson } from "@/lib/http";
import { weakPinReason } from "@/lib/account/validation";

export const dynamic = "force-dynamic";

// POST /api/auth/recover { username, code, newPin } — reset a forgotten PIN with the one-time recovery code.
// The code is consumed and a fresh one is issued; every other session is signed out.
export async function POST(req: NextRequest) {
  const ipHash = hashIp(getClientIp(req)).slice(0, 16);
  const rl = await rateLimitShared({ key: `recover:${ipHash}`, limit: 8, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) return jsonError("RATE_LIMITED", "Too many attempts. Try again later.", 429);
  const body = await readJson(req);
  const username = String(body?.username ?? "").trim();
  const code = String(body?.code ?? "");
  const newPin = String(body?.newPin ?? "");
  const weak = weakPinReason(newPin);
  if (weak) return jsonError("WEAK_PIN", weak);
  if (!username || code.replace(/[^A-Za-z0-9]/g, "").length < 12) return jsonError("VALIDATION_ERROR", "Enter your username and recovery code.");

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.normalizedUsername, normalizeUsername(username))).limit(1);
  const perAccount = await rateLimitShared({ key: `recover-acct:${user?.id ?? username.toLowerCase()}`, limit: 10, windowMs: 24 * 60 * 60 * 1000 });
  if (!perAccount.allowed) return jsonError("RATE_LIMITED", "Too many attempts for this account. Try again tomorrow.", 429);
  if (!user || !user.recoveryHash || !(await verifyRecoveryCode(code, user.recoveryHash))) {
    return jsonError("INVALID_CREDENTIALS", "That username and recovery code don't match.", 401);
  }
  const nextCode = generateRecoveryCode();
  const [u] = await db
    .update(users)
    .set({
      pinHash: await hashPin(newPin),
      pinChangedAt: new Date(),
      failedAttempts: 0,
      lockedUntil: null,
      recoveryHash: await hashRecoveryCode(nextCode),
      recoveryCreatedAt: new Date(),
      sessionVersion: sql`${users.sessionVersion} + 1`,
      lastLoginAt: new Date(),
    })
    // Conditional on the code we verified: two concurrent requests can't both spend the same code
    .where(and(eq(users.id, user.id), eq(users.recoveryHash, user.recoveryHash)))
    .returning({ v: users.sessionVersion });
  if (!u) return jsonError("INVALID_CREDENTIALS", "That recovery code was just used. Please log in.", 409);
  const { getEnv } = await import("@/lib/env");
  const res = NextResponse.json({ data: { displayName: user.displayName, recoveryCode: nextCode } }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id, getEnv().APP_SECRET, u.v), sessionCookieOptions());
  return res;
}
