"use client";

// Small localStorage-backed stores (safe in private mode: every access is guarded).
export type RecentPaper = { id: string; moduleCode: string; label: string; at: number };
export type RecentSearch = string;

const RECENT_PAPERS = "nws-recent-papers";
const RECENT_SEARCHES = "nws-recent-searches";
const GUEST_SAVED = "nws-guest-saved";
const READ_POS = "nws-read-pos";

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
    window.dispatchEvent(new CustomEvent("nws-library", { detail: key }));
  } catch {}
}

export const recentPapers = {
  list: () => read<RecentPaper[]>(RECENT_PAPERS, []),
  add(p: Omit<RecentPaper, "at">) {
    const next = [{ ...p, at: Date.now() }, ...recentPapers.list().filter((x) => x.id !== p.id)].slice(0, 20);
    write(RECENT_PAPERS, next);
  },
  clear: () => write(RECENT_PAPERS, []),
};

export const recentSearches = {
  list: () => read<RecentSearch[]>(RECENT_SEARCHES, []),
  add(q: string) {
    const t = q.trim();
    if (t.length < 2) return;
    write(RECENT_SEARCHES, [t, ...recentSearches.list().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8));
  },
  clear: () => write(RECENT_SEARCHES, []),
};

export const guestSaved = {
  list: () => read<string[]>(GUEST_SAVED, []),
  has: (id: string) => guestSaved.list().includes(id),
  toggle(id: string) {
    const cur = guestSaved.list();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur].slice(0, 200);
    write(GUEST_SAVED, next);
    return next.includes(id);
  },
  clear: () => write(GUEST_SAVED, []),
};

export const readingPosition = {
  get: (id: string): number | null => read<Record<string, number>>(READ_POS, {})[id] ?? null,
  set(id: string, page: number) {
    const all = read<Record<string, number>>(READ_POS, {});
    all[id] = page;
    const keys = Object.keys(all);
    if (keys.length > 100) delete all[keys[0]];
    try {
      localStorage.setItem(READ_POS, JSON.stringify(all));
    } catch {}
  },
};
