import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paperFiles } from "@/db/schema/paper_files";
import { getUserFromRequest } from "@/lib/auth/current";
import { serveStoredFile } from "@/lib/r2/serve";
import { isUuid } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/admin/files/[fileId] — moderators preview any specific file (e.g. a backup before promoting it)
export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!isUuid(fileId)) return new NextResponse("Not found", { status: 404 });
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") return new NextResponse("Forbidden", { status: 403 });
  const [f] = await getDb().select({ key: paperFiles.r2ObjectKey, name: paperFiles.originalFilename }).from(paperFiles).where(eq(paperFiles.id, fileId)).limit(1);
  if (!f) return new NextResponse("Not found", { status: 404 });
  return serveStoredFile(req, f.key, { disposition: "inline", filename: f.name, cacheControl: "private, no-store" });
}
