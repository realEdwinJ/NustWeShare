import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paperFiles } from "@/db/schema/paper_files";
import { getUserFromRequest } from "@/lib/auth/current";
import { setCanonical } from "@/lib/papers/canonical";
import { storedFileExists } from "@/lib/papers/moderation";
import { getStorage } from "@/lib/r2/client";
import { isUuid, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/admin/backups/[fileId] { action: "promote" | "delete" }
// promote: make this copy the served file (e.g. a clearer scan); the previous file becomes a backup.
export async function POST(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!isUuid(fileId)) return jsonError("NOT_FOUND", "File not found.", 404);
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") return jsonError("FORBIDDEN", "Moderators only.", 403);
  const body = await readJson(req);
  const db = getDb();
  const [f] = await db.select().from(paperFiles).where(eq(paperFiles.id, fileId)).limit(1);
  if (!f) return jsonError("NOT_FOUND", "File not found.", 404);
  if (body?.action === "promote") {
    if (!(await storedFileExists(f.r2ObjectKey))) {
      return jsonError("FILE_MISSING", "This backup's file is missing from storage, so it can't become the main file.", 409);
    }
    await setCanonical(f.paperId, f.id);
    return NextResponse.json({ data: { ok: true } });
  }
  if (body?.action === "delete") {
    if (f.isCanonical) return jsonError("IS_PRIMARY", "Can't delete the served file here; remove the paper instead.", 409);
    await db.delete(paperFiles).where(eq(paperFiles.id, f.id));
    await getStorage().delete(f.r2ObjectKey).catch(() => {});
    return NextResponse.json({ data: { ok: true } });
  }
  return jsonError("VALIDATION_ERROR", "Unknown action.");
}
