"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, CheckSquare, Download, Eye, FileArchive, FileText, LayoutList, Rows3, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useZipDownload } from "./ZipDownload";
import { SaveButton } from "./SaveButton";
import { assessmentLabel, compactNumber, downloadFilename, formatBytes, TYPE_LABEL, type AssessmentType } from "@/lib/papers/format";

export type ModulePaper = {
  id: string;
  academicYear: number;
  semester: number;
  assessmentType: AssessmentType;
  assessmentNumber: number | null;
  views: number;
  downloads: number;
  fileSize: number | null;
  pageCount: number | null;
  hasFile: boolean;
  createdAt: string;
  uploader: { username: string; displayName: string } | null;
};

const TYPE_TONE: Record<string, "info" | "brand" | "success" | "warning" | "secondary" | "destructive"> = {
  EXAM: "brand",
  SUPPLEMENTARY: "warning",
  TEST: "info",
  QUIZ: "success",
  ASSIGNMENT: "secondary",
  LAB: "secondary",
  TUTORIAL: "secondary",
};

export function TypeBadge({ type, number }: { type: string; number?: number | null }) {
  return <Badge variant={TYPE_TONE[type] ?? "secondary"}>{assessmentLabel(type, number)}</Badge>;
}

export function ModulePapers({ moduleCode, moduleName, papers, savedIds = [], initialFilters }: { moduleCode: string; moduleName: string; papers: ModulePaper[]; savedIds?: string[]; initialFilters?: { year?: string; type?: string; sem?: string } }) {
  const [year, setYear] = useState<string>(initialFilters?.year ?? "all");
  const [type, setType] = useState<string>(initialFilters?.type ?? "all");
  const [sem, setSem] = useState<string>(initialFilters?.sem ?? "all");
  const [view, setView] = useState<"grouped" | "table">("grouped");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const zip = useZipDownload();

  const years = useMemo(() => [...new Set(papers.map((p) => p.academicYear))].sort((a, b) => b - a), [papers]);
  const types = useMemo(() => [...new Set(papers.map((p) => p.assessmentType))], [papers]);

  const filtered = useMemo(
    () =>
      papers.filter(
        (p) => (year === "all" || p.academicYear === Number(year)) && (type === "all" || p.assessmentType === type) && (sem === "all" || p.semester === Number(sem))
      ),
    [papers, year, type, sem]
  );
  const byYear = useMemo(() => {
    const m = new Map<number, ModulePaper[]>();
    for (const p of filtered) {
      if (!m.has(p.academicYear)) m.set(p.academicYear, []);
      m.get(p.academicYear)!.push(p);
    }
    return [...m.entries()];
  }, [filtered]);

  const downloadable = filtered.filter((p) => p.hasFile);
  const allSelected = downloadable.length > 0 && downloadable.every((p) => selected.has(p.id));
  const filtersActive = year !== "all" || type !== "all" || sem !== "all";

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(downloadable.map((p) => p.id)));
  }
  function toFiles(list: ModulePaper[]) {
    return list
      .filter((p) => p.hasFile)
      .map((p) => ({
        paperId: p.id,
        url: `/api/papers/${p.id}/download`,
        filename: downloadFilename({ moduleCode, ...p }),
        folder: String(p.academicYear),
        size: p.fileSize,
      }));
  }
  const readme = ({ saved, failed }: { saved: string[]; failed: string[] }) =>
    [
      `${moduleCode} — ${moduleName}`,
      `${saved.length} past paper${saved.length === 1 ? "" : "s"} downloaded from NustWeShare on ${new Date().toLocaleDateString("en-GB", { timeZone: "Africa/Windhoek" })}.`,
      "",
      ...saved.map((n) => `  • ${n}`),
      ...(failed.length ? ["", `${failed.length} file${failed.length === 1 ? "" : "s"} couldn't be included:`, ...failed.map((n) => `  • ${n}`)] : []),
      "",
      `Shared by students, for students. Missing a paper? Upload it at ${typeof location !== "undefined" ? location.origin : ""}/upload?module=${moduleCode}`,
      "",
    ].join("\n");

  function downloadAll() {
    const list = filtersActive ? filtered : papers;
    const suffix = filtersActive ? [year !== "all" ? year : "", type !== "all" ? TYPE_LABEL[type as AssessmentType] : "", sem !== "all" ? `S${sem}` : ""].filter(Boolean).join("_") : "all";
    zip.start(toFiles(list), `${moduleCode}_past_papers_${suffix}.zip`, readme);
  }
  function downloadSelected() {
    const list = papers.filter((p) => selected.has(p.id));
    zip.start(toFiles(list), `${moduleCode}_selected_${list.length}.zip`, readme);
  }

  if (papers.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title={`No papers for ${moduleCode} yet`}
        description="Be the first to share one — it takes under a minute and no account is needed. You can also request a specific paper below so others know what's missing."
      >
        <Link href={`/upload?module=${moduleCode}`} className={buttonVariants({ variant: "brand" })}>
          Upload a {moduleCode} paper
        </Link>
      </EmptyState>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={year} onChange={(e) => setYear(e.target.value)} className="h-9 w-auto min-w-[7.5rem] text-sm" aria-label="Filter by year">
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-auto min-w-[8.5rem] text-sm" aria-label="Filter by type">
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
          <Select value={sem} onChange={(e) => setSem(e.target.value)} className="h-9 w-auto min-w-[8.5rem] text-sm" aria-label="Filter by semester">
            <option value="all">Both semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </Select>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={() => { setYear("all"); setType("all"); setSem("all"); }}>
              <X /> Clear
            </Button>
          )}
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {filtered.length} of {papers.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border bg-surface p-0.5" role="group" aria-label="Layout">
            <button onClick={() => setView("grouped")} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm", view === "grouped" ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground")} aria-pressed={view === "grouped"}>
              <Rows3 className="size-4" /> By year
            </button>
            <button onClick={() => setView("table")} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm", view === "table" ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground")} aria-pressed={view === "table"}>
              <LayoutList className="size-4" /> List
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={toggleAll} disabled={!downloadable.length}>
            {allSelected ? <CheckSquare /> : <Square />} {allSelected ? "Unselect all" : "Select all"}
          </Button>
          <Button size="sm" onClick={downloadAll} disabled={!downloadable.length || zip.busy}>
            <FileArchive /> {filtersActive ? `Download ${downloadable.length} as ZIP` : `Download all (${papers.filter((p) => p.hasFile).length}) as ZIP`}
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState title="No papers match these filters" description="Try another year or type.">
            <Button variant="outline" onClick={() => { setYear("all"); setType("all"); setSem("all"); }}>
              Clear filters
            </Button>
          </EmptyState>
        ) : view === "grouped" ? (
          <div className="space-y-6">
            {byYear.map(([y, list]) => (
              <section key={y} aria-labelledby={`y-${y}`}>
                <div className="mb-2.5 flex items-center gap-3">
                  <h3 id={`y-${y}`} className="text-sm font-semibold tabular-nums">{y}</h3>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">{list.length} paper{list.length === 1 ? "" : "s"}</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((p) => (
                    <PaperCard key={p.id} p={p} moduleCode={moduleCode} selected={selected.has(p.id)} onToggle={() => toggle(p.id)} saved={savedIds.includes(p.id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" className="size-4 accent-[var(--info)]" />
                  </th>
                  <th className="px-3 py-2.5 font-medium">Paper</th>
                  <th className="px-3 py-2.5 font-medium">Year</th>
                  <th className="px-3 py-2.5 font-medium">Sem</th>
                  <th className="px-3 py-2.5 font-medium">Pages</th>
                  <th className="px-3 py-2.5 font-medium">Size</th>
                  <th className="px-3 py-2.5 font-medium">Downloads</th>
                  <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={cn("border-b last:border-0 hover:bg-accent/50", selected.has(p.id) && "bg-info-soft/50")}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} disabled={!p.hasFile} aria-label={`Select ${assessmentLabel(p.assessmentType, p.assessmentNumber)} ${p.academicYear}`} className="size-4 accent-[var(--info)]" />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/papers/${p.id}`} className="font-medium hover:underline">
                        <TypeBadge type={p.assessmentType} number={p.assessmentNumber} />
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{p.academicYear}</td>
                    <td className="px-3 py-2.5">{p.semester}</td>
                    <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{p.pageCount ?? "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{formatBytes(p.fileSize)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{compactNumber(p.downloads)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Link href={`/papers/${p.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                          <BookOpen /> Read
                        </Link>
                        {p.hasFile && (
                          <a href={`/api/papers/${p.id}/download`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Download PDF" title="Download PDF">
                            <Download />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky bulk bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 animate-slide-up">
          <div className="flex w-full max-w-xl items-center gap-2 rounded-2xl border bg-card p-2 pl-4 shadow-[var(--shadow-pop)]">
            <span className="text-sm font-medium">
              {selected.size} selected
              <span className="ml-1.5 font-normal text-muted-foreground">
                · {formatBytes(papers.filter((p) => selected.has(p.id)).reduce((s, p) => s + (p.fileSize ?? 0), 0))}
              </span>
            </span>
            <div className="ml-auto flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button size="sm" onClick={downloadSelected} disabled={zip.busy}>
                <FileArchive /> Download ZIP
              </Button>
            </div>
          </div>
        </div>
      )}
      {zip.dialog}
    </div>
  );
}

function PaperCard({ p, moduleCode, selected, onToggle, saved }: { p: ModulePaper; moduleCode: string; selected: boolean; onToggle: () => void; saved: boolean }) {
  return (
    <div className={cn("group relative flex flex-col rounded-xl border bg-card p-3.5 transition-[border-color,box-shadow] hover:border-input hover:shadow-[var(--shadow-soft)]", selected && "border-info ring-1 ring-info")}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          disabled={!p.hasFile}
          aria-label={`Select ${assessmentLabel(p.assessmentType, p.assessmentNumber)} ${p.academicYear} semester ${p.semester}`}
          className="relative z-10 mt-0.5 size-4 shrink-0 accent-[var(--info)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <TypeBadge type={p.assessmentType} number={p.assessmentNumber} />
            <span className="text-xs text-muted-foreground">Semester {p.semester}</span>
          </div>
          <Link href={`/papers/${p.id}`} className="mt-1.5 block text-sm font-medium after:absolute after:inset-0 after:rounded-xl hover:underline">
            {moduleCode} {assessmentLabel(p.assessmentType, p.assessmentNumber)} — {p.academicYear}
          </Link>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {p.pageCount ? <span>{p.pageCount} pages</span> : null}
            <span>{formatBytes(p.fileSize)}</span>
            <span className="inline-flex items-center gap-1"><Eye className="size-3" />{compactNumber(p.views)}</span>
            <span className="inline-flex items-center gap-1"><Download className="size-3" />{compactNumber(p.downloads)}</span>
          </p>
        </div>
      </div>
      <div className="relative z-10 mt-3 flex items-center gap-1 border-t pt-2.5">
        <Link href={`/papers/${p.id}`} className={buttonVariants({ variant: "ghost", size: "sm", className: "flex-1" })}>
          <BookOpen /> Read
        </Link>
        {p.hasFile && (
          <a href={`/api/papers/${p.id}/download`} className={buttonVariants({ variant: "ghost", size: "sm", className: "flex-1" })}>
            <Download /> PDF
          </a>
        )}
        <SaveButton paperId={p.id} initial={saved} variant="ghost" size="sm" iconOnly />
      </div>
    </div>
  );
}
