import { createHash } from "crypto";

// Per Spec 28 — normalize text, remove noise, deterministic fingerprint
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\d+\s*$/gm, "") // strip standalone page numbers
    .replace(/\s+/g, " ")
    .trim();
}

export function textFingerprint(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex");
}

export function fingerprintFromText(raw: string): string {
  return textFingerprint(normalizeText(raw));
}
