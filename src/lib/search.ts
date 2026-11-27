import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { hasPaperFilters, parseSearchIntent } from "@/lib/searchIntent";

export type SearchModule = { id: string; code: string; name: string; paperCount: number; departmentName: string | null; facultyCode: string | null };
export type SearchProgramme = { code: string; name: string; level: string; href: string };

const ABBREVIATIONS: Record<string, string> = {
  maths: "mathemat", math: "mathemat", calc: "calculus", stats: "statist", stat: "statist", prob: "probabil",
  comp: "comput", cs: "computer science", prog: "program", progr: "program", algo: "algorithm", algos: "algorithm",
  db: "database", dbs: "database", ds: "data struct", oop: "object", os: "operating", net: "network", nets: "network",
  sec: "securit", cyber: "cyber", ai: "artificial", ml: "machine learning", eng: "engineer", engl: "english",
  elec: "electr", mech: "mechan", civ: "civil", phys: "physic", chem: "chemi", bio: "biolog", acc: "account",
  econ: "econom", mgmt: "manag", comm: "communicat", info: "informat", it: "information technology",
};

function escapeLike(q: string) {
  return q.replace(/[%_\\]/g, "\\$&");
}

/**
 * Ranked module + programme search (Spec 37): exact code > code prefix > name prefix > word match > fuzzy (pg_trgm).
 * Multi-word queries match every word ("data struct" → "Data Structures").
 */
export type SearchPaper = { id: string; moduleCode: string; academicYear: number; semester: number; assessmentType: string; assessmentNumber: number | null; pageCount: number | null };

/**
 * Understands "MCI511S 2024 exam"-style queries: modules are matched on the code (or the remaining words),
 * and when the query names a year/type/semester the matching papers are returned directly.
 */
export async function searchCatalog(raw: string, opts: { moduleLimit?: number; programmeLimit?: number; onlyWithPapers?: boolean } = {}) {
  const intent = parseSearchIntent(raw.slice(0, 100));
  const text = intent.code ?? (intent.rest || (hasPaperFilters(intent) ? "" : raw));
  const base = text ? await searchText(text, opts) : { modules: [] as SearchModule[], programmes: [] as SearchProgramme[] };
  let papers: SearchPaper[] = [];
  const filterOnly = hasPaperFilters(intent) && !text;
  if (hasPaperFilters(intent) && (base.modules.length || filterOnly)) {
    const target = filterOnly ? [] : intent.code ? base.modules.filter((m) => m.code === intent.code) : base.modules.slice(0, 3);
    if (target.length || filterOnly) {
      const db = getDb();
      const res = await db.execute(sql`
        SELECT p.id, m.code AS module_code, p.academic_year, p.semester, p.assessment_type, p.assessment_number, pf.page_count
        FROM papers p JOIN modules m ON m.id = p.module_id
        LEFT JOIN paper_files pf ON pf.paper_id = p.id AND pf.is_canonical
        WHERE p.status = 'active'
          ${filterOnly ? sql`` : sql`AND p.module_id IN (${sql.join(target.map((m) => sql`${m.id}`), sql`, `)})`}
          ${intent.year ? sql`AND p.academic_year = ${intent.year}` : sql``}
          ${intent.type ? sql`AND p.assessment_type = ${intent.type}` : sql``}
          ${intent.number ? sql`AND p.assessment_number = ${intent.number}` : sql``}
          ${intent.semester ? sql`AND p.semester = ${intent.semester}` : sql``}
        ORDER BY ${filterOnly ? sql`p.created_at DESC` : sql`p.academic_year DESC, p.semester, p.assessment_type, p.assessment_number NULLS FIRST`}
        LIMIT 24`);
      papers = (res.rows as any[]).map((r) => ({
        id: r.id, moduleCode: r.module_code, academicYear: Number(r.academic_year), semester: Number(r.semester),
        assessmentType: r.assessment_type, assessmentNumber: r.assessment_number == null ? null : Number(r.assessment_number), pageCount: r.page_count == null ? null : Number(r.page_count),
      }));
    }
  }
  return { ...base, papers, intent };
}

