import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { modules } from "@/db/schema/modules";
import { getCanonicalFile } from "@/lib/papers/canonical";
import { serveStoredFile } from "@/lib/r2/serve";
import { downloadFilename } from "@/lib/papers/format";
import { isUuid } from "@/lib/http";
import { handleMissingFile } from "@/lib/papers/moderation";

export const dynamic = "force-dynamic";

// GET /api/papers/[id]/file — inline PDF stream for the reader (Range-capable, no counters)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });
  try {
    const db = getDb();
    const rows = await db
      .select({ status: papers.status, academicYear: papers.academicYear, semester: papers.semester, assessmentType: papers.assessmentType, assessmentNumber: papers.assessmentNumber, moduleCode: modules.code })
      .from(papers)
      .innerJoin(modules, eq(papers.moduleId, modules.id))
      .where(eq(papers.id, id))
      .limit(1);
    const p = rows[0];
    if (!p) return new NextResponse("Not found", { status: 404 });
    if (p.status === "deleted") return new NextResponse("Gone", { status: 410 });
    if (p.status !== "active") return new NextResponse("Not found", { status: 404 });
    const file = await getCanonicalFile(id);
    if (!file) return new NextResponse("Not found", { status: 404 });
    const res = await serveStoredFile(req, file.r2ObjectKey, { disposition: "inline", filename: downloadFilename(p), cacheControl: "public, max-age=3600" });
    if (res.status === 404) await handleMissingFile(id).catch(() => {});
    return res;
  } catch (e) {
    console.error("[api/papers/[id]/file]", e);
    return new NextResponse("Storage error", { status: 500 });
  }
}
