import Link from "next/link";
import { cookies } from "next/headers";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  try {
    const { verifySessionToken } = await import("@/lib/auth/session");
    const { getEnv } = await import("@/lib/env");
    const env = getEnv();
    const userId = verifySessionToken(token, env.APP_SECRET);
    if (!userId) return null;
    const { getDb } = await import("@/lib/db");
    const { users } = await import("@/db/schema/users");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    const rows = await db.select({ id: users.id, username: users.username, displayName: users.displayName }).from(users).where(eq(users.id, userId)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function getDashboardData(userId: string) {
  try {
    const { getDb } = await import("@/lib/db");
    const { paperFiles } = await import("@/db/schema/paper_files");
    const { papers } = await import("@/db/schema/papers");
    const { modules } = await import("@/db/schema/modules");
    const { eq, count, desc } = await import("drizzle-orm");
    const db = getDb();
    const totalRes = await db.select({ c: count() }).from(paperFiles).where(eq(paperFiles.uploaderId, userId));
    const total = Number(totalRes[0]?.c ?? 0);
    const recent = await db
      .select({ id: papers.id, moduleCode: modules.code, moduleName: modules.name, academicYear: papers.academicYear, semester: papers.semester, assessmentType: papers.assessmentType, assessmentNumber: papers.assessmentNumber, createdAt: paperFiles.createdAt })
      .from(paperFiles)
      .innerJoin(papers, eq(paperFiles.paperId, papers.id))
      .innerJoin(modules, eq(papers.moduleId, modules.id))
      .where(eq(paperFiles.uploaderId, userId))
      .orderBy(desc(paperFiles.createdAt))
      .limit(5);

    // Rank
    const lb = await db.select({ userId: paperFiles.uploaderId, c: count() }).from(paperFiles).innerJoin(papers, eq(paperFiles.paperId, papers.id)).where(eq(papers.status, "active")).groupBy(paperFiles.uploaderId);
    const sorted = lb.sort((a, b) => Number(b.c) - Number(a.c));
    const idx = sorted.findIndex((r) => r.userId === userId);
    const rank = idx >= 0 ? idx + 1 : null;

    return { total, approved: total, pending: 0, rejected: 0, rank, recent };
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <Container className="py-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Optional profile — ghost uploads work without it.</p>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">You&apos;re not logged in</CardTitle>
            <CardDescription>Create an optional profile with username + 5-digit PIN, or continue as guest.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/register" className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground">
              Create profile
            </Link>
            <Link href="/login" className="inline-flex rounded-xl border bg-background px-5 py-2.5 text-sm hover:bg-accent">
              Login
            </Link>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const data = await getDashboardData(user.id);

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome, {user.displayName} (@{user.username})</p>

      {data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Papers contributed</CardDescription>
                <CardTitle className="text-2xl">{data.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Approved: {data.approved} · Pending: {data.pending} · Rejected: {data.rejected}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Leaderboard rank</CardDescription>
                <CardTitle className="text-2xl">{data.rank ? `#${data.rank}` : "—"}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/leaderboard" className="text-xs hover:underline text-muted-foreground">
                  View leaderboard →
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Profile</CardDescription>
                <CardTitle className="text-base">{user.displayName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
                <form action="/api/auth/logout" method="post" className="mt-3">
                  <button type="submit" className="text-xs hover:underline">
                    Logout
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Recent contributions</CardTitle>
              <CardDescription>Last 5 papers you shared.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No papers yet — <Link href="/upload" className="underline">upload one</Link>.</p>
              ) : (
                <div className="space-y-2">
                  {data.recent.map((r) => (
                    <Link key={r.id} href={`/papers/${r.id}`} className="flex items-center justify-between rounded-xl border px-3 py-2 hover:bg-accent">
                      <span className="text-sm">
                        <span className="font-mono font-semibold">{r.moduleCode}</span> — {r.academicYear} Sem {r.semester} — {r.assessmentType}
                        {r.assessmentNumber ? ` ${r.assessmentNumber}` : ""}
                      </span>
                      <Badge variant="outline">{new Date(r.createdAt).toLocaleDateString()}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="mt-6">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Could not load dashboard — database not connected.</CardContent>
        </Card>
      )}
    </Container>
  );
}
