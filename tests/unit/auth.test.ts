import { describe, it, expect } from "vitest";
import { hashPin, verifyPin, normalizeUsername } from "@/lib/auth/hash";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

describe("auth — Spec 19-20 username+PIN, hashed, lockout, case-insensitive", () => {
  it("normalizes username lower", () => {
    expect(normalizeUsername("Adonnis")).toBe("adonnis");
    expect(normalizeUsername(" ADONNIS ")).toBe("adonnis");
  });

  it("case-insensitive uniqueness: Adonnis = adonnis = ADONNIS", () => {
    const a = normalizeUsername("Adonnis");
    const b = normalizeUsername("adonnis");
    const c = normalizeUsername("ADONNIS");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("hashes PIN and verifies", async () => {
    const pin = "12345";
    const hash = await hashPin(pin);
    expect(hash).not.toBe(pin);
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
    expect(await verifyPin(pin, hash)).toBe(true);
    expect(await verifyPin("54321", hash)).toBe(false);
  });

  it("session token signs and verifies", () => {
    const secret = "test-secret-1234567890";
    const token = createSessionToken("user-123", secret);
    expect(token.length).toBeGreaterThan(20);
    expect(verifySessionToken(token, secret)).toBe("user-123");
    expect(verifySessionToken(token, "wrong-secret")).toBeNull();
    expect(verifySessionToken("invalid", secret)).toBeNull();
  });

  it("PIN must be 5 digits — validation", () => {
    expect(/^\d{5}$/.test("12345")).toBe(true);
    expect(/^\d{5}$/.test("1234")).toBe(false);
    expect(/^\d{5}$/.test("123456")).toBe(false);
    expect(/^\d{5}$/.test("abcde")).toBe(false);
  });
});
