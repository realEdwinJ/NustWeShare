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
    // Build download filename and construct direct file URL with disposition instead of relying on redirect headers (which browsers ignore)
    const filename = buildDownloadFilename({
      moduleCode: mod[0]?.code ?? "PAPER",
      academicYear: paper.academicYear,
      assessmentType: paper.assessmentType,
      assessmentNumber: paper.assessmentNumber,
    });

    // For both R2 and Local, serve via /api/files with disposition query — ensures correct filename without relying on X- headers
    // Use per-segment encoding
    const encodedKey = canonical.r2ObjectKey.split("/").map((s: string) => encodeURIComponent(s)).join("/");
    const fileUrl = `/api/files/${encodedKey}?download=${encodeURIComponent(filename)}`;

    const res = NextResponse.redirect(fileUrl, 302);
    if (!already) res.cookies.set(cookieName, "1", { httpOnly: true, sameSite: "lax", maxAge: 3600, path: "/" });
    // Don't use X-Download-Filename — use Location query param instead; files route can respect download param
    return res;
  } catch (e) {
    console.error("[api/papers/[id]/download]", e);
    return NextResponse.json({ error: { code: "DB_ERROR", message: "Could not prepare download." } }, { status: 500 });
  }
}
