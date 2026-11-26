"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type M = { code: string; name: string; yearLevel: number | null; semester: number | null; isCore: boolean; papers: number };

export function ProgrammeModules({ modules }: { modules: M[] }) {
  const years = useMemo(() => [...new Set(modules.map((m) => m.yearLevel ?? 0))].sort((a, b) => (a || 99) - (b || 99)), [modules]);
  const [year, setYear] = useState<number | "all">("all");
  const [onlyPapers, setOnlyPapers] = useState(false);
  const shown = modules.filter((m) => (year === "all" || (m.yearLevel ?? 0) === year) && (!onlyPapers || m.papers > 0));
  const grouped = years
    .filter((y) => year === "all" || y === year)
    .map((y) => ({ y, sems: [1, 2, 0].map((s) => ({ s, list: shown.filter((m) => (m.yearLevel ?? 0) === y && (m.semester ?? 0) === s) })).filter((g) => g.list.length) }))
    .filter((g) => g.sems.length);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap rounded-xl border bg-surface p-0.5" role="tablist" aria-label="Year of study">
          {(["all", ...years] as const).map((y) => (
            <button key={String(y)} role="tab" aria-selected={year === y} onClick={() => setYear(y)} className={cn("h-8 rounded-lg px-3 text-sm", year === y ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground")}>
              {y === "all" ? "All years" : y === 0 ? "Other" : `Year ${y}`}
            </button>
          ))}
        </div>
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={onlyPapers} onChange={(e) => setOnlyPapers(e.target.checked)} className="size-4 accent-[var(--info)]" /> Only modules with papers
        </label>
      </div>
      <div className="mt-6 space-y-8">
        {grouped.length === 0 && <p className="text-sm text-muted-foreground">No modules match.</p>}
        {grouped.map(({ y, sems }) => (
          <section key={y}>
            <h2 className="text-lg font-semibold">{y === 0 ? "Other / electives" : `Year ${y}`}</h2>
            {sems.map(({ s, list }) => (
              <div key={s} className="mt-3">
                {s > 0 && <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Semester {s}</p>}
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((m) => (
                    <Link key={m.code} href={`/modules/${m.code.toLowerCase()}`} className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:border-input hover:shadow-[var(--shadow-soft)]">
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-semibold">{m.code}</span>
                        <span className="block truncate text-sm text-muted-foreground group-hover:text-foreground">{m.name}</span>
                      </span>
                      {m.papers > 0 ? (
                        <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">{m.papers}</span>
                      ) : (
                        <span className="shrink-0 text-[11px] text-muted-foreground">—</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
