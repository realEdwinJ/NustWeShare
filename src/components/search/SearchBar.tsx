"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, FileText, GraduationCap, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { recentSearches } from "@/lib/client/library";
import { moduleHref } from "@/lib/searchIntent";
import { assessmentLabel } from "@/lib/papers/format";

type Result = {
  modules: { code: string; name: string; paperCount: number }[];
  programmes: { code: string; name: string; href: string }[];
  papers: { id: string; moduleCode: string; academicYear: number; semester: number; assessmentType: string; assessmentNumber: number | null }[];
  intent: { year?: number; type?: string; semester?: number };
};

export function SearchBar({ large = false, placeholder = "Search by module code or name", defaultValue = "", autoFocus }: { large?: boolean; placeholder?: string; defaultValue?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState(defaultValue);
  const [res, setRes] = useState<Result | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, start] = useTransition();
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1 || term === defaultValue) {
      setRes(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=7`, { signal: ctrl.signal });
        const j = (await r.json()) as any;
        if (j.data) {
          setRes({ modules: j.data.modules.slice(0, 7), programmes: j.data.programmes.slice(0, 3), papers: (j.data.papers ?? []).slice(0, 4), intent: j.data.intent ?? {} });
          setOpen(true);
          setActive(-1);
        }
      } catch {}
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, defaultValue]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const items = res
    ? [
        ...res.papers.map((p) => ({
          kind: "paper" as const,
          href: `/papers/${p.id}`,
          code: p.id,
          name: `${p.moduleCode} ${assessmentLabel(p.assessmentType, p.assessmentNumber)} ${p.academicYear}`,
          paperCount: 0,
          sub: `Semester ${p.semester}`,
        })),
        ...res.modules.map((m) => ({ ...m, href: moduleHref(m.code, res.intent as any), kind: "module" as const, sub: m.name })),
        ...res.programmes.map((p) => ({ ...p, paperCount: 0, kind: "programme" as const, sub: `Programme · ${p.code}` })),
      ]
    : [];

  function go(href: string) {
    if (q.trim().length >= 2) recentSearches.add(q.trim());
    setOpen(false);
    start(() => router.push(href));
  }

  return (
    <div ref={box} className={cn("relative w-full", large && "mx-auto max-w-2xl")}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && items[active]) return go(items[active].href);
          const t = q.trim();
          if (t) go(`/search?q=${encodeURIComponent(t)}`);
        }}
        className={cn(
          "flex items-center gap-2 rounded-2xl border bg-surface shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15",
          large ? "h-16 pl-5 pr-2" : "h-12 pl-4 pr-1.5"
        )}
      >
        <Search className={cn("shrink-0 text-muted-foreground", large ? "size-5" : "size-4")} aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => res && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || !items.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % items.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          aria-label="Search modules"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          className={cn("h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/80", large ? "text-lg" : "text-[15px]")}
        />
        <button
          type="submit"
          className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary-hover", large ? "h-12 px-5" : "h-9 px-3.5 text-sm")}
          disabled={pending}
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>

      {open && res && (
        <div id={listId} role="listbox" className="absolute inset-x-0 z-30 mt-2 overflow-hidden rounded-2xl border bg-card text-left shadow-[var(--shadow-pop)] animate-pop-in">
          {items.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted-foreground">No modules match “{q}”. Try the code, e.g. MCI511S.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto p-1.5">
              {items.map((it, i) => (
                <li key={it.kind + it.code}>
                  <button
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(it.href)}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === active && "bg-accent")}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      {it.kind === "module" ? <BookOpen className="size-4" /> : it.kind === "paper" ? <FileText className="size-4" /> : <GraduationCap className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm font-medium", it.kind === "module" && "font-mono")}>{it.kind === "module" ? it.code : it.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{it.sub}</span>
                    </span>
                    {it.kind === "module" &&
                      (it.paperCount > 0 ? (
                        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">{it.paperCount} paper{it.paperCount === 1 ? "" : "s"}</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">no papers yet</span>
                      ))}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)} className="flex w-full items-center justify-between border-t px-4 py-3 text-sm font-medium hover:bg-accent">
            See all results for “{q.trim()}” <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
