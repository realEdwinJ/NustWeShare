import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { getUserFromRequest } from "@/lib/auth/current";
import { verifyPin } from "@/lib/auth/hash";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/auth/recovery";
import { rateLimitShared } from "@/lib/security/rateLimit";
import { jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/account/recovery { pin } — issue a new recovery code (the old one stops working)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError("UNAUTHORIZED", "You need to be logged in.", 401);
  const rl = await rateLimitShared({ key: `recovery-gen:${user.id}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) return jsonError("RATE_LIMITED", "Too many attempts. Try again later.", 429);
  const body = await readJson(req);
  const db = getDb();
  const [row] = await db.select({ pinHash: users.pinHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !(await verifyPin(String(body?.pin ?? ""), row.pinHash))) return jsonError("INVALID_CREDENTIALS", "PIN is incorrect.", 401);
  const code = generateRecoveryCode();
  await db.update(users).set({ recoveryHash: await hashRecoveryCode(code), recoveryCreatedAt: new Date() }).where(eq(users.id, user.id));
  return NextResponse.json({ data: { recoveryCode: code } }, { headers: { "Cache-Control": "no-store" } });
}
