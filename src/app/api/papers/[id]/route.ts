import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { modules } from "@/db/schema/modules";
import { paperFiles } from "@/db/schema/paper_files";
import { getCanonicalFile } from "@/lib/papers/canonical";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getDb();
    const pap = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
    if (pap.length === 0) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Paper not found." } }, { status: 404 });
    const paper = pap[0];
    if (paper.status === "deleted") {
      return NextResponse.json({ error: { code: "PAPER_DELETED", message: "This paper is no longer available." } }, { status: 410 });
    }
    const mod = await db.select().from(modules).where(eq(modules.id, paper.moduleId)).limit(1);
    const canonical = await getCanonicalFile(paper.id);

    return NextResponse.json(
      {
        data: {
          id: paper.id,
          module: mod[0] ? { code: mod[0].code, name: mod[0].name } : null,
          academicYear: paper.academicYear,
          semester: paper.semester,
          assessmentType: paper.assessmentType,
          assessmentNumber: paper.assessmentNumber,
          views: paper.views,
          downloads: paper.downloads,
          createdAt: paper.createdAt,
          canonicalFile: canonical ? { id: canonical.id, r2ObjectKey: canonical.r2ObjectKey, fileSize: canonical.fileSize, pageCount: canonical.pageCount } : null,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  } catch (e) {
    console.error("[api/papers/[id]]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not load paper." } }, { status: 500 });
  }
}
