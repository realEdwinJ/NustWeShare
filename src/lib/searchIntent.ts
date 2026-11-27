// Client-safe parser for search queries such as "MCI511S 2024 exam", "maths test 2 2023 s1".
import type { AssessmentType } from "@/lib/papers/format";

export type SearchIntent = {
  code?: string;
  year?: number;
  type?: AssessmentType;
  number?: number;
  semester?: 1 | 2;
  /** Remaining free text (module name words) */
  rest: string;
};

const TYPE_WORDS: Record<string, AssessmentType> = {
  exam: "EXAM", exams: "EXAM", final: "EXAM", finals: "EXAM",
  test: "TEST", tests: "TEST", supp: "SUPPLEMENTARY", supps: "SUPPLEMENTARY", supplementary: "SUPPLEMENTARY", sup: "SUPPLEMENTARY",
  quiz: "QUIZ", quizzes: "QUIZ", assignment: "ASSIGNMENT", assignments: "ASSIGNMENT", lab: "LAB", labs: "LAB", tutorial: "TUTORIAL", tutorials: "TUTORIAL", tut: "TUTORIAL",
};

export function parseSearchIntent(raw: string): SearchIntent {
  const intent: SearchIntent = { rest: "" };
  const rest: string[] = [];
  const tokens = raw.trim().split(/[\s,]+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const low = t.toLowerCase();
    if (!intent.code && /^[a-z]{2,4}\d{3,4}[a-z]?$/i.test(t)) intent.code = t.toUpperCase();
    else if (!intent.year && /^(19|20)\d{2}$/.test(t)) intent.year = Number(t);
    else if (!intent.semester && /^(s|sem|semester)[-_]?[12]$/i.test(t)) intent.semester = Number(t.slice(-1)) as 1 | 2;
    else if (!intent.semester && /^(sem|semester)$/i.test(t) && /^[12]$/.test(tokens[i + 1] ?? "")) intent.semester = Number(tokens[++i]) as 1 | 2;
    else if (!intent.type && TYPE_WORDS[low]) {
      intent.type = TYPE_WORDS[low];
      if (/^\d{1,2}$/.test(tokens[i + 1] ?? "") && intent.type !== "EXAM" && intent.type !== "SUPPLEMENTARY") intent.number = Number(tokens[++i]);
    } else if (!intent.type && /^(test|quiz|lab|tut)[-_]?\d{1,2}$/i.test(t)) {
      const m = /^([a-z]+)[-_]?(\d{1,2})$/i.exec(t)!;
      intent.type = TYPE_WORDS[m[1].toLowerCase()];
      intent.number = Number(m[2]);
    } else rest.push(t);
  }
  intent.rest = rest.join(" ");
  return intent;
}

export function hasPaperFilters(i: SearchIntent) {
  return !!(i.year || i.type || i.semester);
}

/** Module page URL with filters pre-applied. */
export function moduleHref(code: string, i?: Pick<SearchIntent, "year" | "type" | "semester">) {
  const p = new URLSearchParams();
  if (i?.year) p.set("year", String(i.year));
  if (i?.type) p.set("type", i.type);
  if (i?.semester) p.set("sem", String(i.semester));
  const qs = p.toString();
  return `/modules/${code.toLowerCase()}${qs ? `?${qs}` : ""}`;
}
