import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, type UserPreferences } from "@/db/schema/users";
import { programmes } from "@/db/schema/programmes";
import { getUserFromRequest } from "@/lib/auth/current";
import { verifyPin, normalizeUsername } from "@/lib/auth/hash";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { jsonError, readJson } from "@/lib/http";
import { AVATAR_COLORS, RESERVED_USERNAMES, validateDisplayName, validateUsername } from "@/lib/account/validation";

export const dynamic = "force-dynamic";

const PREF_ENUMS: Record<string, readonly string[]> = {
  theme: ["system", "light", "dark"],
  viewerZoom: ["fit-width", "fit-page", "100"],
  viewerMode: ["scroll", "single"],
  downloadNaming: ["clean", "original"],
  zipGrouping: ["flat", "by-year"],
};
const PREF_BOOLS = ["reduceMotion", "openPdfInNewTab"];

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError("UNAUTHORIZED", "You need to be logged in.", 401);
  let programme: { code: string; name: string } | null = null;
  if (user.programmeId) {
    const db = getDb();
    const p = await db.select({ code: programmes.code, name: programmes.name }).from(programmes).where(eq(programmes.id, user.programmeId)).limit(1);
    programme = p[0] ?? null;
  }
  const { sessionVersion: _sv, ...safe } = user;
  return NextResponse.json({ data: { ...safe, programme } }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError("UNAUTHORIZED", "You need to be logged in.", 401);
  const body = await readJson(req);
  if (!body || typeof body !== "object") return jsonError("INVALID_REQUEST", "Invalid request.");

  const patch: Partial<typeof users.$inferInsert> = {};
  const db = getDb();

  if ("displayName" in body) {
    const d = validateDisplayName(body.displayName);
    if (!d) return jsonError("VALIDATION_ERROR", "Display name must be 1–50 characters.");
    patch.displayName = d;
  }
  if ("username" in body && body.username !== user.username) {
    const u = validateUsername(body.username);
    if (!u) return jsonError("VALIDATION_ERROR", "Username must be 3–20 characters: letters, numbers or underscore.");
    const n = normalizeUsername(u);
    if (RESERVED_USERNAMES.has(n)) return jsonError("USERNAME_TAKEN", "That username is reserved.", 409);
    const clash = await db.select({ id: users.id }).from(users).where(and(eq(users.normalizedUsername, n), ne(users.id, user.id))).limit(1);
    if (clash.length) return jsonError("USERNAME_TAKEN", "That username is already taken.", 409);
    patch.username = u;
    patch.normalizedUsername = n;
  }
  if ("bio" in body) {
    const b = body.bio == null ? "" : String(body.bio).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();
    if (b.length > 280) return jsonError("VALIDATION_ERROR", "Bio must be 280 characters or fewer.");
    patch.bio = b || null;
  }
  if ("avatarColor" in body) {
    if (!AVATAR_COLORS.includes(body.avatarColor)) return jsonError("VALIDATION_ERROR", "Unknown avatar colour.");
    patch.avatarColor = body.avatarColor;
  }
  if ("avatarEmoji" in body) {
    const e = body.avatarEmoji == null ? "" : String(body.avatarEmoji).trim();
    if ([...e].length > 2 || e.length > 16 || /[a-zA-Z0-9<>]/.test(e)) return jsonError("VALIDATION_ERROR", "Pick a single emoji.");
    patch.avatarEmoji = e || null;
  }
  if ("programmeCode" in body) {
    if (!body.programmeCode) patch.programmeId = null;
    else {
      const p = await db.select({ id: programmes.id }).from(programmes).where(eq(programmes.code, String(body.programmeCode).toUpperCase())).limit(1);
      if (!p.length) return jsonError("VALIDATION_ERROR", "Programme not found.");
      patch.programmeId = p[0].id;
    }
  }
  if ("studyYear" in body) {
    const y = body.studyYear == null || body.studyYear === "" ? null : Number(body.studyYear);
    if (y !== null && (!Number.isInteger(y) || y < 1 || y > 6)) return jsonError("VALIDATION_ERROR", "Year of study must be 1–6.");
    patch.studyYear = y;
  }
  for (const k of ["publicProfile", "showOnLeaderboard", "uploadAnonymously"] as const) {
    if (k in body) {
      if (typeof body[k] !== "boolean") return jsonError("VALIDATION_ERROR", `${k} must be true or false.`);
      patch[k] = body[k];
    }
  }
  if ("preferences" in body) {
    const incoming = body.preferences ?? {};
    if (typeof incoming !== "object") return jsonError("VALIDATION_ERROR", "Invalid preferences.");
    const next: UserPreferences = { ...(user.preferences ?? {}) };
    for (const [k, v] of Object.entries(incoming)) {
      if (PREF_ENUMS[k]) {
        if (!PREF_ENUMS[k].includes(String(v))) return jsonError("VALIDATION_ERROR", `Invalid value for ${k}.`);
        (next as any)[k] = v;
      } else if (PREF_BOOLS.includes(k)) {
        if (typeof v !== "boolean") return jsonError("VALIDATION_ERROR", `Invalid value for ${k}.`);
        (next as any)[k] = v;
      }
    }
    patch.preferences = next;
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ data: { ok: true } });
  patch.updatedAt = new Date();
  try {
    await db.update(users).set(patch).where(eq(users.id, user.id));
  } catch (e: any) {
    const msg = String(e?.message || "") + String(e?.cause?.message || "");
    if (msg.includes("unique") || msg.includes("duplicate")) return jsonError("USERNAME_TAKEN", "That username is already taken.", 409);
    console.error("[api/account PATCH]", e);
    return jsonError("DB_ERROR", "Could not save changes.", 500);
  }
  return NextResponse.json({ data: { ok: true } });
}

// DELETE /api/account — requires PIN. Uploaded papers stay (they belong to the community) but become anonymous.
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError("UNAUTHORIZED", "You need to be logged in.", 401);
  const body = await readJson(req);
  const pin = String(body?.pin ?? "");
  if (String(body?.confirm ?? "").toLowerCase() !== user.username.toLowerCase()) {
    return jsonError("VALIDATION_ERROR", "Type your username to confirm.");
  }
  const db = getDb();
  const row = await db.select({ pinHash: users.pinHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row[0] || !(await verifyPin(pin, row[0].pinHash))) return jsonError("INVALID_CREDENTIALS", "PIN is incorrect.", 401);
  await db.delete(users).where(eq(users.id, user.id)); // FK: uploads set null, bookmarks cascade
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return res;
}
