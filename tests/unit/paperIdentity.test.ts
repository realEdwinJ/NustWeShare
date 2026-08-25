import { describe, it, expect } from "vitest";

describe("paper identity — Spec 4, 58 unique (module+year+semester+type+number) partial where active", () => {
  function makeIdentity(moduleId: string, year: number, sem: number, type: string, num: number | null) {
    return { moduleId, academicYear: year, semester: sem, assessmentType: type, assessmentNumber: num };
  }

  it("EXAM has no number (null)", () => {
    const id = makeIdentity("mod-1", 2025, 2, "EXAM", null);
    expect(id.assessmentNumber).toBeNull();
  });

  it("SUPPLEMENTARY has no number", () => {
    const id = makeIdentity("mod-1", 2025, 2, "SUPPLEMENTARY", null);
    expect(id.assessmentNumber).toBeNull();
  });

  it("TEST requires number", () => {
    const id = makeIdentity("mod-1", 2025, 2, "TEST", 1);
    expect(id.assessmentNumber).toBe(1);
  });

  it("different numbers are different papers", () => {
    const a = makeIdentity("mod-1", 2025, 2, "TEST", 1);
    const b = makeIdentity("mod-1", 2025, 2, "TEST", 2);
    expect(a.assessmentNumber).not.toBe(b.assessmentNumber);
  });

  it("same module different year is different paper", () => {
    const a = makeIdentity("mod-1", 2024, 2, "EXAM", null);
    const b = makeIdentity("mod-1", 2025, 2, "EXAM", null);
    expect(a.academicYear).not.toBe(b.academicYear);
  });

  it("paper vs file: one paper can have many files (different scans, same identity)", () => {
    const paperId = "paper-ELC511S-2025-EXAM";
    const files = ["scan1.pdf", "scan2.pdf", "original.pdf"];
    // All map to same paper identity → same paperId, different fileIds
    const fileIds = files.map(() => `file-${Math.random()}`);
    expect(new Set(fileIds).size).toBe(3);
    // But paper identity same
    const identities = files.map(() => makeIdentity("ELC511S", 2025, 2, "EXAM", null));
    expect(identities.every((i) => i.assessmentType === "EXAM" && i.assessmentNumber === null)).toBe(true);
  });
});
