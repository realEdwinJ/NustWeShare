import { and, asc, count, desc, eq, inArray, isNotNull, sql, sum } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { paperFiles } from "@/db/schema/paper_files";
import { modules } from "@/db/schema/modules";
import { departments } from "@/db/schema/departments";
import { schools } from "@/db/schema/schools";
import { faculties } from "@/db/schema/faculties";
import { users } from "@/db/schema/users";
import { reports } from "@/db/schema/reports";
import { programmeModules } from "@/db/schema/programme_modules";
import { programmes } from "@/db/schema/programmes";
import { TYPE_ORDER, type AssessmentType } from "./format";

export type PaperListItem = {
  id: string;
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  academicYear: number;
  semester: number;
  assessmentType: AssessmentType;
  assessmentNumber: number | null;
  views: number;
  downloads: number;
  createdAt: Date;
  fileSize: number | null;
  pageCount: number | null;
  hasFile: boolean;
  uploader: { username: string; displayName: string; avatarColor: string; avatarEmoji: string | null } | null;
};

const paperSelect = {
  id: papers.id,
  moduleId: papers.moduleId,
  moduleCode: modules.code,
  moduleName: modules.name,
  academicYear: papers.academicYear,
  semester: papers.semester,
  assessmentType: papers.assessmentType,
  assessmentNumber: papers.assessmentNumber,
  views: papers.views,
  downloads: papers.downloads,
  createdAt: papers.createdAt,
  fileSize: paperFiles.fileSize,
  pageCount: paperFiles.pageCount,
  fileId: paperFiles.id,
  hideUploader: paperFiles.hideUploader,
  uUsername: users.username,
  uDisplayName: users.displayName,
  uAvatarColor: users.avatarColor,
  uAvatarEmoji: users.avatarEmoji,
  uPublic: users.publicProfile,
};

type RawRow = {
  [K in keyof typeof paperSelect]: any;
};

function toItem(r: RawRow): PaperListItem {
  const showUploader = r.uUsername && !r.hideUploader && r.uPublic;
  return {
    id: r.id,
    moduleId: r.moduleId,
    moduleCode: r.moduleCode,
    moduleName: r.moduleName,
    academicYear: r.academicYear,
    semester: r.semester,
    assessmentType: r.assessmentType,
    assessmentNumber: r.assessmentNumber,
    views: r.views,
    downloads: r.downloads,
    createdAt: r.createdAt,
    fileSize: r.fileSize ?? null,
    pageCount: r.pageCount ?? null,
    hasFile: !!r.fileId,
    uploader: showUploader
      ? { username: r.uUsername, displayName: r.uDisplayName, avatarColor: r.uAvatarColor, avatarEmoji: r.uAvatarEmoji }
      : null,
  };
}

function dedupe(rows: RawRow[]): PaperListItem[] {
  const seen = new Set<string>();
  const out: PaperListItem[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(toItem(r));
  }
  return out;
}

function basePaperQuery() {
  const db = getDb();
  return db
    .select(paperSelect)
    .from(papers)
    .innerJoin(modules, eq(papers.moduleId, modules.id))
    .leftJoin(paperFiles, and(eq(paperFiles.paperId, papers.id), eq(paperFiles.isCanonical, true)))
    .leftJoin(users, eq(paperFiles.uploaderId, users.id));
}

export function sortPapers(list: PaperListItem[]) {
  return [...list].sort(
    (a, b) =>
      b.academicYear - a.academicYear ||
      a.semester - b.semester ||
      TYPE_ORDER[a.assessmentType] - TYPE_ORDER[b.assessmentType] ||
      (a.assessmentNumber ?? 0) - (b.assessmentNumber ?? 0)
  );
}

export async function listModulePapers(moduleId: string): Promise<PaperListItem[]> {
  const rows = await basePaperQuery().where(and(eq(papers.moduleId, moduleId), eq(papers.status, "active")));
  return sortPapers(dedupe(rows as RawRow[]));
}

