import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/search/SearchBar";

export const dynamic = "force-dynamic";

async function getRecentPapers() {
  try {
    const { getDb } = await import("@/lib/db");
    const { papers } = await import("@/db/schema/papers");
    const { modules } = await import("@/db/schema/modules");
    const { eq, desc } = await import("drizzle-orm");
    const db = getDb();
    const rows = await db
      .select({ id: papers.id, moduleCode: modules.code, moduleName: modules.name, academicYear: papers.academicYear, assessmentType: papers.assessmentType, assessmentNumber: papers.assessmentNumber })
      .from(papers)
      .innerJoin(modules, eq(papers.moduleId, modules.id))
      .where(eq(papers.status, "active"))
      .orderBy(desc(papers.createdAt))
      .limit(5);
    return rows;
  } catch {
    return [];
  }
}

async function getTopContributors() {
  try {
    const { getDb } = await import("@/lib/db");
    const { users } = await import("@/db/schema/users");
    const { paperFiles } = await import("@/db/schema/paper_files");
    const { papers } = await import("@/db/schema/papers");
    const { eq, count, desc, and, isNull } = await import("drizzle-orm");
    const db = getDb();
    const rows = await db
      .select({ username: users.username, displayName: users.displayName, c: count(paperFiles.id) })
      .from(paperFiles)
      .innerJoin(papers, eq(paperFiles.paperId, papers.id))
      .innerJoin(users, eq(paperFiles.uploaderId, users.id))
      .where(and(eq(papers.status, "active"), eq(paperFiles.isCanonical, true)))
      .groupBy(users.username, users.displayName)
      .orderBy(desc(count(paperFiles.id)))
      .limit(3);
    const anonRes = await db.select({ c: count() }).from(paperFiles).innerJoin(papers, eq(paperFiles.paperId, papers.id)).where(and(isNull(paperFiles.uploaderId), eq(papers.status, "active"), eq(paperFiles.isCanonical, true)));
    const anonCount = Number(anonRes[0]?.c ?? 0);
    // Merge anonymous if needed
    const list = rows.map((r) => ({ name: r.displayName || r.username, count: Number(r.c) }));
    if (anonCount > 0) list.push({ name: "Anonymous", count: anonCount });
    list.sort((a, b) => b.count - a.count);
    return list.slice(0, 3);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const recentPapers = await getRecentPapers();
  const topContributors = await getTopContributors();

  return (
    <div className="flex flex-col">
      {/* Hero — Spec 44,68: branding + dominant search */}
      <section className="border-b bg-gradient-to-b from-muted/40 to-background">
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">NustWeShare</h1>
            <p className="mt-3 text-lg text-muted-foreground">Past papers. Shared by students.</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">Free, community-powered archive for NUST past papers. Browse FEBE &amp; FCI, search any module, upload anonymously. No account needed.</p>
            <div className="mt-8">
              <SearchBar large placeholder="Search module code or name — e.g. MCI511S" />
              <p className="mt-3 text-xs text-muted-foreground">
                Try: <Link href="/search?q=MCI511S" className="underline hover:text-foreground">MCI511S</Link>
                {" · "}
                <Link href="/search?q=PLU411S" className="underline hover:text-foreground">PLU411S</Link>
                {" · "}
                <Link href="/search?q=COA511S" className="underline hover:text-foreground">COA511S</Link>
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Browse by Faculty — Spec 44 */}
      <section className="py-10 sm:py-12">
        <Container>
          <div className="flex items-baseline justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold tracking-tight">Browse by Faculty</h2>
            <Link href="/browse" className="text-sm font-medium hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Link href="/browse?faculty=febe" className="group">
              <Card className="h-full transition-colors group-hover:border-foreground/20">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">FEBE</CardTitle>
                      <CardDescription>Faculty of Engineering and the Built Environment</CardDescription>
                    </div>
                    <Badge>2 Schools · 4 Depts</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>School of Engineering — Civil Mining & Process, Mechanical Industrial & Electrical</li>
                    <li>School of the Built Environment — Architecture, Land & Spatial Sciences</li>
                  </ul>
                  <p className="mt-4 text-sm font-medium group-hover:underline">Browse FEBE →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/browse?faculty=fci" className="group">
              <Card className="h-full transition-colors group-hover:border-foreground/20">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">FCI</CardTitle>
                      <CardDescription>Faculty of Computing and Informatics</CardDescription>
                    </div>
                    <Badge>2 Schools · 6 Depts</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>School of Computing — Computer Science, Software Eng, Cyber Security</li>
                    <li>School of Informatics, Journalism & Media — Informatics, Journalism, Digital Arts</li>
                  </ul>
                  <p className="mt-4 text-sm font-medium group-hover:underline">Browse FCI →</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </Container>
      </section>

      {/* Popular Modules — real codes from seed */}
      <section className="py-8 bg-muted/20 border-y">
        <Container>
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold">Popular Modules</h2>
            <Link href="/browse" className="text-sm font-medium hover:underline hidden sm:inline">
              Browse all modules →
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Modules that appear across almost all programmes — one canonical entry, linked to many courses (Spec 7).</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { code: "MCI511S", name: "Mathematics for Computing 1A", depts: "7 programmes" },
              { code: "PLU411S", name: "Principles of English Language Use", depts: "10+ programmes" },
              { code: "COA511S", name: "Computer Organisation and Architecture", depts: "6 programmes" },
              { code: "DBF510S", name: "Database Fundamentals", depts: "5 programmes" },
              { code: "EPR511S", name: "English in Practice", depts: "8 programmes" },
              { code: "MCI521S", name: "Mathematics for Computing 1B", depts: "6 programmes" },
            ].map((m) => (
              <Link key={m.code} href={`/modules/${m.code.toLowerCase()}`} className="group">
                <Card className="h-full hover:border-foreground/20 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">{m.code}</span>
                      <Badge variant="outline">{m.depts}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium group-hover:underline">{m.name}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Canonical — one row, many programmes</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Recently Added Papers — real data */}
      <section className="py-10">
        <Container>
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold">Recently Added Papers</h2>
            <Link href="/browse" className="text-sm font-medium hover:underline hidden sm:inline">
              Browse papers →
            </Link>
          </div>
          <Card>
            <CardContent className="py-6">
              {recentPapers.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">No papers yet — be the first to share. Every paper helps the next NUST student. Upload is anonymous and takes less than a minute.</p>
                  <div className="mt-6 flex justify-center gap-3">
                    <Link href="/upload" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-slate-800 min-h-[44px]">
                      Upload Papers
                    </Link>
                    <Link href="/browse" className="inline-flex items-center justify-center rounded-xl border bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent min-h-[44px]">
                      Browse Modules
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {recentPapers.map((p) => (
                    <Link key={p.id} href={`/papers/${p.id}`} className="group rounded-xl border p-4 hover:bg-accent">
                      <p className="font-mono text-sm font-semibold">{p.moduleCode}</p>
                      <p className="text-sm font-medium group-hover:underline">{p.moduleName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.academicYear} · {p.assessmentType}
                        {p.assessmentNumber ? ` ${p.assessmentNumber}` : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Container>
      </section>

      {/* Top Contributors + Upload CTA — real data */}
      <section className="py-10 bg-muted/20 border-y">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Contributors</CardTitle>
                <CardDescription>Community leaderboard — anonymous allowed, no real names required.</CardDescription>
              </CardHeader>
              <CardContent>
                {topContributors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contributors yet — be the first! Ghost uploads count as Anonymous.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {topContributors.map((c, idx) => (
                      <li key={`${c.name}-${idx}`} className="flex justify-between">
                        <span className="font-medium">
                          {idx + 1}. {c.name}
                        </span>
                        <span className="text-muted-foreground">{c.count} papers</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/leaderboard" className="mt-4 inline-flex text-sm font-medium hover:underline">
                  View leaderboard →
                </Link>
              </CardContent>
            </Card>
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-primary-foreground">Have a paper we don&apos;t have? Share it.</CardTitle>
                <CardDescription className="text-primary-foreground/80">Help the next NUST student. Every paper helps.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-primary-foreground/90">Upload up to 10 PDFs at once. Pick the module first (required), then add year/type if you can. Skip if you&apos;re in a hurry — we&apos;ll keep it organized.</p>
                <Link href="/upload" className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-medium text-slate-900 hover:bg-zinc-100 min-h-[44px]">
                  Upload Papers — no account needed
                </Link>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>
    </div>
  );
}
