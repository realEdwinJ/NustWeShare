"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CloudUpload, EyeOff, Heart, PartyPopper, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleSelector, type ModuleOption } from "./ModuleSelector";
import { FileCard, type FileMeta } from "./FileCard";
import { parseFilename } from "@/lib/filename";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/components/providers/session";
import { useToast } from "@/components/ui/toast";
import { ASSESSMENT_TYPES } from "@/lib/papers/format";

const MAX_FILES = 10;
const MAX_BYTES = 3 * 1024 * 1024;

function uploadOne(form: FormData, onProgress: (p: number) => void): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/papers/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 90);
    xhr.onload = () => {
      try {
        resolve({ status: xhr.status, json: JSON.parse(xhr.responseText) });
      } catch {
        resolve({ status: xhr.status, json: {} });
      }
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection."));
    xhr.send(form);
  });
}

export function UploadClient() {
  const params = useSearchParams();
  const user = useSession();
  const { toast } = useToast();
  const [mod, setMod] = useState<ModuleOption | null>(null);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anon, setAnon] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const hp = useRef<HTMLInputElement>(null);

  // Prefill from links such as /upload?module=MCI511S&year=2024&type=EXAM
  useEffect(() => {
    const code = params.get("module");
    if (!code) return;
    fetch(`/api/search?q=${encodeURIComponent(code)}&limit=1`)
      .then((r) => r.json())
      .then((j: any) => {
        const m = j.data?.modules?.[0];
        if (m && m.code.toUpperCase() === code.toUpperCase()) setMod({ code: m.code, name: m.name });
      })
      .catch(() => {});
  }, [params]);

  useEffect(() => {
    if (user) setAnon(!!user.uploadAnonymously);
  }, [user]);

  const prefYear = Number(params.get("year")) || null;
  const prefType = (params.get("type") || "").toUpperCase();

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const problems: string[] = [];
    const next: FileMeta[] = [];
    for (const f of incoming) {
      if (!f.name.toLowerCase().endsWith(".pdf") && f.type !== "application/pdf") problems.push(`${f.name} isn't a PDF`);
      else if (f.size > MAX_BYTES) problems.push(`${f.name} is over 3 MB`);
      else if (f.size === 0) problems.push(`${f.name} is empty`);
      else if (files.some((x) => x.file.name === f.name && x.file.size === f.size)) problems.push(`${f.name} is already added`);
      else {
        const s = parseFilename(f.name);
        const type = s.assessmentType ?? ((ASSESSMENT_TYPES as readonly string[]).includes(prefType) ? prefType : "EXAM");
        next.push({
          key: `${f.name}-${f.size}-${Math.random()}`,
          file: f,
          assessmentType: type,
          assessmentNumber: type === "EXAM" || type === "SUPPLEMENTARY" ? null : (s.assessmentNumber ?? 1),
          academicYear: s.year ?? prefYear ?? new Date().getFullYear(),
          semester: s.semester ?? null, // never guessed: if the filename doesn't say, the student picks
          suggested: !!(s.year || s.assessmentType || s.semester),
          state: "ready",
          progress: 0,
        });
      }
    }
    const room = MAX_FILES - files.length;
    if (next.length > room) problems.push(`Only ${MAX_FILES} files per batch — ${next.length - room} skipped`);
    setFiles((cur) => [...cur, ...next.slice(0, Math.max(0, room))]);
    setNotice(problems.length ? problems.join(" · ") : null);
  }

  const patch = (key: string, p: Partial<FileMeta>) => setFiles((cur) => cur.map((f) => (f.key === key ? { ...f, ...p } : f)));

  async function submit() {
    if (!mod) return;
    setBusy(true);
    let added = 0;
    let backups = 0;
    for (const f of files) {
      if (f.state !== "ready" && f.state !== "error") continue;
      patch(f.key, { state: "uploading", progress: 3, message: undefined });
      const form = new FormData();
      form.set("moduleId", mod.code);
      form.set("website", hp.current?.value ?? "");
      if (user) form.set("anonymous", anon ? "1" : "0");
      form.set("metadata", JSON.stringify([{ filename: f.file.name, assessmentType: f.assessmentType, assessmentNumber: f.assessmentNumber, academicYear: f.academicYear, semester: f.semester }]));
      form.append("files", f.file);
      try {
        const { status, json } = await uploadOne(form, (p) => patch(f.key, { progress: p }));
        if (status >= 400) {
          patch(f.key, { state: "error", message: json.error?.message || "Upload failed." });
          if (status === 429) break;
          continue;
        }
        const r = json.results?.[0];
        if (r?.status === "added") {
          added++;
          patch(f.key, { state: "added", progress: 100, message: "Added — thank you!", paperId: r.paperId });
        } else if (r?.status === "alternate") {
          backups++;
          patch(f.key, { state: "duplicate", progress: 100, message: "This paper is already here, so your copy was kept as a backup.", paperId: r.paperId });
        } else if (r?.status === "duplicate") {
          patch(f.key, { state: "duplicate", progress: 100, message: r.message || "We already have this file.", paperId: r.paperId });
        } else patch(f.key, { state: "error", message: r?.message || "Upload failed." });
      } catch (e: any) {
        patch(f.key, { state: "error", message: e?.message || "Upload failed." });
      }
    }
    setBusy(false);
    if (added) toast({ tone: "success", title: `${added} paper${added === 1 ? "" : "s"} added to ${mod.code}`, description: "Thank you for helping the next student ❤️" });
    else if (backups) toast({ title: `Kept ${backups} backup cop${backups === 1 ? "y" : "ies"}`, description: "Those papers were already here. Moderators can promote a clearer scan." });
  }

  const pending = files.filter((f) => f.state === "ready" || f.state === "error").length;
  const missingSemester = files.filter((f) => (f.state === "ready" || f.state === "error") && !f.semester).length;
  const done = files.length > 0 && pending === 0 && !busy;
  const addedCount = files.filter((f) => f.state === "added").length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold"><span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span> Which module?</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">The code is on the cover page, e.g. MCI511S.</p>
        <ModuleSelector value={mod} onSelect={setMod} />
      </section>

      <section className={cn("rounded-3xl border bg-card p-5 transition-opacity sm:p-6", !mod && "pointer-events-none opacity-50")} aria-disabled={!mod}>
        <h2 className="flex items-center gap-2 font-semibold"><span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span> Add PDFs</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Up to {MAX_FILES} files, 3 MB each. Name files like <span className="font-mono">MCI511S_2024_Test_1.pdf</span> and we&apos;ll fill in the details.</p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (mod) addFiles(e.dataTransfer.files);
          }}
          onClick={() => mod && input.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && mod && input.current?.click()}
          role="button"
          tabIndex={mod ? 0 : -1}
          className={cn("flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors", drag ? "border-info bg-info-soft" : "border-input hover:border-muted-foreground/60 hover:bg-accent/40")}
        >
          <CloudUpload className={cn("size-10", drag ? "text-info" : "text-muted-foreground")} />
          <p className="mt-3 font-medium">{drag ? "Drop to add" : "Drag PDFs here, or tap to choose"}</p>
          <p className="mt-1 text-xs text-muted-foreground">PDF only · max 3 MB each</p>
          <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
        </div>
        <input ref={hp} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        {notice && <p className="mt-3 text-sm text-warning" role="status">{notice}</p>}

        {files.length > 0 && (
          <div className="mt-5 space-y-3">
            {files.map((f) => (
              <FileCard
                key={f.key}
                meta={f}
                onChange={(p) => patch(f.key, p)}
                onRemove={() => setFiles((cur) => cur.filter((x) => x.key !== f.key))}
                canApplyAll={files.length > 1}
                onApplyAll={() => setFiles((cur) => cur.map((x) => (x.state === "ready" ? { ...x, academicYear: f.academicYear, semester: f.semester ?? x.semester } : x)))}
              />
            ))}
          </div>
        )}
      </section>

      {done ? (
        <div className="rounded-3xl border border-success/40 bg-success-soft/40 p-6 text-center">
          <PartyPopper className="mx-auto size-8 text-success" />
          <p className="mt-2 text-lg font-semibold">{addedCount ? `You shared ${addedCount} paper${addedCount === 1 ? "" : "s"}!` : "All done"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Every paper helps the next NUST student.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {mod && <Link href={`/modules/${mod.code.toLowerCase()}`} className={buttonVariants()}>View {mod.code}</Link>}
            <Button variant="outline" onClick={() => setFiles([])}><RotateCcw /> Upload more</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:flex-row sm:flex-wrap sm:items-center sm:p-6">
          {user ? (
            <label className="flex flex-1 items-center gap-3 text-sm">
              <Switch checked={anon} onCheckedChange={setAnon} label="Upload anonymously" />
              <span>
                <span className="flex items-center gap-1.5 font-medium"><EyeOff className="size-4" /> Hide my name on these papers</span>
                <span className="block text-xs text-muted-foreground">They still appear in your dashboard.</span>
              </span>
            </label>
          ) : (
            <p className="flex-1 text-sm text-muted-foreground">
              Uploading as a guest. <Link href="/register?next=/upload" className="font-medium text-info hover:underline">Create a profile</Link> to get credit on the leaderboard.
            </p>
          )}
          {missingSemester > 0 && !busy && (
            <p className="text-sm text-warning sm:order-first sm:basis-full" role="status">
              Choose the semester for {missingSemester} file{missingSemester === 1 ? "" : "s"} — it&apos;s on the paper&apos;s cover page.
            </p>
          )}
          <Button size="lg" variant="brand" onClick={submit} disabled={!mod || pending === 0 || busy || missingSemester > 0} loading={busy}>
            {busy ? "Uploading…" : <><Heart /> Share {pending || ""} paper{pending === 1 ? "" : "s"}</>}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        By uploading you confirm the file is a past assessment you&apos;re allowed to share. Duplicates are detected automatically. See our <Link href="/copyright" className="underline">copyright policy</Link>.
      </p>
    </div>
  );
}
