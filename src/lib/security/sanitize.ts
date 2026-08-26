// Filename + R2 key sanitization per Spec 51
export function sanitizeFilename(original: string): string {
  // Strip path, keep basename
  const base = original.split("/").pop()?.split("\\").pop() ?? original;
  // Remove control chars, keep safe chars, limit length
  const safe = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 200);
  // Ensure .pdf extension
  if (!safe.toLowerCase().endsWith(".pdf")) return `${safe}.pdf`;
  return safe;
}

export function sanitizeR2Key(key: string): string {
  // Prevent path traversal, enforce allowed charset
  if (key.includes("..")) throw new Error("Invalid R2 key: traversal not allowed");
  const sanitized = key.replace(/[^a-zA-Z0-9/._-]/g, "_").toLowerCase();
  if (sanitized.length > 500) throw new Error("R2 key too long");
  return sanitized;
}

export function getAppSecret(): string {
  // Try Cloudflare env first (Workers), then process.env
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env?.APP_SECRET) return ctx.env.APP_SECRET as string;
  } catch {}
  return process.env.APP_SECRET ?? "nustweshare-salt";
}

export function hashIp(ip: string, salt?: string): string {
  const secret = salt ?? getAppSecret();
  try {
    const crypto = require("crypto") as typeof import("crypto");
    return crypto.createHash("sha256").update(ip + secret).digest("hex").slice(0, 64);
  } catch {
    // Workers fallback: simple hash via Web Crypto not sync, so use fast djb2 fallback for rate-limit keys (not cryptographic)
    // For competition, we keep deterministic but not crypto-secure; enough for dedup
    let hash = 5381;
    const str = ip + secret;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    const hex = (hash >>> 0).toString(16).padStart(8, "0");
    // Repeat to reach 64 chars deterministic
    return (hex + hex + hex + hex + hex + hex + hex + hex).slice(0, 64);
  }
}
