import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, parseSessionToken } from "./session";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarColor: string;
  avatarEmoji: string | null;
  bio: string | null;
  programmeId: string | null;
  studyYear: number | null;
  publicProfile: boolean;
  showOnLeaderboard: boolean;
  uploadAnonymously: boolean;
  preferences: import("@/db/schema/users").UserPreferences;
  createdAt: Date;
  lastLoginAt: Date | null;
  pinChangedAt: Date | null;
  sessionVersion: number;
};

async function resolveToken(token: string | undefined): Promise<CurrentUser | null> {
  if (!token) return null;
  try {
    const { getEnv } = await import("@/lib/env");
    const session = parseSessionToken(token, getEnv().APP_SECRET);
    if (!session) return null;
    const { getDb } = await import("@/lib/db");
    const { users } = await import("@/db/schema/users");
    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        avatarColor: users.avatarColor,
        avatarEmoji: users.avatarEmoji,
        bio: users.bio,
        programmeId: users.programmeId,
        studyYear: users.studyYear,
        publicProfile: users.publicProfile,
        showOnLeaderboard: users.showOnLeaderboard,
        uploadAnonymously: users.uploadAnonymously,
        preferences: users.preferences,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        pinChangedAt: users.pinChangedAt,
        sessionVersion: users.sessionVersion,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    const user = rows[0];
    if (!user) return null;
    if ((user.sessionVersion ?? 0) !== session.version) return null; // logged out everywhere
    return { ...user, preferences: (user.preferences ?? {}) as CurrentUser["preferences"] };
  } catch (e) {
    console.error("[auth] resolve session failed", e instanceof Error ? e.message : e);
    return null;
  }
}

/** For route handlers. */
export async function getUserFromRequest(req: NextRequest): Promise<CurrentUser | null> {
  return resolveToken(req.cookies.get(SESSION_COOKIE)?.value);
}

/** For server components / server actions. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return resolveToken(store.get(SESSION_COOKIE)?.value);
}
