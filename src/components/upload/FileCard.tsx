"use client";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseFilename } from "@/lib/filename";

type FileMeta = {
  file: File;
  assessmentType: string | null;
  assessmentNumber: number | null;
  academicYear: number | null;
  semester: number | null;
  skip: boolean;
};

const TYPES = ["TEST", "EXAM", "SUPPLEMENTARY", "QUIZ", "ASSIGNMENT", "LAB", "TUTORIAL"] as const;
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 12 }, (_, i) => currentYear + 1 - i); // e.g., 2027 down to 2016

export function FileCard({
  meta,
  onChange,
  onRemove,
}: {
  meta: FileMeta;
  onChange: (patch: Partial<FileMeta>) => void;
  onRemove: () => void;
}) {
  const suggestion = parseFilename(meta.file.name);
  const showSkipHint = meta.skip;

  // Auto-fill from filename parsing if fields are null and not skipped
  // This is suggestion only, user can correct
  const displayType = meta.assessmentType ?? suggestion.assessmentType ?? "";
  const displayYear = meta.academicYear ?? suggestion.year ?? null;

  const isExamOrSupp = displayType === "EXAM" || displayType === "SUPPLEMENTARY";

  return (
    <Card className={meta.skip ? "opacity-80" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-semibold truncate" title={meta.file.name}>
              {meta.file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {(meta.file.size / 1024).toFixed(0)} KB · {meta.file.type || "application/pdf"}
              {suggestion.confidence === "high" && <span className="ml-2 text-emerald-600">Suggested: {suggestion.assessmentType} {suggestion.year}</span>}
            </p>
          </div>
          <button onClick={onRemove} className="text-xs font-medium hover:underline text-muted-foreground">
            Remove
          </button>
        </div>

        {meta.skip ? (
          <div className="mt-4 rounded-xl bg-muted/50 p-4">
            <p className="text-sm">Skipped details — we&apos;ll keep it organized ❤️</p>
            <p className="text-xs text-muted-foreground">Adding the year and paper type makes this paper much easier for other students to find.</p>
            <button onClick={() => onChange({ skip: false })} className="mt-2 text-sm font-medium hover:underline">
              Add details
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium">Type</span>
              <select
                value={meta.assessmentType ?? ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  onChange({ assessmentType: v, assessmentNumber: v === "EXAM" || v === "SUPPLEMENTARY" ? null : meta.assessmentNumber });
                }}
                className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Select type</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="font-medium">Number {isExamOrSupp && <span className="text-muted-foreground">(not needed)</span>}</span>
              <select
                value={meta.assessmentNumber ?? ""}
                onChange={(e) => onChange({ assessmentNumber: e.target.value ? parseInt(e.target.value, 10) : null })}
                disabled={isExamOrSupp || !meta.assessmentType}
                className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-50"
              >
                <option value="">—</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="font-medium">Year</span>
              <select
                value={meta.academicYear ?? ""}
                onChange={(e) => onChange({ academicYear: e.target.value ? parseInt(e.target.value, 10) : null })}
                className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Select year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {suggestion.year && !meta.academicYear && <span className="text-xs text-muted-foreground">Suggested: {suggestion.year}</span>}
            </label>

            <label className="text-sm">
              <span className="font-medium">Semester</span>
              <select
                value={meta.semester ?? ""}
                onChange={(e) => onChange({ semester: e.target.value ? parseInt(e.target.value, 10) : null })}
                className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Select semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </label>

            <div className="sm:col-span-2 flex gap-2 pt-1">
              <button onClick={() => onChange({ skip: true })} className="text-xs font-medium hover:underline text-muted-foreground">
                Skip — Help keep NustWeShare organized ❤️
              </button>
            </div>
          </div>
        )}

        {!meta.skip && (!meta.assessmentType || !meta.academicYear || !meta.semester) && (
          <p className="mt-3 text-xs text-amber-600">Tip: Adding the year and paper type makes this paper much easier to find. You can skip if in a hurry.</p>
        )}
      </CardContent>
    </Card>
  );
}
