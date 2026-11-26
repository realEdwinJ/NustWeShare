"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Clock, CornerDownLeft, FileText, GraduationCap, Search, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import { recentPapers, recentSearches } from "@/lib/client/library";

type Item = { key: string; href: string; title: string; subtitle?: string; icon: "module" | "programme" | "paper" | "recent" | "action" | "search"; badge?: string };

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("nws-open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nws-open-search", onOpen);
    };
  }, []);
  return { open, setOpen };
}

export function openSearch() {
  window.dispatchEvent(new Event("nws-open-search"));
}

const ICONS = { module: BookOpen, programme: GraduationCap, paper: FileText, recent: Clock, action: ArrowRight, search: Search };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
    if (!open && d.open) d.close();
  }, [open]);

  const defaults = useCallback((): Item[] => {
    const rs = recentSearches.list().slice(0, 4).map<Item>((s) => ({ key: `rs-${s}`, href: `/search?q=${encodeURIComponent(s)}`, title: s, subtitle: "Recent search", icon: "recent" }));
    const rp = recentPapers.list().slice(0, 4).map<Item>((p) => ({ key: `rp-${p.id}`, href: `/papers/${p.id}`, title: `${p.moduleCode} — ${p.label}`, subtitle: "Recently viewed", icon: "paper" }));
    const actions: Item[] = [
      { key: "a-browse", href: "/browse", title: "Browse faculties", icon: "action" },
      { key: "a-upload", href: "/upload", title: "Upload papers", icon: "action" },
      { key: "a-saved", href: "/library", title: "My library — saved & recent", icon: "action" },
    ];
    return [...rp, ...rs, ...actions];
  }, []);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 1) {
      setItems(defaults());
      setActive(0);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = (await res.json()) as any;
        const mods: Item[] = (json.data?.modules ?? []).slice(0, 8).map((m: any) => ({
          key: `m-${m.code}`,
          href: `/modules/${m.code.toLowerCase()}`,
          title: m.code,
          subtitle: m.name,
          icon: "module",
          badge: m.paperCount ? `${m.paperCount} paper${m.paperCount === 1 ? "" : "s"}` : undefined,
        }));
        const progs: Item[] = (json.data?.programmes ?? []).slice(0, 4).map((p: any) => ({
          key: `p-${p.code}`,
          href: p.href ?? `/search?q=${encodeURIComponent(p.code)}`,
          title: p.name,
          subtitle: p.code,
          icon: "programme",
        }));
        setItems([...mods, ...progs, { key: "s-all", href: `/search?q=${encodeURIComponent(term)}`, title: `See all results for “${term}”`, icon: "search" }]);
        setActive(0);
      } catch {
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open, defaults]);

  function go(it: Item) {
    if (q.trim().length >= 2) recentSearches.add(q.trim());
    onClose();
    router.push(it.href);
  }

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <dialog
      ref={dlg}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
      className="mx-auto mt-[10vh] w-[calc(100%-1.5rem)] max-w-xl rounded-2xl border bg-card p-0 text-card-foreground shadow-[var(--shadow-pop)]"
      aria-label="Search"
    >
      <div className="flex items-center gap-3 border-b px-4">
        <Search className="size-5 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const it = items[active];
              if (it) go(it);
              else if (q.trim()) go({ key: "x", href: `/search?q=${encodeURIComponent(q.trim())}`, title: "", icon: "search" });
            }
          }}
          placeholder="Search modules, codes, programmes…"
          className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={items[active] ? `cmdk-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" aria-hidden />}
        <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent sm:hidden" aria-label="Close search">
          <X className="size-4" />
        </button>
        <Kbd className="hidden sm:inline-flex">Esc</Kbd>
      </div>
      <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
        {items.length === 0 && !loading && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matches. Try a code like MCI511S.</p>}
        {items.map((it, idx) => {
          const Icon = ICONS[it.icon];
          return (
            <button
              key={it.key}
              id={`cmdk-${idx}`}
              data-idx={idx}
              role="option"
              aria-selected={idx === active}
              onMouseMove={() => setActive(idx)}
              onClick={() => go(it)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", idx === active ? "bg-accent" : "")}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm font-medium", it.icon === "module" && "font-mono")}>{it.title}</span>
                {it.subtitle && <span className="block truncate text-xs text-muted-foreground">{it.subtitle}</span>}
              </span>
              {it.badge && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">{it.badge}</span>}
              {idx === active && <CornerDownLeft className="size-4 text-muted-foreground" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="hidden items-center gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground sm:flex">
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
        <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
        <span className="ml-auto flex items-center gap-1"><Upload className="size-3.5" /> Can&apos;t find a paper? Request it on the module page.</span>
      </div>
    </dialog>
  );
}
