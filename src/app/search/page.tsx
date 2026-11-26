import Link from "next/link";
import { BookOpen, GraduationCap, SearchX } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/search/SearchBar";
import { searchCatalog } from "@/lib/search";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return { title: q ? `“${q}” — search` : "Search", robots: { index: false } };
}

function Hl({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-brand-soft px-0.5 text-foreground">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; papers?: string }> }) {
  const { q = "", papers } = await searchParams;
  const term = q.trim().slice(0, 100);
  const onlyWithPapers = papers === "1";
  const data = term ? await searchCatalog(term, { moduleLimit: 60, programmeLimit: 10, onlyWithPapers }).catch(() => null) : null;
  const href = (p: boolean) => `/search?q=${encodeURIComponent(term)}${p ? "&papers=1" : ""}`;

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader title="Search" description="Module codes, names and programmes. Partial words and small typos are fine." />
      <div className="mt-6 max-w-2xl">
        <SearchBar defaultValue={term} autoFocus={!term} />
      </div>

      {!term ? (
        <div className="mt-10 text-sm text-muted-foreground">
          Try{" "}
          {["MCI511S", "Programming", "511S", "Electrical"].map((s, i) => (
            <span key={s}>
              {i > 0 && " · "}
              <Link href={`/search?q=${encodeURIComponent(s)}`} className="font-medium text-info hover:underline">{s}</Link>
            </span>
          ))}
        </div>
      ) : data === null ? (
        <EmptyState className="mt-8" title="Search is temporarily unavailable" description="Please try again in a moment." />
      ) : data.modules.length === 0 && data.programmes.length === 0 ? (
        <EmptyState className="mt-8" icon={<SearchX />} title={`No results for “${term}”`} description={onlyWithPapers ? "No matching module has papers yet." : "Check the module code (e.g. MCI511S) or try fewer words."}>
          {onlyWithPapers && <Link href={href(false)} className="text-sm font-medium text-info hover:underline">Show all modules</Link>}
        </EmptyState>
      ) : (
        <div className="mt-8 space-y-10">
          <section>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <BookOpen className="size-4 text-info" /> Modules <span className="font-normal text-muted-foreground">({data.modules.length})</span>
              </h2>
              <div className="ml-auto inline-flex rounded-xl border bg-surface p-0.5 text-sm">
                <Link href={href(false)} className={cn("rounded-lg px-3 py-1", !onlyWithPapers ? "bg-secondary font-medium" : "text-muted-foreground")}>All</Link>
                <Link href={href(true)} className={cn("rounded-lg px-3 py-1", onlyWithPapers ? "bg-secondary font-medium" : "text-muted-foreground")}>With papers</Link>
              </div>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {data.modules.map((m) => (
                <Link key={m.code} href={`/modules/${m.code.toLowerCase()}`} className="group rounded-xl border bg-card p-4 hover:border-input hover:shadow-[var(--shadow-soft)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold"><Hl text={m.code} q={term} /></span>
                    {m.paperCount > 0 ? (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">{m.paperCount} paper{m.paperCount === 1 ? "" : "s"}</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">No papers yet</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm group-hover:underline"><Hl text={m.name} q={term} /></p>
                  {m.departmentName && <p className="mt-1.5 truncate text-xs text-muted-foreground">{m.facultyCode} · {m.departmentName.replace(/^Department of /, "")}</p>}
                </Link>
              ))}
            </div>
          </section>
          {data.programmes.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <GraduationCap className="size-4 text-info" /> Programmes
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {data.programmes.map((p) => (
                  <Link key={p.code} href={p.href} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:border-input">
                    <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium"><Hl text={p.name} q={term} /></span>
                    <span className="text-xs capitalize text-muted-foreground">{p.level}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Container>
  );
}
