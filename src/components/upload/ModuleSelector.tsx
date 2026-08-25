"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ModuleOption = { code: string; name: string };

export function ModuleSelector({
  value,
  onSelect,
}: {
  value: ModuleOption | null;
  onSelect: (m: ModuleOption | null) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ModuleOption[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/modules?q=${encodeURIComponent(q.trim())}`);
        if (!res.ok) return;
        const json = await res.json();
        const mods: ModuleOption[] = (json.data || []).slice(0, 8).map((m: any) => ({ code: m.code, name: m.name }));
        setResults(mods);
        setOpen(mods.length > 0);
        setFocused(0);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
        <div>
          <p className="font-mono text-sm font-semibold">{value.code} — {value.name} ✓</p>
          <p className="text-xs text-muted-foreground">Selected module — you can change it below</p>
        </div>
        <button onClick={() => onSelect(null)} className="text-sm font-medium hover:underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="text-sm font-medium">
        Module <span className="text-destructive">*</span>
      </label>
      <p className="text-xs text-muted-foreground mb-2">Every paper must have a module. Search by code or name.</p>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setFocused((v) => (v + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setFocused((v) => (v - 1 + results.length) % results.length);
            } else if (e.key === "Enter" && results[focused]) {
              e.preventDefault();
              onSelect(results[focused]);
              setQ("");
              setOpen(false);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search modules — e.g. MCI511S / Mathematics"
          className="pl-10 h-12 rounded-2xl"
          aria-label="Search modules"
          aria-expanded={open}
          aria-autocomplete="list"
        />
      </div>
      {open && (
        <div role="listbox" className="absolute left-0 right-0 mt-2 rounded-2xl border bg-card shadow-lg max-h-60 overflow-auto z-20">
          {results.map((m, idx) => (
            <button
              key={m.code}
              role="option"
              aria-selected={idx === focused}
              onClick={() => {
                onSelect(m);
                setQ("");
                setOpen(false);
              }}
              className={cn("w-full text-left px-3 py-2.5 flex flex-col", idx === focused ? "bg-accent" : "hover:bg-accent")}
            >
              <span className="font-mono text-sm font-semibold">{m.code}</span>
              <span className="text-sm text-muted-foreground">{m.name}</span>
            </button>
          ))}
        </div>
      )}
      {!open && q.trim().length >= 2 && results.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No modules found for “{q}”.</p>}
    </div>
  );
}
