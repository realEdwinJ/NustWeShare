"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { recentPapers, type RecentPaper } from "@/lib/client/library";
import { timeAgo } from "@/lib/papers/format";

export function ContinueReading({ limit = 4, title = "Continue reading" }: { limit?: number; title?: string }) {
  const [items, setItems] = useState<RecentPaper[]>([]);
  useEffect(() => setItems(recentPapers.list().slice(0, limit)), [limit]);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="cr-h">
      <h2 id="cr-h" className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <History className="size-4" /> {title}
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((p) => (
          <Link key={p.id} href={`/papers/${p.id}`} className="shrink-0 rounded-xl border bg-card px-3.5 py-2.5 text-sm hover:bg-accent">
            <span className="font-mono font-semibold">{p.moduleCode}</span> <span className="text-muted-foreground">{p.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">{timeAgo(p.at)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
