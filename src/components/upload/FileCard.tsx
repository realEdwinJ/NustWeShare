"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Copy, FileText, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ASSESSMENT_TYPES, TYPE_LABEL, formatBytes, typeHasNumber } from "@/lib/papers/format";

export type UploadState = "ready" | "uploading" | "added" | "duplicate" | "error";
export type FileMeta = {
  key: string;
  file: File;
  assessmentType: string;
  assessmentNumber: number | null;
  academicYear: number;
  semester: number;
  suggested: boolean;
  state: UploadState;
  progress: number;
  message?: string;
  paperId?: string;
};

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => thisYear - i);

export function FileCard({ meta, onChange, onRemove, onApplyAll, canApplyAll }: { meta: FileMeta; onChange: (p: Partial<FileMeta>) => void; onRemove: () => void; onApplyAll: () => void; canApplyAll: boolean }) {
  const locked = meta.state !== "ready" && meta.state !== "error";
  const needsNumber = typeHasNumber(meta.assessmentType);
  return (
    <div className={cn("rounded-2xl border bg-card p-4", meta.state === "added" && "border-success/40 bg-success-soft/30", meta.state === "error" && "border-destructive/40", meta.state === "duplicate" && "border-warning/40")}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive-soft text-destructive">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={meta.file.name}>{meta.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(meta.file.size)}
            {meta.suggested && meta.state === "ready" && <span className="ml-2 text-success">✓ details read from filename — please check</span>}
          </p>
        </div>
        {meta.state === "uploading" && <Loader2 className="size-5 animate-spin text-info" aria-label="Uploading" />}
        {meta.state === "added" && <CheckCircle2 className="size-5 text-success" aria-label="Added" />}
        {meta.state === "duplicate" && <Copy className="size-5 text-warning" aria-label="Duplicate" />}
        {meta.state === "error" && <AlertCircle className="size-5 text-destructive" aria-label="Error" />}
        {!locked && (
          <button onClick={onRemove} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Remove ${meta.file.name}`}>
            <X className="size-4" />
          </button>
        )}
      </div>

      {meta.state === "uploading" && <Progress value={meta.progress} className="mt-3" />}

      {(meta.state === "ready" || meta.state === "error") && (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <label className="text-xs font-medium text-muted-foreground">
            Type
            <Select value={meta.assessmentType} onChange={(e) => onChange({ assessmentType: e.target.value, assessmentNumber: typeHasNumber(e.target.value) ? meta.assessmentNumber ?? 1 : null })} className="mt-1 h-10 text-sm text-foreground">
              {ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Number
            <Select value={meta.assessmentNumber ?? ""} disabled={!needsNumber} onChange={(e) => onChange({ assessmentNumber: e.target.value ? Number(e.target.value) : null })} className="mt-1 h-10 text-sm text-foreground">
              <option value="">{needsNumber ? "—" : "n/a"}</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Year
            <Select value={meta.academicYear} onChange={(e) => onChange({ academicYear: Number(e.target.value) })} className="mt-1 h-10 text-sm text-foreground">
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Semester
            <Select value={meta.semester} onChange={(e) => onChange({ semester: Number(e.target.value) })} className="mt-1 h-10 text-sm text-foreground">
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </Select>
          </label>
          {canApplyAll && (
            <button onClick={onApplyAll} className="col-span-2 justify-self-start text-xs font-medium text-info hover:underline sm:col-span-4">
              Apply year & semester to all files
            </button>
          )}
        </div>
      )}

      {meta.message && meta.state !== "ready" && (
        <p className={cn("mt-3 text-sm", meta.state === "error" ? "text-destructive" : meta.state === "duplicate" ? "text-warning" : "text-success")}>
          {meta.message}{" "}
          {meta.paperId && (
            <Link href={`/papers/${meta.paperId}`} className="font-medium underline underline-offset-2">
              {meta.state === "duplicate" ? "See existing paper" : "Open paper"}
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
