"use client";

import { useState, useRef } from "react";
import { ModuleSelector } from "./ModuleSelector";
import { FileCard } from "./FileCard";
import { parseFilename } from "@/lib/filename";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ModuleOption = { code: string; name: string };
type FileMeta = {
  file: File;
  assessmentType: string | null;
  assessmentNumber: number | null;
  academicYear: number | null;
  semester: number | null;
  skip: boolean;
};

export function UploadClient() {
  const [selectedModule, setSelectedModule] = useState<ModuleOption | null>(null);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(newFiles: FileList | File[]) {
    const arr = Array.from(newFiles);
    const next: FileMeta[] = [];
    for (const f of arr) {
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
        setError(`"${f.name}" is not a PDF — only PDFs are allowed.`);
        continue;
      }
      if (f.size > 3 * 1024 * 1024) {
        setError(`"${f.name}" is larger than the 3 MB limit.`);
        continue;
      }
      if (f.size === 0) {
        setError(`"${f.name}" appears to be empty.`);
        continue;
      }
      const s = parseFilename(f.name);
      next.push({
        file: f,
        assessmentType: s.assessmentType ?? null,
        assessmentNumber: s.assessmentNumber ?? null,
        academicYear: s.year ?? null,
        semester: null, // not inferred from filename reliably
        skip: false,
      });
    }
    setFiles((prev) => [...prev, ...next].slice(0, 10));
    setError(null);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  function updateFile(idx: number, patch: Partial<FileMeta>) {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit() {
    if (!selectedModule) {
      setError("Please select a module first.");
      return;
    }
    if (files.length === 0) {
      setError("Please select at least one PDF.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set("moduleId", selectedModule.code);
      const metadata = files.map((f) => ({
        filename: f.file.name,
        assessmentType: f.skip ? null : f.assessmentType,
        assessmentNumber: f.skip ? null : f.assessmentNumber,
        academicYear: f.skip ? null : f.academicYear,
        semester: f.skip ? null : f.semester,
      }));
      form.set("metadata", JSON.stringify(metadata));
      for (const f of files) form.append("files", f.file);

      const res = await fetch("/api/papers/upload", { method: "POST", body: form });
      const json = (await res.json()) as any;
      if (!res.ok) {
        setError(json.error?.message || "Upload failed.");
      } else {
        setResult(json);
        // Clear files on success? Keep for review
        if (json.summary?.added > 0) {
          // Optionally clear
        }
      }
    } catch (e: any) {
      setError(e.message || "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Select module (required)</CardTitle>
          <CardDescription>Every paper must have at least one reliable academic anchor.</CardDescription>
        </CardHeader>
        <CardContent>
          <ModuleSelector value={selectedModule} onSelect={setSelectedModule} />
          {!selectedModule && <p className="mt-2 text-xs text-amber-600">Upload is disabled until a valid module is selected.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Select PDFs</CardTitle>
          <CardDescription>Up to 10 files, 3 MB each. Drag & drop or click to browse.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? "border-primary bg-accent" : "border-muted-foreground/20 hover:border-muted-foreground/40"} ${!selectedModule ? "opacity-50 pointer-events-none" : ""}`}
          >
            <p className="text-sm font-medium">Drop PDFs here</p>
            <p className="mt-1 text-xs text-muted-foreground">or</p>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={!selectedModule}
              className="mt-3 inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 min-h-[44px]"
            >
              Browse files
            </button>
            <input ref={inputRef} type="file" accept=".pdf" multiple onChange={onInputChange} className="hidden" disabled={!selectedModule} />
            <p className="mt-3 text-xs text-muted-foreground">Max 3 MB per file · Only PDFs</p>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{files.length} file{files.length > 1 ? "s" : ""} selected</p>
                <button onClick={() => setFiles([])} className="text-xs hover:underline text-muted-foreground">
                  Clear all
                </button>
              </div>
              {files.map((meta, idx) => (
                <FileCard key={`${meta.file.name}-${idx}`} meta={meta} onChange={(p) => updateFile(idx, p)} onRemove={() => removeFile(idx)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <button
          onClick={onSubmit}
          disabled={!selectedModule || files.length === 0 || submitting}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-slate-800 disabled:opacity-50 min-h-[44px] flex-1 sm:flex-none"
        >
          {submitting ? "Uploading…" : `Upload ${files.length ? `(${files.length})` : ""}`}
        </button>
        {files.length > 0 && (
          <button onClick={() => setFiles([])} className="inline-flex items-center justify-center rounded-xl border bg-background px-5 py-3 text-sm font-medium hover:bg-accent min-h-[44px]">
            Cancel
          </button>
        )}
      </div>

      {!selectedModule && files.length === 0 && (
        <p className="text-xs text-muted-foreground">Select a module above to enable upload. Help keep NustWeShare organized ❤️ — adding year and type makes papers easier to find.</p>
      )}

      {result && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="text-base">Thank you for contributing to NustWeShare ❤️</CardTitle>
            <CardDescription>
              Papers uploaded: {result.summary?.total ?? files.length} · Successfully added: {result.summary?.added ?? 0} · Potential duplicates: {result.summary?.duplicates ?? 0}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result.results?.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl border bg-card px-3 py-2">
                <span className="font-mono text-xs truncate">{r.filename}</span>
                <span className="flex items-center gap-2">
                  {r.status === "added" && <Badge>Added</Badge>}
                  {r.status === "duplicate" && <Badge variant="outline">Possible duplicate</Badge>}
                  {r.status === "error" && <Badge variant="outline">{r.message}</Badge>}
                </span>
              </div>
            ))}
            {result.summary?.duplicates > 0 && (
              <p className="text-xs text-muted-foreground">
                Possible duplicate detected — an existing paper appears to contain the same assessment. If you believe it&apos;s a different paper, you can upload anyway (contact support for force upload).
              </p>
            )}
            <p className="text-xs text-muted-foreground">You contributed {selectedModule ? `for ${selectedModule.code}` : "anonymously"}.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
