import { describe, it, expect } from "vitest";
import { addKnownDevice, isKnownDevice } from "@/lib/auth/knownDevice";

const S = "secret-secret-secret-123456";
describe("known-device cookie", () => {
  it("recognises devices that signed in before, per account", () => {
    const c = addKnownDevice(undefined, "user-a", S);
    expect(isKnownDevice(c, "user-a", S)).toBe(true);
    expect(isKnownDevice(c, "user-b", S)).toBe(false);
    expect(isKnownDevice(c, "user-a", "other-secret-xxxxxxxxxxx")).toBe(false);
  });
  it("rejects forged values and keeps at most 5 accounts", () => {
    expect(isKnownDevice("user-a.forged", "user-a", S)).toBe(false);
    let c: string | undefined;
    for (let i = 0; i < 7; i++) c = addKnownDevice(c, `u${i}`, S);
    expect(c!.split("|")).toHaveLength(5);
    expect(isKnownDevice(c, "u6", S)).toBe(true);
    expect(isKnownDevice(c, "u0", S)).toBe(false);
  });
});
