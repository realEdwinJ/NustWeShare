import { describe, it, expect } from "vitest";
import { validatePdfFile, validatePdfMagic } from "@/lib/validation/pdf";

describe("PDF validation — Spec 15, 3 MB per file, never trust client", () => {
  it("rejects oversized", () => {
    expect(() => validatePdfFile({ size: 3 * 1024 * 1024 + 1, type: "application/pdf", name: "paper.pdf" })).toThrow("larger than the 3 MB limit");
  });

  it("rejects non-pdf extension", () => {
    expect(() => validatePdfFile({ size: 1000, type: "application/pdf", name: "paper.exe" })).toThrow();
  });

  it("rejects wrong MIME", () => {
    expect(() => validatePdfFile({ size: 1000, type: "image/png", name: "paper.pdf" })).toThrow();
  });

  it("accepts valid pdf", () => {
    expect(() => validatePdfFile({ size: 1000, type: "application/pdf", name: "ELC511S_2025_EXAM.pdf" })).not.toThrow();
  });

  it("validates magic bytes %PDF", () => {
    expect(() => validatePdfMagic(Buffer.from("%PDF-1.4 fake"))).not.toThrow();
    expect(() => validatePdfMagic(Buffer.from("PK\x03\x04 fake zip"))).toThrow();
    expect(() => validatePdfMagic(Buffer.from(""))).toThrow();
  });

  it("rejects empty file", () => {
    expect(() => validatePdfFile({ size: 0, type: "application/pdf", name: "empty.pdf" })).toThrow("empty");
  });
});
