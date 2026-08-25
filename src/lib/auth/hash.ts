import bcrypt from "bcryptjs";

// Use bcryptjs for pure JS; Spec 19 says hash PIN securely — bcrypt with 10 rounds suffices for 5-digit PIN with rate limiting
const ROUNDS = 10;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
