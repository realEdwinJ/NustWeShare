import Link from "next/link";
import { Crown, Ghost, Trophy } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { getLeaderboard } from "@/lib/papers/queries";
import { compactNumber } from "@/lib/papers/format";
import { getCurrentUser } from "@/lib/auth/current";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard", description: "The students sharing the most NUST past papers." };

const PERIODS = [
  { v: "week", l: "This week" },
  { v: "month", l: "This month" },
  { v: "all", l: "All time" },
] as const;

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: raw } = await searchParams;
  const period = (PERIODS.find((p) => p.v === raw)?.v ?? "all") as "week" | "month" | "all";
  const [{ rows, anonymousPapers }, user] = await Promise.all([getLeaderboard({ period, limit: 50 }), getCurrentUser()]);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        title={<span className="flex items-center gap-2"><Trophy className="size-7 text-warning" /> Leaderboard</span>}
        description="Ranked by papers shared. Prefer to stay anonymous? Turn it off in settings — your uploads still count for everyone."
        actions={
          <div className="inline-flex rounded-xl border bg-surface p-0.5" role="tablist">
            {PERIODS.map((p) => (
              <Link key={p.v} href={`/leaderboard?period=${p.v}`} role="tab" aria-selected={period === p.v} className={cn("rounded-lg px-3 py-1.5 text-sm", period === p.v ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground")}>
                {p.l}
              </Link>
            ))}
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState className="mt-8" icon={<Trophy />} title="No named contributors in this period" description={anonymousPapers ? `${anonymousPapers} paper${anonymousPapers === 1 ? " was" : "s were"} shared anonymously.` : "Upload a paper with a profile to take the top spot."}>
          <Link href="/upload" className={buttonVariants({ variant: "brand" })}>Upload a paper</Link>
        </EmptyState>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {podium.map((r, i) => (
              <Link key={r.username} href={`/u/${r.username}`} className={cn("relative flex flex-col items-center rounded-2xl border bg-card p-6 text-center hover:shadow-[var(--shadow-pop)]", i === 0 && "border-brand/60 bg-brand-soft/40 sm:order-2 sm:-mt-3", i === 1 && "sm:order-1", i === 2 && "sm:order-3")}>
                {i === 0 && <Crown className="absolute -top-3 size-6 text-warning" />}
                <Avatar name={r.displayName} color={r.avatarColor} emoji={r.avatarEmoji} size="lg" />
                <p className="mt-3 font-semibold">{r.displayName}</p>
                <p className="text-xs text-muted-foreground">@{r.username}</p>
                <p className="mt-3 text-2xl font-bold tabular-nums">{r.papers}</p>
                <p className="text-xs text-muted-foreground">papers · {compactNumber(r.downloads)} downloads</p>
                <span className="absolute left-3 top-3 text-sm font-semibold text-muted-foreground">#{r.rank}</span>
              </Link>
            ))}
          </div>
          {rest.length > 0 && (
            <ol className="mt-6 divide-y overflow-hidden rounded-2xl border bg-card">
              {rest.map((r) => (
                <li key={r.username}>
                  <Link href={`/u/${r.username}`} className={cn("flex items-center gap-4 px-4 py-3 hover:bg-accent/50", user?.username === r.username && "bg-info-soft/50")}>
                    <span className="w-8 text-sm font-semibold tabular-nums text-muted-foreground">#{r.rank}</span>
                    <Avatar name={r.displayName} color={r.avatarColor} emoji={r.avatarEmoji} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.displayName}</span>
                      <span className="block text-xs text-muted-foreground">@{r.username}</span>
                    </span>
                    <span className="text-right text-sm">
                      <span className="font-semibold tabular-nums">{r.papers}</span> <span className="text-muted-foreground">papers</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {anonymousPapers > 0 && (
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Ghost className="size-4" /> Plus {anonymousPapers} paper{anonymousPapers === 1 ? "" : "s"} shared anonymously — thank you, whoever you are.
            </p>
          )}
        </>
      )}
    </Container>
  );
}
