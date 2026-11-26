import { describe, it, expect } from "vitest";
import { createSessionToken, parseSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { createHmac } from "crypto";

const SECRET = "test-secret-1234567890-abcdef";

describe("session tokens", () => {
  it("round-trips user id and version", () => {
    const t = createSessionToken("u-1", SECRET, 3);
    expect(parseSessionToken(t, SECRET)).toMatchObject({ userId: "u-1", version: 3 });
  });
  it("rejects wrong secret and tampering", () => {
    const t = createSessionToken("u-1", SECRET, 0);
    expect(parseSessionToken(t, "other-secret-xxxxxxxxxxxx")).toBeNull();
    const raw = Buffer.from(t, "base64url").toString().replace("u-1", "u-2");
    expect(parseSessionToken(Buffer.from(raw).toString("base64url"), SECRET)).toBeNull();
    expect(parseSessionToken("garbage", SECRET)).toBeNull();
  });
  it("expires after max age", () => {
    const t = createSessionToken("u-1", SECRET, 0);
    expect(parseSessionToken(t, SECRET, Date.now() + (SESSION_MAX_AGE_SECONDS + 60) * 1000)).toBeNull();
  });
  it("still accepts legacy (v1) tokens within max age", () => {
    const payload = `legacy-user.${Date.now()}.abcd`;
    const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
    const tok = Buffer.from(`${payload}.${sig}`).toString("base64url");
    expect(parseSessionToken(tok, SECRET)).toMatchObject({ userId: "legacy-user", version: 0 });
  });
});
