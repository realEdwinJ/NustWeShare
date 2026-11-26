import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { getUserFromRequest } from "@/lib/auth/current";
import { hashPin, verifyPin } from "@/lib/auth/hash";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { jsonError, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";
import { weakPinReason } from "@/lib/account/validation";

export const dynamic = "force-dynamic";

// POST /api/account/pin — change PIN; signs out all other devices.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError("UNAUTHORIZED", "You need to be logged in.", 401);
  const rl = rateLimit({ key: `pin:${user.id}`, limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) return jsonError("RATE_LIMITED", "Too many attempts. Try again in a few minutes.", 429);
  const body = await readJson(req);
  const current = String(body?.currentPin ?? "");
  const next = String(body?.newPin ?? "");
  const weak = weakPinReason(next);
  if (weak) return jsonError("WEAK_PIN", weak);
  if (current === next) return jsonError("VALIDATION_ERROR", "New PIN must be different from the current one.");
  const db = getDb();
  const row = await db.select({ pinHash: users.pinHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row[0] || !(await verifyPin(current, row[0].pinHash))) return jsonError("INVALID_CREDENTIALS", "Current PIN is incorrect.", 401);
  const updated = await db
    .update(users)
    .set({ pinHash: await hashPin(next), pinChangedAt: new Date(), sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning({ v: users.sessionVersion });
  const { getEnv } = await import("@/lib/env");
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id, getEnv().APP_SECRET, updated[0].v), sessionCookieOptions());
  return res;
}
