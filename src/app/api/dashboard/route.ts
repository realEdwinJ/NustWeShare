import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/current";
import { listUserUploads } from "@/lib/papers/queries";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/dashboard — my contribution summary (Spec 23)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError("UNAUTHORIZED", "You need to be logged in.", 401);
  try {
    const uploads = await listUserUploads(user.id, { includeHidden: true });
    const active = uploads.filter((u) => u.status === "active");
    return NextResponse.json({
      data: {
        total: uploads.length,
        active: active.length,
        removed: uploads.length - active.length,
        downloads: active.reduce((s, u) => s + u.downloads, 0),
        views: active.reduce((s, u) => s + u.views, 0),
        recent: uploads.slice(0, 5).map((u) => ({ id: u.id, moduleCode: u.moduleCode, academicYear: u.academicYear, assessmentType: u.assessmentType, assessmentNumber: u.assessmentNumber, createdAt: u.uploadedAt })),
      },
    });
  } catch (e) {
    console.error("[api/dashboard]", e);
    return jsonError("DB_ERROR", "Could not load dashboard.", 500);
  }
}
