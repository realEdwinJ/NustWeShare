import { describe, it, expect } from "vitest";
import { parseFilename, parseSemester } from "@/lib/filename";

describe("semester from filename", () => {
  it.each([
    ["MCI511S_2024_Test_1.pdf", undefined], // module code "…S" + year "2…" must not read as S2
    ["MCI511S_2024_S1_Exam.pdf", 1], // our own download naming
    ["MCI511S_2024_S2_Exam.pdf", 2],
    ["MCI511S_2024_EXAM_S1.pdf", 1],
    ["ELC511S 2023 Sem 2 Test.pdf", 2],
    ["elc511s-2023-semester-1-exam.pdf", 1],
    ["PLU411S_second_semester_2022.pdf", 2],
    ["PLU411S_1st_sem.pdf", 1],
    ["S2_DSA521S_2020.pdf", 2],
    ["COA511S_2025.pdf", undefined],
    ["ABC521S_2021_supp.pdf", undefined],
  ])("%s → %s", (name, expected) => {
    expect(parseSemester(name)).toBe(expected);
    expect(parseFilename(name).semester).toBe(expected);
  });
});
