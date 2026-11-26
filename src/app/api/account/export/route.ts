import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookmarks } from "@/db/schema/bookmarks";
import { getUserFromRequest } from "@/lib/auth/current";
import { listUserUploads } from "@/lib/papers/queries";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/account/export — everything we store about you, as JSON (PIN hash excluded)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError("UNAUTHORIZED", "You need to be logged in.", 401);
  const db = getDb();
  const uploads = await listUserUploads(user.id, { includeHidden: true });
  const saved = await db.select().from(bookmarks).where(eq(bookmarks.userId, user.id));
  const { sessionVersion: _sv, ...profile } = user;
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile,
      uploads: uploads.map((u) => ({
        paperId: u.id,
        module: u.moduleCode,
        year: u.academicYear,
        semester: u.semester,
        type: u.assessmentType,
        number: u.assessmentNumber,
        originalFilename: u.originalFilename,
        uploadedAt: u.uploadedAt,
        shownAsAnonymous: u.hideUploader,
        status: u.status,
      })),
      bookmarks: saved.map((b) => ({ paperId: b.paperId, moduleId: b.moduleId, createdAt: b.createdAt })),
    },
    null,
    2
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nustweshare-${user.username}-export.json"`,
      "Cache-Control": "no-store",
    },
  });
}
