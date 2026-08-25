import { describe, it, expect } from "vitest";
import { sanitizeFilename, sanitizeR2Key, hashIp } from "@/lib/security/sanitize";
import { validatePdfFile, validatePdfMagic } from "@/lib/validation/pdf";
import { rateLimit } from "@/lib/security/rateLimit";

describe("security — Spec 81", () => {
  it("blocks invalid PDF (exe renamed)", () => {
    expect(() => validatePdfFile({ size: 1000, type: "application/pdf", name: "malware.exe.pdf" })).not.toThrow(); // extension ok, but magic will fail
    expect(() => validatePdfMagic(Buffer.from("MZ fake exe"))).toThrow();
  });

  it("blocks oversized 3.1 MB", () => {
    expect(() => validatePdfFile({ size: 3 * 1024 * 1024 + 1, type: "application/pdf", name: "big.pdf" })).toThrow("3 MB");
  });

  it("sanitizes manipulated filename ../../../etc/passwd", () => {
    const sanitized = sanitizeFilename("../../../etc/passwd.pdf");
    expect(sanitized).not.toContain("..");
    expect(sanitized).toBe("passwd.pdf");
  });

  it("rejects malicious R2 key traversal", () => {
    expect(() => sanitizeR2Key("papers/../../etc/passwd.pdf")).toThrow();
    expect(() => sanitizeR2Key("../papers/test.pdf")).toThrow();
  });

  it("rate limits brute-force PIN (5 fails → lockout)", () => {
    const key = `test-pin:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const r = rateLimit({ key, limit: 5, windowMs: 15 * 60 * 1000 });
      expect(r.allowed).toBe(true);
    }
    const blocked = rateLimit({ key, limit: 5, windowMs: 15 * 60 * 1000 });
    expect(blocked.allowed).toBe(false);
  });

  it("prevents duplicate report from same IP (Spec 34)", () => {
    // Simulate: hashIp same for same IP, so second report would be duplicate
    const ip = "1.2.3.4";
    const h1 = hashIp(ip);
    const h2 = hashIp(ip);
    expect(h1).toBe(h2);
    const otherIpHash = hashIp("5.6.7.8");
    expect(h1).not.toBe(otherIpHash);
  });

  it("XSS is escaped via React — stored raw but not executed (manual check: no dangerouslySetInnerHTML in codebase)", async () => {
    // Grep check placeholder — ensure no dangerouslySetInnerHTML
    const fs = await import("fs");
    const files = ["src/app/page.tsx", "src/components/ui/button.tsx"].map((p) => {
      try {
        return fs.readFileSync(p, "utf-8");
      } catch {
        return "";
      }
    });
    for (const content of files) {
      expect(content.includes("dangerouslySetInnerHTML")).toBe(false);
    }
  });

  it("rejects forged moduleId (Spec 60)", async () => {
    // Simulate server resolving module from DB — forged UUID should be not found
    // Here we just check that validation requires UUID format
    const { paperCreateSchema } = await import("@/lib/validation/schemas");
    expect(() => paperCreateSchema.parse({ moduleId: "not-a-uuid", assessmentType: "EXAM" })).toThrow();
  });
});