export async function listRecentPapers(limit = 8): Promise<PaperListItem[]> {
  const rows = await basePaperQuery().where(eq(papers.status, "active")).orderBy(desc(papers.createdAt)).limit(limit * 2);
  return dedupe(rows as RawRow[]).slice(0, limit);
}

export async function listPapersByIds(ids: string[]): Promise<PaperListItem[]> {
  if (ids.length === 0) return [];
  const rows = await basePaperQuery().where(and(inArray(papers.id, ids), eq(papers.status, "active")));
  const byId = new Map(dedupe(rows as RawRow[]).map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as PaperListItem[];
}

export async function listUserUploads(userId: string, opts: { includeHidden: boolean }) {
  const db = getDb();
  const rows = await db
    .select({
      ...paperSelect,
      status: papers.status,
      originalFilename: paperFiles.originalFilename,
      uploadedAt: paperFiles.createdAt,
      isCanonical: paperFiles.isCanonical,
    })
    .from(paperFiles)
    .innerJoin(papers, eq(paperFiles.paperId, papers.id))
    .innerJoin(modules, eq(papers.moduleId, modules.id))
    .leftJoin(users, eq(paperFiles.uploaderId, users.id))
    .where(
      opts.includeHidden
        ? eq(paperFiles.uploaderId, userId)
        : and(eq(paperFiles.uploaderId, userId), eq(paperFiles.hideUploader, false), eq(papers.status, "active"))
    )
    .orderBy(desc(paperFiles.createdAt))
    .limit(500);
  return rows.map((r) => ({
    ...toItem(r as any),
    fileId: r.fileId as string,
    status: r.status,
    hideUploader: r.hideUploader as boolean,
    originalFilename: r.originalFilename as string,
    uploadedAt: r.uploadedAt as Date,
  }));
}

export async function getModuleByCode(code: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: modules.id,
      code: modules.code,
      name: modules.name,
      description: modules.description,
      departmentName: departments.name,
      departmentSlug: departments.slug,
      schoolName: schools.name,
      facultyCode: faculties.code,
      facultySlug: faculties.slug,
    })
    .from(modules)
    .leftJoin(departments, eq(modules.departmentId, departments.id))
    .leftJoin(schools, eq(departments.schoolId, schools.id))
    .leftJoin(faculties, eq(schools.facultyId, faculties.id))
    .where(eq(modules.code, code.toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function getModuleProgrammes(moduleId: string) {
  const db = getDb();
  const rows = await db
    .select({
      code: programmes.code,
      name: programmes.name,
      level: programmes.level,
      yearLevel: programmeModules.yearLevel,
      semester: programmeModules.semester,
      deptSlug: departments.slug,
      facultySlug: faculties.slug,
    })
    .from(programmeModules)
    .innerJoin(programmes, eq(programmeModules.programmeId, programmes.id))
    .innerJoin(departments, eq(programmes.departmentId, departments.id))
    .innerJoin(schools, eq(departments.schoolId, schools.id))
    .innerJoin(faculties, eq(schools.facultyId, faculties.id))
    .where(eq(programmeModules.moduleId, moduleId))
    .orderBy(asc(programmes.code));
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)));
}

