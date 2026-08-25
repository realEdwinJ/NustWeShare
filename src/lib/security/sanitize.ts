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

export function hashIp(ip: string, salt: string = process.env.APP_SECRET ?? "nustweshare-salt"): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha256").update(ip + salt).digest("hex").slice(0, 64);
}
