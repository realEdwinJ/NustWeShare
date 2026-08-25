import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import { modules } from "@/db/schema/modules";
import { getCanonicalFile } from "@/lib/papers/canonical";
import { getStorage } from "@/lib/r2/client";
import { buildDownloadFilename } from "@/lib/r2/keys";

export const dynamic = "force-dynamic";

// GET /api/papers/[id]/download — increment downloads (dedup), redirect to signed R2 URL with clean filename (Spec 88)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getDb();
    const pap = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
    if (pap.length === 0) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Paper not found." } }, { status: 404 });
    const paper = pap[0];
    if (paper.status === "deleted") return NextResponse.json({ error: { code: "PAPER_DELETED", message: "This paper is no longer available." } }, { status: 410 });

    const mod = await db.select().from(modules).where(eq(modules.id, paper.moduleId)).limit(1);
    const canonical = await getCanonicalFile(paper.id);
    if (!canonical) return NextResponse.json({ error: { code: "NOT_FOUND", message: "File not found." } }, { status: 404 });

    // Dedup downloads via cookie (Spec 42)
    const cookieName = `downloaded_${id}`;
    const already = req.cookies.get(cookieName)?.value === "1";
    if (!already) {
      await db.update(papers).set({ downloads: sql`${papers.downloads} + 1` }).where(eq(papers.id, id));
    }

    const storage = getStorage();
    const signedUrl = await storage.getSignedUrl(canonical.r2ObjectKey, 3600);

    // For LocalStorage dev, signedUrl is path to /api/files — we should redirect to it
    // For R2, it's a presigned S3 URL — redirect to it with clean filename via header? Instead redirect to signedUrl and let browser handle, but we want clean filename.
    // For R2, we can append response-content-disposition query param if using S3 presigned: but our LocalStorage just returns path, so we can set header via redirect.
    const filename = buildDownloadFilename({
      moduleCode: mod[0]?.code ?? "PAPER",
      academicYear: paper.academicYear,
      assessmentType: paper.assessmentType,
      assessmentNumber: paper.assessmentNumber,
    });

    // If storage is Local, we need to serve file via our own endpoint that sets Content-Disposition
    // For now, redirect to signedUrl and set cookie
    const res = NextResponse.redirect(signedUrl, 302);
    if (!already) res.cookies.set(cookieName, "1", { httpOnly: true, sameSite: "lax", maxAge: 3600, path: "/" });
    // Set header for clean filename where possible (for direct download via our files API, it will use this)
    res.headers.set("X-Download-Filename", filename);
    return res;
  } catch (e) {
    console.error("[api/papers/[id]/download]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not prepare download." } }, { status: 500 });
  }
}
