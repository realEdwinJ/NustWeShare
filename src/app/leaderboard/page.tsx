import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard" };

async function getLeaderboard() {
  try {
    const { getDb } = await import("@/lib/db");
    const { users } = await import("@/db/schema/users");
    const { paperFiles } = await import("@/db/schema/paper_files");
    const { papers } = await import("@/db/schema/papers");
    const { eq, count, desc, sql } = await import("drizzle-orm");
    const db = getDb();
    const rows = await db
      .select({ userId: paperFiles.uploaderId, username: users.username, displayName: users.displayName, c: count(paperFiles.id) })
      .from(paperFiles)
      .innerJoin(papers, eq(paperFiles.paperId, papers.id))
      .innerJoin(users, eq(paperFiles.uploaderId, users.id))
      .where(sql`${papers.status} = 'active' AND ${paperFiles.isCanonical} = true`)
      .groupBy(paperFiles.uploaderId, users.username, users.displayName)
      .orderBy(desc(count(paperFiles.id)))
      .limit(20);

    const anonRes = await db
      .select({ c: count() })
      .from(paperFiles)
      .innerJoin(papers, eq(paperFiles.paperId, papers.id))
      .where(sql`${paperFiles.uploaderId} IS NULL AND ${papers.status} = 'active' AND ${paperFiles.isCanonical} = true`);
    const anonCount = Number(anonRes[0]?.c ?? 0);

    const ranked = rows.map((r, idx) => ({ rank: idx + 1, username: r.username, displayName: r.displayName, count: Number(r.c) }));
    if (anonCount > 0) {
      ranked.push({ rank: 0, username: "Anonymous", displayName: "Anonymous", count: anonCount });
      ranked.sort((a, b) => b.count - a.count);
      ranked.forEach((r, i) => (r.rank = i + 1));
    }
    return ranked.slice(0, 20);
  } catch (e) {
    console.error("[leaderboard page]", e);
    return null;
  }
}

export default async function LeaderboardPage() {
  const data = await getLeaderboard();

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Community contributors — anonymous allowed. Every paper helps. No real names required.</p>

      {data === null ? (
        <Card className="mt-6">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Leaderboard unavailable — database not connected.</CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium">No contributors yet — be the first!</p>
            <p className="text-sm text-muted-foreground mt-1">Upload a paper and you&apos;ll appear here.</p>
            <Link href="/upload" className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground">
              Upload Papers
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Top Contributors</CardTitle>
            <CardDescription>By approved papers — ghost uploads count as Anonymous.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.map((r) => (
                <div key={`${r.username}-${r.rank}`} className="flex items-center justify-between rounded-xl border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${r.rank === 1 ? "bg-amber-100 text-amber-800" : r.rank === 2 ? "bg-zinc-200 text-zinc-700" : r.rank === 3 ? "bg-orange-100 text-orange-800" : "bg-muted text-muted-foreground"}`}>
                      {r.rank}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{r.displayName || r.username}</p>
                      <p className="text-xs text-muted-foreground">@{r.username}</p>
                    </div>
                  </div>
                  <Badge variant={r.rank <= 3 ? "default" : "secondary"}>{r.count} papers</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
