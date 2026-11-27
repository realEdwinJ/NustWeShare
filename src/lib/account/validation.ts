export const AVATAR_COLORS = ["indigo", "sky", "emerald", "amber", "rose", "violet", "teal", "orange", "slate"] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
export const PIN_RE = /^\d{5}$/;

export function validateUsername(u: unknown): string | null {
  const s = String(u ?? "").trim();
  if (!USERNAME_RE.test(s)) return null;
  return s;
}

export function validateDisplayName(d: unknown): string | null {
  const s = String(d ?? "").replace(/\s+/g, " ").trim();
  if (s.length < 1 || s.length > 50) return null;
  // No control characters
  if (/[\u0000-\u001f\u007f]/.test(s)) return null;
  return s;
}

/** Disallow trivially guessable PINs. */
export function weakPinReason(pin: string): string | null {
  if (!PIN_RE.test(pin)) return "PIN must be exactly 5 digits.";
  if (/^(\d)\1{4}$/.test(pin)) return "Avoid repeating the same digit (e.g. 11111).";
  const asc = "0123456789";
  const desc = "9876543210";
  if (asc.includes(pin) || desc.includes(pin)) return "Avoid sequences like 12345.";
  return null;
}

export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "support", "nust", "nustweshare", "anonymous", "ghost", "moderator", "mod", "system", "api", "settings", "me",
]);
