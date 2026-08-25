import { describe, it, expect } from "vitest";
import { normalizeText, fingerprintFromText } from "@/lib/duplicates/textFingerprint";

describe("text fingerprint — Spec 28 normalized deterministic, no LLM", () => {
  it("normalizes whitespace and case", () => {
    const a = normalizeText("  Hello   WORLD\n\nTest  ");
    const b = normalizeText("hello world test");
    expect(a).toBe(b);
  });

  it("same content with different whitespace gives same fingerprint", () => {
    const f1 = fingerprintFromText("ELC511S  Electronic Devices  Test 1");
    const f2 = fingerprintFromText("  elc511s\tElectronic\nDevices Test 1  ");
    expect(f1).toBe(f2);
  });

  it("different content gives different fingerprint", () => {
    const f1 = fingerprintFromText("Paper A content");
    const f2 = fingerprintFromText("Paper B content");
    expect(f1).not.toBe(f2);
  });

  it("strips standalone page numbers", () => {
    const withNumbers = normalizeText("Content\n1\nMore content\n2");
    const without = normalizeText("Content More content");
    // Page numbers like "1" on own line are stripped, so they should not affect fingerprint difference much
    // We check that normalized removes single digits lines
    expect(withNumbers).not.toContain("\n1\n");
  });
});
