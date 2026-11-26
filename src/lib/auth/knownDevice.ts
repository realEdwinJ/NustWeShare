import { createHmac, timingSafeEqual } from "crypto";

// A browser that has signed in successfully before gets a long-lived signed cookie. During an account-wide
// lockout (distributed guessing) a correct PIN from such a device is still accepted, so attackers can't use
// the lockout to keep the real owner out.
export const KNOWN_DEVICE_COOKIE = "kd";
const MAX_AGE = 365 * 24 * 60 * 60;

function sig(userId: string, secret: string) {
  return createHmac("sha256", secret).update(`known-device:${userId}`).digest("base64url");
}

/** Cookie value holds up to 5 accounts used on this device: "<userId>.<sig>|…" */
export function addKnownDevice(current: string | undefined, userId: string, secret: string): string {
  const entries = (current ?? "").split("|").filter((e) => e && !e.startsWith(`${userId}.`));
  return [`${userId}.${sig(userId, secret)}`, ...entries].slice(0, 5).join("|");
}

export function isKnownDevice(current: string | undefined, userId: string, secret: string): boolean {
  if (!current) return false;
  const expected = Buffer.from(sig(userId, secret));
  return current.split("|").some((e) => {
    const [id, s] = e.split(".");
    if (id !== userId || !s) return false;
    const got = Buffer.from(s);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export const knownDeviceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: MAX_AGE,
  path: "/api/auth",
};
