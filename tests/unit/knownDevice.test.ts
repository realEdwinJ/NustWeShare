import { describe, it, expect } from "vitest";
import { addKnownDevice, isKnownDevice } from "@/lib/auth/knownDevice";

const S = "secret-secret-secret-123456";
describe("known-device cookie", () => {
  it("recognises devices that signed in before, per account", () => {
    const c = addKnownDevice(undefined, "user-a", 0, S);
    expect(isKnownDevice(c, "user-a", 0, S)).toBe(true);
    expect(isKnownDevice(c, "user-b", 0, S)).toBe(false);
    expect(isKnownDevice(c, "user-a", 0, "other-secret-xxxxxxxxxxx")).toBe(false);
    expect(isKnownDevice(c, "user-a", 1, S)).toBe(false); // revoked by PIN reset / sign-out-everywhere
  });
  it("rejects forged values and keeps at most 5 accounts", () => {
    expect(isKnownDevice("user-a.forged", "user-a", 0, S)).toBe(false);
    let c: string | undefined;
    for (let i = 0; i < 7; i++) c = addKnownDevice(c, `u${i}`, 0, S);
    expect(c!.split("|")).toHaveLength(5);
    expect(isKnownDevice(c, "u6", 0, S)).toBe(true);
    expect(isKnownDevice(c, "u0", 0, S)).toBe(false);
  });
});
