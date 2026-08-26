"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SearchResult = {
  modules: Array<{ code: string; name: string }>;
  programmes: Array<{ code: string; name: string }>;
};

export function SearchBar({ large = false, placeholder = "Search module code or name" }: { large?: boolean; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(0);
  const router = useRouter();
  const [pending, start] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced fetch
  useEffect(() => {
    if (q.trim().length < 1) {
      setResults(null);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (!res.ok) return;
        const json = (await res.json()) as any;
        if (json.data) {
          setResults(json.data);
          setOpen(true);
          setFocused(0);
        }
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    start(() => router.push(`/search?q=${encodeURIComponent(trimmed)}`));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !results) return;
    const items = [...(results.modules || []), ...(results.programmes || [])];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((v) => (v + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((v) => (v - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
    } else if (e.key === "Enter" && open && items.length > 0) {
      // If dropdown open and focused item exists, navigate to it instead of search page
      const all = [...results.modules.map((m) => ({ type: "module" as const, code: m.code })), ...results.programmes.map((p) => ({ type: "programme" as const, code: p.code }))];
      const sel = all[focused];
      if (sel && q.trim().length >= 2) {
        e.preventDefault();
        setOpen(false);
        start(() => {
          if (sel.type === "module") router.push(`/modules/${sel.code.toLowerCase()}`);
          else router.push(`/search?q=${encodeURIComponent(sel.code)}`);
        });
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const hasResults = results && (results.modules.length > 0 || results.programmes.length > 0);

  return (
    <div ref={boxRef} className={cn("relative", large && "max-w-2xl mx-auto")}>
      <form onSubmit={onSubmit} className="flex gap-2" role="search" aria-label="Search papers">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => hasResults && setOpen(true)}
            placeholder={large ? "ELC511S / Electronic Devices" : placeholder}
            className={cn("pl-10", large && "h-14 text-base rounded-2xl")}
            aria-label="Search module code or name"
            aria-expanded={open}
            aria-controls="search-dropdown"
            aria-autocomplete="list"
            autoComplete="off"
          />
        </div>
        <Button type="submit" size={large ? "lg" : "default"} className={large ? "h-14 px-7 rounded-2xl" : ""} disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>

      {open && hasResults && (
        <div
          id="search-dropdown"
          role="listbox"
          className="absolute left-0 right-0 mt-2 rounded-2xl border bg-card shadow-lg max-h-[70vh] overflow-auto z-20"
        >
          {results.modules.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modules</p>
              {results.modules.map((m, idx) => {
                const isFocused = idx === focused;
                return (
                  <button
                    key={m.code}
                    role="option"
                    aria-selected={isFocused}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/modules/${m.code.toLowerCase()}`);
                    }}
                    className={cn("w-full text-left rounded-xl px-3 py-2 flex items-center justify-between gap-2", isFocused ? "bg-accent" : "hover:bg-accent")}
                  >
                    <span>
                      <span className="font-mono text-sm font-semibold">{m.code}</span>
                      <span className="ml-2 text-sm">{m.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">Module</span>
                  </button>
                );
              })}
            </div>
          )}
          {results.programmes.length > 0 && (
            <div className="p-2 border-t">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Programmes</p>
              {results.programmes.map((p, idx) => {
                const offset = results.modules.length;
                const isFocused = offset + idx === focused;
                return (
                  <button
                    key={p.code}
                    role="option"
                    aria-selected={isFocused}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/search?q=${encodeURIComponent(p.code)}`);
                    }}
                    className={cn("w-full text-left rounded-xl px-3 py-2 flex items-center justify-between gap-2", isFocused ? "bg-accent" : "hover:bg-accent")}
                  >
                    <span>
                      <span className="font-mono text-xs font-semibold">{p.code}</span>
                      <span className="ml-2 text-sm line-clamp-1">{p.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="p-2 border-t">
            <button
              onClick={onSubmit as any}
              className="w-full text-left rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2"
            >
              <span>Search for</span>
              <span className="font-semibold">&quot;{q}&quot;</span>
              <span className="text-muted-foreground">→</span>
            </button>
          </div>
        </div>
      )}

      {open && results && !hasResults && (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl border bg-card shadow-lg p-4 z-20">
          <p className="text-sm text-muted-foreground">No results for “{q}” — try a code like MCI511S or a name like Mathematics.</p>
        </div>
      )}
    </div>
  );
}
