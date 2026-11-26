import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { modules } from "@/db/schema/modules";
import { getCanonicalFile } from "@/lib/papers/canonical";
import { serveStoredFile } from "@/lib/r2/serve";
import { downloadFilename } from "@/lib/papers/format";
import { isUuid, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/papers/[id]/download — streams the PDF as an attachment with a clean filename (Spec 88).
// Counts one download per browser per hour; range continuations (resumed downloads) are not re-counted.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Paper not found.", 404);
  try {
    const db = getDb();
    const rows = await db
      .select({ status: papers.status, academicYear: papers.academicYear, semester: papers.semester, assessmentType: papers.assessmentType, assessmentNumber: papers.assessmentNumber, moduleCode: modules.code })
      .from(papers)
      .innerJoin(modules, eq(papers.moduleId, modules.id))
      .where(eq(papers.id, id))
      .limit(1);
    const p = rows[0];
    if (!p) return jsonError("NOT_FOUND", "Paper not found.", 404);
    if (p.status === "deleted") return jsonError("PAPER_DELETED", "This paper is no longer available.", 410);
    const file = await getCanonicalFile(id);
    if (!file) return jsonError("NOT_FOUND", "File not found.", 404);

    const cookieName = `dl_${id.slice(0, 8)}`;
    const range = req.headers.get("range");
    const isContinuation = !!range && !/^bytes=0-/.test(range);
    const already = req.cookies.get(cookieName)?.value === "1";
    const shouldCount = !already && !isContinuation;
    if (shouldCount) {
      await db.update(papers).set({ downloads: sql`${papers.downloads} + 1` }).where(eq(papers.id, id));
    }

    const name = req.nextUrl.searchParams.get("name") === "original" ? file.originalFilename : downloadFilename(p);
    const res = await serveStoredFile(req, file.r2ObjectKey, { disposition: "attachment", filename: name, cacheControl: "private, no-cache" });
    if (shouldCount && res.status < 300) {
      const out = new NextResponse(res.body, { status: res.status, headers: res.headers });
      out.cookies.set(cookieName, "1", { httpOnly: true, sameSite: "lax", maxAge: 3600, path: "/" });
      return out;
    }
    return res;
  } catch (e) {
    console.error("[api/papers/[id]/download]", e);
    return jsonError("DB_ERROR", "Could not prepare download.", 500);
  }
}
