import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

// Unambiguous alphabet (no 0/O/1/I/L)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 15 random symbols in 3 groups, e.g. "K7QM-3XR9P-WD4HT" (~74 bits). */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(15);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 5)}-${chars.slice(5, 10)}-${chars.slice(10, 15)}`;
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function hashRecoveryCode(code: string) {
  return bcrypt.hash(normalizeRecoveryCode(code), 10);
}

export async function verifyRecoveryCode(code: string, hash: string) {
  return bcrypt.compare(normalizeRecoveryCode(code), hash);
}
