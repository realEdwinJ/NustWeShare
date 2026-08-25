import { describe, it, expect } from "vitest";
import { parseFilename } from "@/lib/filename";

describe("parseFilename — Spec 14 deterministic, no AI", () => {
  it("parses ELC511S_2025_EXAM.pdf", () => {
    const r = parseFilename("ELC511S_2025_EXAM.pdf");
    expect(r.year).toBe(2025);
    expect(r.assessmentType).toBe("EXAM");
    expect(r.moduleCode).toBe("ELC511S");
    expect(r.confidence).toBe("high");
  });

  it("parses ELC_2024_TEST_1.pdf", () => {
    const r = parseFilename("ELC_2024_TEST_1.pdf");
    expect(r.year).toBe(2024);
    expect(r.assessmentType).toBe("TEST");
    expect(r.assessmentNumber).toBe(1);
  });

  it("parses Electronic_Devices_2023_Supplementary.pdf", () => {
    const r = parseFilename("Electronic_Devices_2023_Supplementary.pdf");
    expect(r.year).toBe(2023);
    expect(r.assessmentType).toBe("SUPPLEMENTARY");
  });

  it("parses MCI511S quiz 2", () => {
    const r = parseFilename("MCI511S_2025_QUIZ_2.pdf");
    expect(r.assessmentType).toBe("QUIZ");
    expect(r.assessmentNumber).toBe(2);
    expect(r.moduleCode).toBe("MCI511S");
  });

  it("does not treat filename as authoritative — user can correct", () => {
    const r = parseFilename("random.pdf");
    expect(r.confidence).toBe("low");
    // No year/type extracted, but parsing doesn't throw
    expect(r.year).toBeUndefined();
  });

  it("handles SUPP abbreviation", () => {
    const r = parseFilename("ELC511S_2025_SUPP.pdf");
    expect(r.assessmentType).toBe("SUPPLEMENTARY");
  });

  it("is case-insensitive", () => {
    const r = parseFilename("elc511s_2025_exam.PDF");
    expect(r.moduleCode).toBe("ELC511S");
    expect(r.assessmentType).toBe("EXAM");
  });
});
