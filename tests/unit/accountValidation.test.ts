import { describe, it, expect } from "vitest";
import { validateDisplayName, validateUsername, weakPinReason } from "@/lib/account/validation";
import { assessmentLabel, downloadFilename, formatBytes } from "@/lib/papers/format";

describe("account validation", () => {
  it("rejects weak PINs", () => {
    expect(weakPinReason("11111")).toBeTruthy();
    expect(weakPinReason("12345")).toBeTruthy();
    expect(weakPinReason("54321")).toBeTruthy();
    expect(weakPinReason("1234")).toBeTruthy();
    expect(weakPinReason("48261")).toBeNull();
  });
  it("validates usernames and display names", () => {
    expect(validateUsername("ok_name1")).toBe("ok_name1");
    expect(validateUsername("no")).toBeNull();
    expect(validateUsername("bad name")).toBeNull();
    expect(validateDisplayName("  Tjiku   K ")).toBe("Tjiku K");
    expect(validateDisplayName("")).toBeNull();
  });
});

describe("paper formatting", () => {
  it("labels and filenames", () => {
    expect(assessmentLabel("TEST", 2)).toBe("Test 2");
    expect(assessmentLabel("EXAM", 3)).toBe("Exam");
    expect(downloadFilename({ moduleCode: "mci511s", academicYear: 2024, semester: 1, assessmentType: "SUPPLEMENTARY", assessmentNumber: null })).toBe("MCI511S_2024_S1_Supplementary.pdf");
    expect(formatBytes(2_500_000)).toBe("2.4 MB");
  });
});

import { formatDate as fmtDate } from "@/lib/papers/format";
describe("date formatting", () => {
  it("formats in Namibian time without throwing", () => {
    expect(fmtDate("2026-01-31T23:30:00Z")).toBe("1 Feb 2026"); // UTC+2
    expect(() => new Date().toLocaleString("en-GB", { timeZone: "Africa/Windhoek", dateStyle: "medium", timeStyle: "short" })).not.toThrow();
  });
});
