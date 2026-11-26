"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ModuleOption = { code: string; name: string; paperCount?: number };

export function ModuleSelector({ value, onSelect }: { value: ModuleOption | null; onSelect: (m: ModuleOption | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ModuleOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t0 = q.trim();
    if (!t0) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(t0)}&limit=8`, { signal: ctrl.signal });
        const j = (await r.json()) as any;
        setResults((j.data?.modules ?? []).map((m: any) => ({ code: m.code, name: m.name, paperCount: m.paperCount })));
        setOpen(true);
        setActive(0);
      } catch {
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/40 bg-success-soft/40 px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-success text-white">
          <Check className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold">{value.code}</p>
          <p className="truncate text-sm text-muted-foreground">{value.name}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSelect(null);
            setTimeout(() => input.current?.focus(), 0);
          }}
        >
          Change
        </Button>
      </div>
    );
  }

  const pick = (m: ModuleOption) => {
    onSelect(m);
    setQ("");
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (!open || !results.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(results[active]);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Type a module code or name — e.g. MCI511S"
          className="h-12 w-full rounded-2xl border border-input bg-surface pl-11 pr-4 text-[15px] outline-none focus:border-ring focus:ring-4 focus:ring-ring/15"
          aria-label="Search for the module"
          role="combobox"
          aria-expanded={open}
          aria-controls="module-options"
          autoComplete="off"
        />
        {loading && <span className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />}
      </div>
      {open && (
        <div id="module-options" role="listbox" className="absolute inset-x-0 z-20 mt-2 max-h-72 overflow-auto rounded-2xl border bg-card p-1.5 shadow-[var(--shadow-pop)] animate-pop-in">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">No module matches “{q}”. Check the code on your paper&apos;s cover page.</p>
          ) : (
            results.map((m, i) => (
              <button
                key={m.code}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => pick(m)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === active && "bg-accent")}
              >
                <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold">{m.code}</span>
                  <span className="block truncate text-sm text-muted-foreground">{m.name}</span>
                </span>
                {!!m.paperCount && <span className="text-xs text-muted-foreground">{m.paperCount} papers</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
