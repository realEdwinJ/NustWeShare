import { describe, it, expect } from "vitest";
import { sha256 } from "@/lib/duplicates/sha256";
import { createHash } from "crypto";

describe("sha256 — Spec 26 exact binary duplicate", () => {
  it("produces deterministic 64-char hex", () => {
    const buf = Buffer.from("hello NUST");
    const h = sha256(buf);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(h).toBe(createHash("sha256").update(buf).digest("hex"));
  });

  it("different buffers produce different hashes", () => {
    const a = sha256(Buffer.from("paper A"));
    const b = sha256(Buffer.from("paper B"));
    expect(a).not.toBe(b);
  });

  it("same content at different resolutions would still hash differently (demonstrates why text fingerprint needed)", () => {
    // Simulate same paper exported at different resolutions would have different bytes → different SHA but same text
    const a = Buffer.from("%PDF-1.4 binary content A");
    const b = Buffer.from("%PDF-1.4 binary content B");
    expect(sha256(a)).not.toBe(sha256(b));
  });
});
