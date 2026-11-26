import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { normalizeUsername } from "@/lib/auth/hash";
import { jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/admin/bootstrap  (header x-admin-secret: ADMIN_SECRET) { username, role: "admin"|"user" }
// Grants or revokes moderator rights. Only usable by whoever holds ADMIN_SECRET.
export async function POST(req: NextRequest) {
  const { getEnv } = await import("@/lib/env");
  const secret = getEnv().ADMIN_SECRET;
  const given = req.headers.get("x-admin-secret") || "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return jsonError("FORBIDDEN", "Forbidden.", 403);
  }
  const body = await readJson(req);
  const role = body?.role === "user" ? "user" : "admin";
  const db = getDb();
  const r = await db
    .update(users)
    .set({ role })
    .where(eq(users.normalizedUsername, normalizeUsername(String(body?.username || ""))))
    .returning({ username: users.username, role: users.role });
  if (!r.length) return jsonError("NOT_FOUND", "User not found.", 404);
  return NextResponse.json({ data: r[0] });
}