async function searchText(raw: string, opts: { moduleLimit?: number; programmeLimit?: number; onlyWithPapers?: boolean }) {
  const q = raw.trim().slice(0, 100);
  if (!q) return { modules: [] as SearchModule[], programmes: [] as SearchProgramme[] };
  const db = getDb();
  const compact = q.replace(/\s+/g, "");
  const like = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(compact)}%`;
  // Student shorthand → stem that appears in official module names ("maths" isn't a substring of "Mathematics")
  const words = q
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => `%${escapeLike(ABBREVIATIONS[w.toLowerCase()] ?? w)}%`);
  const wordCond = sql.join(words.map((w) => sql`m.name ILIKE ${w} ESCAPE '\\'`), sql` AND `);
  const moduleLimit = opts.moduleLimit ?? 20;

  const modRows = await db.execute(sql`
    SELECT m.id, m.code, m.name, d.name AS department_name, f.code AS faculty_code,
      (SELECT count(*) FROM papers p WHERE p.module_id = m.id AND p.status = 'active')::int AS paper_count,
      CASE
        WHEN upper(m.code) = upper(${compact}) THEN 100
        WHEN m.code ILIKE ${prefix} ESCAPE '\\' THEN 80
        WHEN m.name ILIKE ${`${escapeLike(q)}%`} ESCAPE '\\' THEN 60
        WHEN m.code ILIKE ${like} ESCAPE '\\' THEN 50
        WHEN (${wordCond}) THEN 40
        ELSE 10
      END AS rank
    FROM modules m
    LEFT JOIN departments d ON d.id = m.department_id
    LEFT JOIN schools s ON s.id = d.school_id
    LEFT JOIN faculties f ON f.id = s.faculty_id
    WHERE m.code ILIKE ${like} ESCAPE '\\' OR m.code ILIKE ${prefix} ESCAPE '\\' OR (${wordCond})
      OR (length(${q}) >= 4 AND similarity(m.name, ${q}) > 0.3)
    ORDER BY rank DESC, paper_count DESC, m.code ASC
    LIMIT ${moduleLimit}
  `).catch(async (e) => {
    // pg_trgm unavailable → retry without similarity()
    if (!String(e?.message ?? e).includes("similarity")) throw e;
    return db.execute(sql`
      SELECT m.id, m.code, m.name, NULL AS department_name, NULL AS faculty_code,
        (SELECT count(*) FROM papers p WHERE p.module_id = m.id AND p.status = 'active')::int AS paper_count, 0 AS rank
      FROM modules m WHERE m.code ILIKE ${like} ESCAPE '\\' OR (${wordCond}) ORDER BY m.code LIMIT ${moduleLimit}`);
  });

  const progRows = await db.execute(sql`
    SELECT p.code, p.name, p.level, d.slug AS dept_slug, f.slug AS faculty_slug
    FROM programmes p
    JOIN departments d ON d.id = p.department_id
    JOIN schools s ON s.id = d.school_id
    JOIN faculties f ON f.id = s.faculty_id
    WHERE p.code ILIKE ${like} ESCAPE '\\' OR p.name ILIKE ${like} ESCAPE '\\'
    ORDER BY (upper(p.code) = upper(${compact})) DESC, p.name ASC
    LIMIT ${opts.programmeLimit ?? 8}
  `);

  let modules: SearchModule[] = (modRows.rows as any[]).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    paperCount: Number(r.paper_count ?? 0),
    departmentName: r.department_name ?? null,
    facultyCode: r.faculty_code ?? null,
  }));
  if (opts.onlyWithPapers) modules = modules.filter((m) => m.paperCount > 0);
  const seen = new Set<string>();
  const programmes: SearchProgramme[] = (progRows.rows as any[])
    .filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)))
    .map((r) => ({ code: r.code, name: r.name, level: r.level, href: `/browse/${r.faculty_slug}/${r.dept_slug}/${String(r.code).toLowerCase()}` }));
  return { modules, programmes };
}
