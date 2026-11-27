import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { paperFiles } from "@/db/schema/paper_files";
import { modules } from "@/db/schema/modules";
import { users } from "@/db/schema/users";
import { getUserFromRequest } from "@/lib/auth/current";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/admin/backups — alternate copies waiting for a moderator decision
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") return jsonError("FORBIDDEN", "Moderators only.", 403);
  const rows = await getDb()
    .select({
      fileId: paperFiles.id,
      paperId: papers.id,
      moduleCode: modules.code,
      academicYear: papers.academicYear,
      semester: papers.semester,
      assessmentType: papers.assessmentType,
      assessmentNumber: papers.assessmentNumber,
      fileSize: paperFiles.fileSize,
      pageCount: paperFiles.pageCount,
      originalFilename: paperFiles.originalFilename,
      uploadedAt: paperFiles.createdAt,
      uploader: users.username,
    })
    .from(paperFiles)
    .innerJoin(papers, eq(paperFiles.paperId, papers.id))
    .innerJoin(modules, eq(papers.moduleId, modules.id))
    .leftJoin(users, eq(paperFiles.uploaderId, users.id))
    .where(and(eq(paperFiles.isCanonical, false), eq(papers.status, "active")))
    .orderBy(desc(paperFiles.createdAt))
    .limit(200);
  return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "no-store" } });
}
