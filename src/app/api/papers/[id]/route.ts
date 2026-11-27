import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { modules } from "@/db/schema/modules";
import { getPaperDetail } from "@/lib/papers/queries";
import { getUserFromRequest } from "@/lib/auth/current";
import { identityTaken, removePaper, withdrawMainFile } from "@/lib/papers/moderation";
import { ASSESSMENT_TYPES, typeHasNumber } from "@/lib/papers/format";
import { isUuid, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Paper not found.", 404);
  try {
    const d = await getPaperDetail(id);
    if (!d) return jsonError("NOT_FOUND", "Paper not found.", 404);
    if (d.paper.status === "deleted") return jsonError("PAPER_DELETED", "This paper is no longer available.", 410);
    return NextResponse.json(
      {
        data: {
          id: d.paper.id,
          module: d.module ? { code: d.module.code, name: d.module.name } : null,
          academicYear: d.paper.academicYear,
          semester: d.paper.semester,
          assessmentType: d.paper.assessmentType,
          assessmentNumber: d.paper.assessmentNumber,
          views: d.paper.views,
          downloads: d.paper.downloads,
          createdAt: d.paper.createdAt,
          file: d.canonical ? { size: d.canonical.fileSize, pages: d.canonical.pageCount, url: `/api/papers/${id}/file` } : null,
          downloadUrl: `/api/papers/${id}/download`,
          uploader: d.uploader ? { username: d.uploader.username, displayName: d.uploader.displayName } : null,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  } catch (e) {
    console.error("[api/papers/[id]]", e);
    return jsonError("DB_ERROR", "Could not load paper.", 500);
  }
}

async function authorize(req: NextRequest, id: string) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: jsonError("UNAUTHORIZED", "You need to be logged in.", 401) };
  const d = await getPaperDetail(id);
  if (!d || d.paper.status === "deleted") return { error: jsonError("NOT_FOUND", "Paper not found.", 404) };
  const isOwner = d.uploaderIds.length > 0 && d.uploaderIds.every((u) => u === user.id);
  if (!isOwner && user.role !== "admin") return { error: jsonError("FORBIDDEN", "Only the uploader or a moderator can change this paper.", 403) };
  return { user, d };
}

// PATCH /api/papers/[id] — fix metadata (year, semester, type, number, module)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Paper not found.", 404);
  const auth = await authorize(req, id);
  if ("error" in auth) return auth.error;
  const body = await readJson(req);
  if (!body) return jsonError("INVALID_REQUEST", "Invalid request.");
  const cur = auth.d.paper;
  const db = getDb();

  let moduleId = cur.moduleId;
  if (body.moduleCode) {
    const m = await db.select({ id: modules.id }).from(modules).where(eq(modules.code, String(body.moduleCode).toUpperCase())).limit(1);
    if (!m[0]) return jsonError("MODULE_NOT_FOUND", "We couldn't find that module.", 404);
    moduleId = m[0].id;
  }
  const academicYear = body.academicYear != null ? Number(body.academicYear) : cur.academicYear;
  const semester = body.semester != null ? Number(body.semester) : cur.semester;
  const assessmentType = body.assessmentType != null ? String(body.assessmentType).toUpperCase() : cur.assessmentType;
  let assessmentNumber = body.assessmentNumber !== undefined ? (body.assessmentNumber === null || body.assessmentNumber === "" ? null : Number(body.assessmentNumber)) : cur.assessmentNumber;
  if (!Number.isInteger(academicYear) || academicYear < 2000 || academicYear > new Date().getFullYear()) return jsonError("VALIDATION_ERROR", "Invalid year.");
  if (semester !== 1 && semester !== 2) return jsonError("VALIDATION_ERROR", "Semester must be 1 or 2.");
  if (!(ASSESSMENT_TYPES as readonly string[]).includes(assessmentType)) return jsonError("VALIDATION_ERROR", "Invalid assessment type.");
  if (!typeHasNumber(assessmentType)) assessmentNumber = null;
  if (assessmentNumber !== null && (!Number.isInteger(assessmentNumber) || assessmentNumber < 1 || assessmentNumber > 20)) return jsonError("VALIDATION_ERROR", "Number must be 1–20.");

  const clash = await identityTaken({ id, moduleId, academicYear, semester, assessmentType, assessmentNumber });
  if (clash) return jsonError("DUPLICATE_IDENTITY", "Another paper already has exactly these details.", 409, { paperId: clash });

  await db
    .update(papers)
    .set({ moduleId, academicYear, semester, assessmentType: assessmentType as any, assessmentNumber, updatedAt: new Date() })
    .where(eq(papers.id, id));
  return NextResponse.json({ data: { ok: true } });
}

// DELETE /api/papers/[id] — uploader removes their own paper (or a moderator removes any)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Paper not found.", 404);
  const auth = await authorize(req, id);
  if ("error" in auth) return auth.error;
  // Moderators take the whole paper down. An uploader withdraws only their own file: if other students
  // uploaded backup copies, the best one takes over and the paper stays available.
  const isOwner = auth.d.uploaderIds.includes(auth.user.id);
  if (auth.user.role === "admin" && !isOwner) {
    await removePaper(id, "moderator");
    return NextResponse.json({ data: { ok: true, outcome: "removed" } });
  }
  const outcome = await withdrawMainFile(id);
  return NextResponse.json({ data: { ok: true, outcome } });
}
