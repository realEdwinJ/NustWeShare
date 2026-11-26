"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, HardDriveDownload, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { assessmentLabel, timeAgo } from "@/lib/papers/format";

type Backup = { fileId: string; paperId: string; moduleCode: string; academicYear: number; semester: number; assessmentType: string; assessmentNumber: number | null; fileSize: number; pageCount: number | null; originalFilename: string; uploadedAt: string; uploader: string | null };
type Row = { paperId: string; status: string; moduleCode: string; academicYear: number; semester: number; assessmentType: string; assessmentNumber: number | null; reportCount: number; reasons: string[]; lastReportAt: string };

export function AdminClient({ lastScan }: { lastScan: { checked: number; hidden: number; checkedAt: string; by?: string } | null }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<"open" | "removed" | "backups">("open");
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const describe = (r: { checked: number; hidden: number; checkedAt: string; by?: string }) =>
    `Last storage check ${timeAgo(r.checkedAt)}${r.by ? ` by @${r.by}` : ""}: ${r.checked} files checked, ${r.hidden ? `${r.hidden} paper(s) hidden for missing files` : "all present"}.`;
  const [scanResult, setScanResult] = useState<string | null>(lastScan ? describe(lastScan) : "Storage hasn't been checked yet.");
  useEffect(() => {
    if (filter !== "backups" || backups) return;
    fetch("/api/admin/backups").then((r) => r.json()).then((j: any) => setBackups(j.data ?? [])).catch(() => setBackups([]));
  }, [filter, backups]);
  async function actBackup(id: string, action: "promote" | "delete") {
    const r = await fetch(`/api/admin/backups/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (!r.ok) return toast({ tone: "error", title: "Action failed" });
    toast({ tone: "success", title: action === "promote" ? "Backup is now the main file" : "Backup deleted" });
    setBackups(null);
  }
  const { toast } = useToast();
  useEffect(() => {
    fetch("/api/admin/reports").then((r) => r.json()).then((j: any) => setRows(j.data ?? [])).catch(() => setRows([]));
  }, []);

  async function act(id: string, action: "dismiss" | "remove") {
    const r = await fetch(`/api/admin/papers/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (!r.ok) return toast({ tone: "error", title: "Action failed" });
    toast({ tone: "success", title: action === "dismiss" ? "Reports dismissed" : "Paper removed" });
    setRows((rs) => (action === "dismiss" ? rs?.filter((x) => x.paperId !== id) ?? null : rs?.map((x) => (x.paperId === id ? { ...x, status: "deleted" } : x)) ?? null));
  }

  const [scanning, setScanning] = useState(false);
  async function scan() {
    setScanning(true);
    try {
      const r = await fetch("/api/admin/integrity", { method: "POST" });
      const j = (await r.json()) as any;
      if (!r.ok) throw new Error(j.error?.message);
      const summary = j.data.hidden ? `${j.data.hidden} paper(s) had missing files and were hidden until re-uploaded.` : "Every file is present in storage.";
      setScanResult(describe(j.data));
      toast({ tone: j.data.hidden ? "info" : "success", title: `Checked ${j.data.checked} files`, description: summary });
    } catch (e: any) {
      toast({ tone: "error", title: e?.message || "Scan failed" });
    } finally {
      setScanning(false);
    }
  }

  const shown = rows?.filter((r) => (filter === "open" ? r.status !== "deleted" : r.status === "deleted")) ?? [];
  return (
    <section className="mt-8">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={scan} loading={scanning} className="order-last ml-auto">
          <HardDriveDownload /> Check storage integrity
        </Button>
        {(["open", "removed", "backups"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "secondary" : "ghost"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>
      {scanResult && <p className="mt-3 text-sm text-muted-foreground" role="status">{scanResult}</p>}
      <div className="mt-4">
        {filter === "backups" ? (
          backups === null ? (
            <div className="skeleton h-32 rounded-2xl" />
          ) : backups.length === 0 ? (
            <EmptyState icon={<ShieldCheck />} title="No backup copies" description="When someone uploads a paper that already exists, their copy waits here. Promote it if it's a better scan." />
          ) : (
            <ul className="divide-y rounded-2xl border bg-card">
              {backups.map((b) => (
                <li key={b.fileId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/papers/${b.paperId}`} className="font-medium hover:underline">
                      <span className="font-mono">{b.moduleCode}</span> {assessmentLabel(b.assessmentType, b.assessmentNumber)} {b.academicYear} S{b.semester}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {b.originalFilename} · {b.pageCount ?? "?"} pages · {Math.round(b.fileSize / 1024)} KB · by {b.uploader ?? "guest"} · {timeAgo(b.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/api/admin/files/${b.fileId}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-surface px-3 text-[13px] font-medium hover:bg-accent">
                      Preview
                    </a>
                    <Button size="sm" variant="outline" onClick={() => actBackup(b.fileId, "promote")}><Check /> Make main file</Button>
                    <Button size="sm" variant="destructive" onClick={() => actBackup(b.fileId, "delete")}><Trash2 /> Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : rows === null ? (
          <div className="skeleton h-32 rounded-2xl" />
        ) : shown.length === 0 ? (
          <EmptyState icon={<ShieldCheck />} title={filter === "open" ? "Nothing to review" : "No removed papers"} description="Reported papers show up here." />
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {shown.map((r) => (
              <li key={r.paperId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/papers/${r.paperId}`} className="font-medium hover:underline">
                    <span className="font-mono">{r.moduleCode}</span> {assessmentLabel(r.assessmentType, r.assessmentNumber)} {r.academicYear} S{r.semester}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant={r.reportCount >= 3 ? "destructive" : "warning"}>{r.reportCount} report{r.reportCount === 1 ? "" : "s"}</Badge>
                    {r.reasons.map((x) => <Badge key={x} variant="outline">{x.replace(/_/g, " ")}</Badge>)}
                    <span className="text-xs text-muted-foreground">last {timeAgo(r.lastReportAt)}</span>
                  </div>
                </div>
                {r.status !== "deleted" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => act(r.paperId, "dismiss")}><Check /> Keep</Button>
                    <Button size="sm" variant="destructive" onClick={() => act(r.paperId, "remove")}><Trash2 /> Remove</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
