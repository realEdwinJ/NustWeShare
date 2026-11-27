import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export type SessionPayload = { userId: string; version: number; issuedAt: number };

/**
 * Signed token: v2.<userId>.<sessionVersion>.<issuedAtMs>.<nonce>.<sig>, base64url-wrapped.
 * sessionVersion lets a user "log out everywhere" (bumping the version invalidates all tokens).
 */
export function createSessionToken(userId: string, secret: string, version = 0): string {
  const payload = `v2.${userId}.${version}.${Date.now()}.${randomBytes(8).toString("hex")}`;
  const sig = sign(payload, secret);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function parseSessionToken(token: string, secret: string, now = Date.now()): SessionPayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot <= 0) return null;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    if (!safeEqual(sign(payload, secret), sig)) return null;
    const parts = payload.split(".");
    let userId: string;
    let version = 0;
    let issuedAt: number;
    if (parts[0] === "v2" && parts.length === 5) {
      userId = parts[1];
      version = parseInt(parts[2], 10);
      issuedAt = parseInt(parts[3], 10);
    } else if (parts.length === 3) {
      // Legacy token: userId.timestamp.nonce
      userId = parts[0];
      issuedAt = parseInt(parts[1], 10);
    } else {
      return null;
    }
    if (!userId || !Number.isFinite(issuedAt) || !Number.isFinite(version)) return null;
    if (now - issuedAt > SESSION_MAX_AGE_SECONDS * 1000) return null; // expired
    if (issuedAt - now > 60_000) return null; // from the future
    return { userId, version, issuedAt };
  } catch {
    return null;
  }
}

/** Back-compat helper: returns the userId when the signature and expiry are valid. */
export function verifySessionToken(token: string, secret: string): string | null {
  return parseSessionToken(token, secret)?.userId ?? null;
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}