export async function getPaperDetail(id: string) {
  const db = getDb();
  const pap = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
  const paper = pap[0];
  if (!paper) return null;
  const mod = await getModuleByIdWithFaculty(paper.moduleId);
  const files = await db
    .select({
      id: paperFiles.id,
      r2ObjectKey: paperFiles.r2ObjectKey,
      fileSize: paperFiles.fileSize,
      pageCount: paperFiles.pageCount,
      isCanonical: paperFiles.isCanonical,
      createdAt: paperFiles.createdAt,
      uploaderId: paperFiles.uploaderId,
      hideUploader: paperFiles.hideUploader,
      uUsername: users.username,
      uDisplayName: users.displayName,
      uAvatarColor: users.avatarColor,
      uAvatarEmoji: users.avatarEmoji,
      uPublic: users.publicProfile,
    })
    .from(paperFiles)
    .leftJoin(users, eq(paperFiles.uploaderId, users.id))
    .where(eq(paperFiles.paperId, id))
    .orderBy(asc(paperFiles.createdAt));
  const canonical = files.find((f) => f.isCanonical) ?? files[0] ?? null;
  const rc = await db.select({ c: count() }).from(reports).where(eq(reports.paperId, id));
  const uploader =
    canonical && canonical.uUsername && !canonical.hideUploader && canonical.uPublic
      ? { username: canonical.uUsername, displayName: canonical.uDisplayName!, avatarColor: canonical.uAvatarColor!, avatarEmoji: canonical.uAvatarEmoji }
      : null;
  return {
    paper,
    module: mod,
    canonical,
    fileCount: files.length,
    uploaderIds: files.map((f) => f.uploaderId).filter(Boolean) as string[],
    uploader,
    reportCount: Number(rc[0]?.c ?? 0),
  };
}

