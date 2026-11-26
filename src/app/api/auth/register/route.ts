import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { contributionStats } from "@/db/schema/contribution_stats";
import { hashPin, normalizeUsername } from "@/lib/auth/hash";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rateLimit";
import { hashIp } from "@/lib/security/sanitize";
import { getClientIp, jsonError, readJson } from "@/lib/http";
import { AVATAR_COLORS, RESERVED_USERNAMES, validateDisplayName, validateUsername, weakPinReason } from "@/lib/account/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `register:${hashIp(ip).slice(0, 16)}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) return jsonError("RATE_LIMITED", "Too many sign-ups from this network. Try again later.", 429);

  const body = await readJson(req);
  if (!body) return jsonError("INVALID_REQUEST", "Invalid request.");

  const username = validateUsername(body.username);
  if (!username) return jsonError("VALIDATION_ERROR", "Username must be 3–20 characters: letters, numbers or underscore.");
  const normalized = normalizeUsername(username);
  if (RESERVED_USERNAMES.has(normalized)) return jsonError("USERNAME_TAKEN", "That username is reserved. Please choose another.", 409);
  const displayName = validateDisplayName(body.displayName || body.display_name || username);
  if (!displayName) return jsonError("VALIDATION_ERROR", "Display name must be 1–50 characters.");
  const pin = String(body.pin || "").trim();
  const weak = weakPinReason(pin);
  if (weak) return jsonError("WEAK_PIN", weak);

  try {
    const db = getDb();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.normalizedUsername, normalized)).limit(1);
    if (existing.length > 0) return jsonError("USERNAME_TAKEN", "That username is already taken. Please choose another.", 409);

    const pinHash = await hashPin(pin);
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const inserted = await db
      .insert(users)
      .values({ username, normalizedUsername: normalized, displayName, pinHash, avatarColor: color, lastLoginAt: new Date() })
      .returning({ id: users.id, username: users.username, displayName: users.displayName });
    const user = inserted[0];
    try {
      await db.insert(contributionStats).values({ userId: user.id });
    } catch {}

    const { getEnv } = await import("@/lib/env");
    const token = createSessionToken(user.id, getEnv().APP_SECRET, 0);
    const res = NextResponse.json({ data: user }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (e: any) {
    const msg = String(e?.message || "") + String(e?.cause?.message || "");
    if (msg.includes("duplicate key") || msg.includes("unique")) {
      return jsonError("USERNAME_TAKEN", "That username is already taken. Please choose another.", 409);
    }
    console.error("[api/auth/register]", e);
    return jsonError("DB_ERROR", "Could not create profile. Please try again.", 500);
  }
}
