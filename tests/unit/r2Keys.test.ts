import { describe, it, expect } from "vitest";
import { buildR2Key, buildDownloadFilename } from "@/lib/r2/keys";

describe("R2 keys — Spec 48 deterministic but DB source of truth", () => {
  it("builds deterministic organized key", () => {
    const k = buildR2Key({ facultySlug: "fci", moduleCode: "MCI511S", academicYear: 2025, paperId: "paper-123", fileId: "file-456" });
    expect(k).toBe("papers/fci/mci511s/2025/paper-123/file-456.pdf");
  });

  it("handles missing year as unknown", () => {
    const k = buildR2Key({ facultySlug: "febe", moduleCode: "ELC511S", academicYear: null, paperId: "p1", fileId: "f1" });
    expect(k).toBe("papers/febe/elc511s/unknown/p1/f1.pdf");
  });

  it("builds clean download filename per Spec 88", () => {
    expect(buildDownloadFilename({ moduleCode: "ELC511S", academicYear: 2025, assessmentType: "TEST", assessmentNumber: 1 })).toBe("ELC511S_2025_Test_1.pdf");
    expect(buildDownloadFilename({ moduleCode: "mci511s", academicYear: 2025, assessmentType: "EXAM", assessmentNumber: null })).toBe("MCI511S_2025_Exam.pdf");
    expect(buildDownloadFilename({ moduleCode: "COA511S", academicYear: 2024, assessmentType: "SUPPLEMENTARY", assessmentNumber: null })).toBe("COA511S_2024_Supplementary.pdf");
  });
});