async function getModuleByIdWithFaculty(moduleId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: modules.id, code: modules.code, name: modules.name, facultySlug: faculties.slug, facultyCode: faculties.code })
    .from(modules)
    .leftJoin(departments, eq(modules.departmentId, departments.id))
    .leftJoin(schools, eq(departments.schoolId, schools.id))
    .leftJoin(faculties, eq(schools.facultyId, faculties.id))
    .where(eq(modules.id, moduleId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSiteStats() {
  const db = getDb();
  const [p] = await db
    .select({ papers: count(), downloads: sum(papers.downloads), views: sum(papers.views) })
    .from(papers)
    .where(eq(papers.status, "active"));
  const [m] = await db.select({ c: count() }).from(modules);
  const [covered] = await db
    .select({ c: sql<number>`count(distinct ${papers.moduleId})` })
    .from(papers)
    .where(eq(papers.status, "active"));
  const [contributors] = await db
    .select({ c: sql<number>`count(distinct ${paperFiles.uploaderId})` })
    .from(paperFiles)
    .where(isNotNull(paperFiles.uploaderId));
  return {
    papers: Number(p?.papers ?? 0),
    downloads: Number(p?.downloads ?? 0),
    views: Number(p?.views ?? 0),
    modules: Number(m?.c ?? 0),
    modulesCovered: Number(covered?.c ?? 0),
    contributors: Number(contributors?.c ?? 0),
  };
}

export async function getPopularModules(limit = 6) {
  const db = getDb();
  return db
    .select({
      code: modules.code,
      name: modules.name,
      papers: count(papers.id),
      downloads: sql<number>`coalesce(sum(${papers.downloads}),0)`.mapWith(Number),
    })
    .from(papers)
    .innerJoin(modules, eq(papers.moduleId, modules.id))
    .where(eq(papers.status, "active"))
    .groupBy(modules.code, modules.name)
    .orderBy(desc(sql`coalesce(sum(${papers.downloads}),0) + count(${papers.id}) * 3`))
    .limit(limit);
}

export async function getPaperCountsForModules(moduleIds: string[]) {
  if (moduleIds.length === 0) return new Map<string, number>();
  const db = getDb();
  const rows = await db
    .select({ moduleId: papers.moduleId, c: count() })
    .from(papers)
    .where(and(inArray(papers.moduleId, moduleIds), eq(papers.status, "active")))
    .groupBy(papers.moduleId);
  return new Map(rows.map((r) => [r.moduleId, Number(r.c)]));
}

export type LeaderRow = { rank: number; username: string | null; displayName: string; avatarColor: string; avatarEmoji: string | null; papers: number; downloads: number; anonymous?: boolean };

/** Contributors ranked by active canonical uploads. Respects "show on leaderboard" and per-upload anonymity. */
export async function getLeaderboard(opts: { period?: "all" | "month" | "week"; limit?: number } = {}): Promise<{ rows: LeaderRow[]; anonymousPapers: number }> {
  const db = getDb();
  const since = opts.period === "week" ? sql`now() - interval '7 days'` : opts.period === "month" ? sql`now() - interval '30 days'` : null;
  const res = await db.execute(sql`
    SELECT u.username, u.display_name, u.avatar_color, u.avatar_emoji,
      count(*)::int AS papers, coalesce(sum(p.downloads),0)::int AS downloads
    FROM paper_files pf
    JOIN papers p ON p.id = pf.paper_id AND p.status = 'active'
    JOIN users u ON u.id = pf.uploader_id
    WHERE pf.is_canonical = true AND pf.hide_uploader = false AND u.show_on_leaderboard = true
      ${since ? sql`AND pf.created_at >= ${since}` : sql``}
    GROUP BY u.id
    ORDER BY papers DESC, downloads DESC, u.username ASC
    LIMIT ${opts.limit ?? 50}
  `);
  const anon = await db.execute(sql`
    SELECT count(*)::int AS c FROM paper_files pf
    JOIN papers p ON p.id = pf.paper_id AND p.status = 'active'
    LEFT JOIN users u ON u.id = pf.uploader_id
    WHERE pf.is_canonical = true AND (pf.uploader_id IS NULL OR pf.hide_uploader = true OR u.show_on_leaderboard = false)
      ${since ? sql`AND pf.created_at >= ${since}` : sql``}
  `);
  const rows: LeaderRow[] = (res.rows as any[]).map((r, i) => ({
    rank: i + 1,
    username: r.username,
    displayName: r.display_name,
    avatarColor: r.avatar_color,
    avatarEmoji: r.avatar_emoji,
    papers: Number(r.papers),
    downloads: Number(r.downloads),
  }));
  return { rows, anonymousPapers: Number((anon.rows as any[])[0]?.c ?? 0) };
}

export async function getFacultiesWithCounts() {
  const db = getDb();
  const res = await db.execute(sql`
    SELECT f.id, f.code, f.name, f.slug,
      (SELECT count(*) FROM schools s WHERE s.faculty_id = f.id)::int AS schools,
      (SELECT count(*) FROM departments d JOIN schools s ON s.id = d.school_id WHERE s.faculty_id = f.id)::int AS departments,
      (SELECT count(*) FROM programmes pr JOIN departments d ON d.id = pr.department_id JOIN schools s ON s.id = d.school_id WHERE s.faculty_id = f.id)::int AS programmes,
      (SELECT count(*) FROM papers p JOIN modules m ON m.id = p.module_id JOIN departments d ON d.id = m.department_id JOIN schools s ON s.id = d.school_id
         WHERE s.faculty_id = f.id AND p.status = 'active')::int AS papers
    FROM faculties f ORDER BY f.code
  `);
  return (res.rows as any[]).map((r) => ({
    id: r.id as string,
    code: r.code as string,
    name: r.name as string,
    slug: r.slug as string,
    schools: Number(r.schools),
    departments: Number(r.departments),
    programmes: Number(r.programmes),
    papers: Number(r.papers),
  }));
}

export async function getFollowedModules(userId: string) {
  const db = getDb();
  const res = await db.execute(sql`
    SELECT m.code, m.name,
      (SELECT count(*) FROM papers p WHERE p.module_id = m.id AND p.status = 'active')::int AS papers,
      (SELECT count(*) FROM papers p WHERE p.module_id = m.id AND p.status = 'active' AND p.created_at > b.created_at)::int AS new_since
    FROM bookmarks b JOIN modules m ON m.id = b.module_id
    WHERE b.user_id = ${userId}
    ORDER BY b.created_at DESC
  `);
  return (res.rows as any[]).map((r) => ({ code: r.code as string, name: r.name as string, papers: Number(r.papers), newSince: Number(r.new_since) }));
}
