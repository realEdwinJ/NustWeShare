// Deterministic filename parsing per Spec 14 — regex only, no AI
// Suggests Year/Type/Module but NEVER authoritative, user can correct
export interface FilenameSuggestion {
  year?: number;
  assessmentType?: string;
  assessmentNumber?: number | null;
  moduleCode?: string;
  /** Only set when the filename says so explicitly (S1, Sem2, Semester 1, "second semester"). */
  semester?: 1 | 2;
  confidence: "high" | "medium" | "low";
}

const TYPE_MAP: Record<string, string> = {
  exam: "EXAM",
  test: "TEST",
  quiz: "QUIZ",
  assignment: "ASSIGNMENT",
  lab: "LAB",
  tutorial: "TUTORIAL",
  supplementary: "SUPPLEMENTARY",
  supp: "SUPPLEMENTARY",
};

export function parseFilename(filename: string): FilenameSuggestion {
  const lower = filename.toLowerCase();
  const base = lower.replace(/\.pdf$/i, "");
  let year: number | undefined;
  let assessmentType: string | undefined;
  let assessmentNumber: number | null | undefined;
  let moduleCode: string | undefined;
  let confidence: "high" | "medium" | "low" = "low";

  // Year: 20xx between 2000 and 2035
  const yearMatch = base.match(/(20[0-9]{2})/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 2000 && y <= 2035) year = y;
  }

  // Module code: e.g., ELC511S, MCI511S, COA511S — 3 letters + 3-4 digits + optional S
  // Use ([a-z]{2,4}\d{3,4}s?) without \b because _ is word char and breaks \b
  const modMatch = base.match(/([a-z]{2,4}\d{3,4}s?)/i);
  if (modMatch) {
    moduleCode = modMatch[1].toUpperCase();
    confidence = "medium";
  }

  // Type + number: test_1, quiz2, exam, supplementary
  for (const [key, norm] of Object.entries(TYPE_MAP)) {
    if (lower.includes(key)) {
      assessmentType = norm;
      // Look for number after type
      const numMatch = base.match(new RegExp(`${key}[\\s_-]*([0-9]{1,2})`, "i"));
      if (numMatch) {
        assessmentNumber = parseInt(numMatch[1], 10);
      } else if (norm === "EXAM" || norm === "SUPPLEMENTARY") {
        assessmentNumber = null;
      }
      if (year && norm) confidence = "high";
      break;
    }
  }

  if (assessmentType && assessmentType !== "EXAM" && assessmentType !== "SUPPLEMENTARY" && assessmentNumber === undefined) {
    assessmentNumber = null; // optional
  }

  return { year, assessmentType, assessmentNumber, moduleCode, semester: parseSemester(filename), confidence };
}

/**
 * Semester from an explicit token only. Module codes end in "S" and years start with "2", so "MCI511S_2024"
 * must NOT read as semester 2 — the token has to stand alone (S1, s2, Sem1, Sem-2, Semester 1, "second semester").
 */
export function parseSemester(filename: string): 1 | 2 | undefined {
  const base = filename.replace(/\.pdf$/i, "");
  const m = base.match(/(?:^|[_\s.\-()])(?:s|sem|semester)[_\s\-]?([12])(?=$|[_\s.\-()])/i);
  if (m) return Number(m[1]) as 1 | 2;
  if (/(?:^|[_\s\-])(first|1st)[_\s\-]?sem/i.test(base)) return 1;
  if (/(?:^|[_\s\-])(second|2nd)[_\s\-]?sem/i.test(base)) return 2;
  return undefined;
}
