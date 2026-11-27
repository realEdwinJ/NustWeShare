import Link from "next/link";
import { Download, Eye } from "lucide-react";
import { TypeBadge } from "./ModulePapers";
import { compactNumber } from "@/lib/papers/format";
import { RelTime } from "@/components/ui/rel-time";
import type { PaperListItem } from "@/lib/papers/queries";

export function PaperTile({ p, showTime = true }: { p: PaperListItem; showTime?: boolean }) {
  return (
    <Link href={`/papers/${p.id}`} className="group flex flex-col rounded-xl border bg-card p-4 transition-[border-color,box-shadow] hover:border-input hover:shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{p.moduleCode}</span>
        <TypeBadge type={p.assessmentType} number={p.assessmentNumber} />
      </div>
      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground group-hover:text-foreground">{p.moduleName}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">
          {p.academicYear} · S{p.semester}
        </span>
        <span className="inline-flex items-center gap-1"><Eye className="size-3" />{compactNumber(p.views)}</span>
        <span className="inline-flex items-center gap-1"><Download className="size-3" />{compactNumber(p.downloads)}</span>
        {showTime && <span className="ml-auto"><RelTime date={p.createdAt} /></span>}
      </div>
    </Link>
  );
}
