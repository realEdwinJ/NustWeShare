// Client-safe display helpers for papers.
export const ASSESSMENT_TYPES = ["TEST", "EXAM", "SUPPLEMENTARY", "QUIZ", "ASSIGNMENT", "LAB", "TUTORIAL"] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const TYPE_LABEL: Record<AssessmentType, string> = {
  TEST: "Test",
  EXAM: "Exam",
  SUPPLEMENTARY: "Supplementary",
  QUIZ: "Quiz",
  ASSIGNMENT: "Assignment",
  LAB: "Lab",
  TUTORIAL: "Tutorial",
};

// Ordering inside a year: tests first, then exam, supplementary, the rest
export const TYPE_ORDER: Record<AssessmentType, number> = {
  TEST: 0, QUIZ: 1, ASSIGNMENT: 2, LAB: 3, TUTORIAL: 4, EXAM: 5, SUPPLEMENTARY: 6,
};

export function typeHasNumber(t: string | null | undefined) {
  return !!t && t !== "EXAM" && t !== "SUPPLEMENTARY";
}

export function assessmentLabel(type: string, num?: number | null) {
  const base = TYPE_LABEL[type as AssessmentType] ?? type;
  return num && typeHasNumber(type) ? `${base} ${num}` : base;
}

export function paperTitle(p: { moduleCode: string; academicYear: number; semester: number; assessmentType: string; assessmentNumber?: number | null }) {
  return `${p.moduleCode} · ${assessmentLabel(p.assessmentType, p.assessmentNumber)} · ${p.academicYear} S${p.semester}`;
}

export function downloadFilename(p: { moduleCode: string; academicYear: number; semester?: number | null; assessmentType: string; assessmentNumber?: number | null }) {
  const type = assessmentLabel(p.assessmentType, p.assessmentNumber).replace(/\s+/g, "_");
  const sem = p.semester ? `_S${p.semester}` : "";
  return `${p.moduleCode.toUpperCase()}_${p.academicYear}${sem}_${type}.pdf`;
}

export function formatBytes(n: number | null | undefined) {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function compactNumber(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function timeAgo(d: Date | string | number) {
  const date = new Date(d);
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Absolute date in Namibian time — identical on server and client (no hydration drift). */
export function formatDate(d: Date | string | number, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(d).toLocaleDateString("en-GB", { timeZone: "Africa/Windhoek", ...opts });
}
