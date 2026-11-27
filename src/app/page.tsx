import Link from "next/link";
import { ArrowRight, BellRing, BookOpenCheck, Building2, FileArchive, FileSearch, Sparkles, Trophy, Upload, Users } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/search/SearchBar";
import { PaperTile } from "@/components/papers/PaperListItem";
import { ContinueReading } from "@/components/papers/ContinueReading";
import { getCurrentUser } from "@/lib/auth/current";
import { compactNumber } from "@/lib/papers/format";
import { getFacultiesWithCounts, getFollowedModules, getLeaderboard, getPopularModules, getSiteStats, listRecentPapers } from "@/lib/papers/queries";

export const dynamic = "force-dynamic";

const FALLBACK_POPULAR = [
  { code: "MCI511S", name: "Mathematics for Computing and Informatics 1A" },
  { code: "PLU411S", name: "Principles of English Language Use" },
  { code: "COA511S", name: "Computer Organisation and Architecture" },
  { code: "DBF510S", name: "Database Fundamentals" },
  { code: "EPR511S", name: "English in Practice" },
  { code: "MCI521S", name: "Mathematics for Computing and Informatics 1B" },
];

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error("[home]", e instanceof Error ? e.message : e);
    return fallback;
  }
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const [stats, recent, popular, faculties, leaders, followed] = await Promise.all([
    safe(getSiteStats(), null),
    safe(listRecentPapers(6), []),
    safe(getPopularModules(6), []),
    safe(getFacultiesWithCounts(), []),
    safe(getLeaderboard({ period: "all", limit: 5 }), { rows: [], anonymousPapers: 0 }),
    user ? safe(getFollowedModules(user.id), []) : Promise.resolve([]),
  ]);
  const popularList = popular.length >= 3 ? popular : FALLBACK_POPULAR.map((m) => ({ ...m, papers: 0, downloads: 0 }));

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden="true" />
        <div className="absolute -top-40 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-info/10 blur-3xl" aria-hidden="true" />
        <Container className="relative py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            {user ? (
              <p className="mb-4 text-sm font-medium text-muted-foreground">Welcome back, {user.displayName.split(" ")[0]} 👋</p>
            ) : (
              <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-warning" /> Free forever · no account needed
              </span>
            )}
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              Every NUST past paper, <span className="text-info">one search away.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground text-balance sm:text-lg">
              Read papers right in your browser, download one — or the whole module as a ZIP. Shared by students, for students.
            </p>
            <div className="mt-8">
              <SearchBar large placeholder="Module code or name — e.g. MCI511S" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Popular:{" "}
              {popularList.slice(0, 4).map((m, i) => (
                <span key={m.code}>
                  {i > 0 && " · "}
                  <Link href={`/modules/${m.code.toLowerCase()}`} className="font-mono font-medium text-foreground/80 hover:text-info hover:underline">
                    {m.code}
                  </Link>
                </span>
              ))}
            </p>
          </div>

          {stats && (
            <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-4">
              {[
                { k: "Past papers", v: stats.papers },
                { k: "Modules covered", v: stats.modulesCovered },
                { k: "Downloads", v: stats.downloads },
                { k: "Modules indexed", v: stats.modules },
              ].map((s) => (
                <div key={s.k} className="bg-surface px-4 py-4 text-center">
                  <dd className="text-2xl font-bold tabular-nums tracking-tight">{compactNumber(s.v)}</dd>
                  <dt className="mt-0.5 text-xs text-muted-foreground">{s.k}</dt>
                </div>
              ))}
            </dl>
          )}
        </Container>
      </section>

      <Container className="space-y-14 py-12">
        <ContinueReading />

        {user && (
          <section aria-labelledby="follow-h">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 id="follow-h" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                <BellRing className="size-5 text-info" /> Your modules
              </h2>
              <Link href="/library" className="text-sm font-medium text-info hover:underline">Manage</Link>
            </div>
            {followed.length === 0 ? (
              <EmptyState className="py-8" title="Follow your modules" description="Open any module and tap Follow — it'll show up here with new papers highlighted." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {followed.map((m) => (
                  <Link key={m.code} href={`/modules/${m.code.toLowerCase()}`} className="rounded-xl border bg-card p-4 hover:border-input hover:shadow-[var(--shadow-soft)]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold">{m.code}</span>
                      {m.newSince > 0 && <span className="rounded-full bg-info px-2 py-0.5 text-[11px] font-semibold text-white">{m.newSince} new</span>}
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{m.name}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{m.papers} paper{m.papers === 1 ? "" : "s"}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="recent-h">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="recent-h" className="text-xl font-semibold tracking-tight">Recently added</h2>
              <p className="text-sm text-muted-foreground">Fresh uploads from classmates.</p>
            </div>
            <Link href="/browse" className="hidden text-sm font-medium text-info hover:underline sm:inline">
              Browse all
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={<Upload />} title="No papers yet — be the first" description="Uploading is anonymous and takes under a minute. Every paper helps the next student.">
              <Link href="/upload" className={buttonVariants({ variant: "brand" })}>Upload a paper</Link>
            </EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((p) => (
                <PaperTile key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="pop-h">
          <div className="mb-4">
            <h2 id="pop-h" className="text-xl font-semibold tracking-tight">Popular modules</h2>
            <p className="text-sm text-muted-foreground">Most read and downloaded right now.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popularList.map((m, i) => (
              <Link key={m.code} href={`/modules/${m.code.toLowerCase()}`} className="group flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-input hover:shadow-[var(--shadow-soft)]">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted font-mono text-sm font-semibold text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold">{m.code}</span>
                  <span className="block truncate text-sm text-muted-foreground group-hover:text-foreground">{m.name}</span>
                </span>
                {m.papers > 0 && <span className="text-xs text-muted-foreground tabular-nums">{m.papers} paper{m.papers === 1 ? "" : "s"}</span>}
              </Link>
            ))}
          </div>
        </section>

        {faculties.length > 0 && (
          <section aria-labelledby="fac-h">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 id="fac-h" className="text-xl font-semibold tracking-tight">Browse by faculty</h2>
              <Link href="/browse" className="text-sm font-medium text-info hover:underline">All faculties</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {faculties.map((f) => (
                <Link key={f.id} href={`/browse/${f.slug}`} className="group">
                  <Card className="h-full p-6 transition-[border-color,box-shadow] group-hover:border-input group-hover:shadow-[var(--shadow-pop)]">
                    <div className="flex items-start gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-info-soft text-info">
                        <Building2 className="size-6" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold">{f.code}</p>
                        <p className="text-sm text-muted-foreground">{f.name}</p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {f.schools} schools · {f.departments} departments · {f.programmes} programmes · <span className="font-medium text-foreground">{f.papers} papers</span>
                        </p>
                      </div>
                      <ArrowRight className="ml-auto size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="how-h" className="rounded-3xl border bg-surface p-6 sm:p-10">
          <h2 id="how-h" className="text-xl font-semibold tracking-tight">Built for exam season</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FileSearch, t: "Find it fast", d: "Search any code or name — typos welcome. Filter by year, semester and paper type." },
              { icon: BookOpenCheck, t: "Read anywhere", d: "A fast in-browser reader with zoom, find-in-page, thumbnails and resume-where-you-left-off." },
              { icon: FileArchive, t: "Grab everything", d: "Download one paper, a selection, or a whole module as a single, neatly named ZIP." },
              { icon: Users, t: "Give back", d: "Upload anonymously, request missing papers, and follow your modules for new uploads." },
            ].map((f) => (
              <div key={f.t}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-warning">
                  <f.icon className="size-5" />
                </span>
                <p className="mt-3 font-medium">{f.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-5" aria-label="Community">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Trophy className="size-4 text-warning" /> Top contributors
              </h2>
              <Link href="/leaderboard" className="text-sm font-medium text-info hover:underline">Leaderboard</Link>
            </div>
            {leaders.rows.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No named contributors yet. Create a profile and upload to claim #1.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {leaders.rows.map((r) => (
                  <li key={r.username} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-semibold tabular-nums text-muted-foreground">{r.rank}</span>
                    <Avatar name={r.displayName} color={r.avatarColor} emoji={r.avatarEmoji} size="sm" />
                    <Link href={`/u/${r.username}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{r.displayName}</Link>
                    <span className="text-sm tabular-nums text-muted-foreground">{r.papers}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground lg:col-span-3 dark:bg-surface-2 dark:text-foreground">
            <div className="absolute -right-10 -top-10 size-48 rounded-full bg-brand/30 blur-2xl" aria-hidden="true" />
            <h2 className="relative text-2xl font-semibold tracking-tight">Have a paper we don&apos;t?</h2>
            <p className="relative mt-2 max-w-md text-primary-foreground/80 dark:text-muted-foreground">
              Drop in up to 10 PDFs. We read the year and type from the filename, check for duplicates, and file them under the right module.
            </p>
            <div className="relative mt-6 flex flex-wrap gap-2">
              <Link href="/upload" className={buttonVariants({ variant: "brand", size: "lg" })}>
                <Upload /> Upload papers
              </Link>
              {!user && (
                <Link href="/register" className="inline-flex h-12 items-center rounded-xl px-5 text-base font-medium text-primary-foreground/90 hover:bg-white/10 dark:text-foreground">
                  Get credit with a profile
                </Link>
              )}
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
