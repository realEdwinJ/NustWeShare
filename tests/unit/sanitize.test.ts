import { describe, it, expect } from "vitest";
import { sanitizeFilename, sanitizeR2Key } from "@/lib/security/sanitize";

describe("sanitize — Spec 51 safe R2 keys, no traversal", () => {
  it("sanitizes filename strips path and unsafe chars", () => {
    expect(sanitizeFilename("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeFilename("My Paper (1).pdf")).toBe("My_Paper_1_.pdf");
  });

  it("ensures .pdf extension", () => {
    expect(sanitizeFilename("paper")).toBe("paper.pdf");
    expect(sanitizeFilename("paper.PDF")).toBe("paper.PDF");
  });

  it("rejects traversal in R2 key", () => {
    expect(() => sanitizeR2Key("papers/../../etc/passwd.pdf")).toThrow("traversal");
    expect(() => sanitizeR2Key("../papers/test.pdf")).toThrow();
  });

  it("lowercases R2 key and allows safe chars", () => {
    const k = sanitizeR2Key("papers/FCI/MCI511S/2025/abc.pdf");
    expect(k).toBe("papers/fci/mci511s/2025/abc.pdf");
  });

  it("rejects too long R2 key", () => {
    const long = "a".repeat(600) + ".pdf";
    expect(() => sanitizeR2Key(long)).toThrow("too long");
  });
});
