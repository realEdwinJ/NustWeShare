import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export type SearchModule = { id: string; code: string; name: string; paperCount: number; departmentName: string | null; facultyCode: string | null };
export type SearchProgramme = { code: string; name: string; level: string; href: string };

function escapeLike(q: string) {
  return q.replace(/[%_\\]/g, "\\$&");
}

/**
 * Ranked module + programme search (Spec 37): exact code > code prefix > name prefix > word match > fuzzy (pg_trgm).
 * Multi-word queries match every word ("data struct" → "Data Structures").
 */
export async function searchCatalog(raw: string, opts: { moduleLimit?: number; programmeLimit?: number; onlyWithPapers?: boolean } = {}) {
  const q = raw.trim().slice(0, 100);
  if (!q) return { modules: [] as SearchModule[], programmes: [] as SearchProgramme[] };
  const db = getDb();
  const compact = q.replace(/\s+/g, "");
  const like = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(compact)}%`;
  const words = q.split(/\s+/).filter(Boolean).slice(0, 6).map((w) => `%${escapeLike(w)}%`);
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
