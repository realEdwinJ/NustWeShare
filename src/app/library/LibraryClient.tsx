"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Bookmark, FileArchive, History, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TypeBadge } from "@/components/papers/ModulePapers";
import { useZipDownload } from "@/components/papers/ZipDownload";
import { guestSaved, recentPapers, type RecentPaper } from "@/lib/client/library";
import { downloadFilename, timeAgo } from "@/lib/papers/format";

type P = { id: string; moduleCode: string; moduleName: string; academicYear: number; semester: number; assessmentType: string; assessmentNumber: number | null; fileSize: number | null; hasFile: boolean; createdAt: string };

export function LibraryClient({ signedIn, saved: serverSaved, followed }: { signedIn: boolean; saved: P[]; followed: { code: string; name: string; papers: number; newSince: number }[] }) {
  const [tab, setTab] = useState<"saved" | "modules" | "history">("saved");
  const [saved, setSaved] = useState<P[]>(serverSaved);
  const [recent, setRecent] = useState<RecentPaper[]>([]);
  const zip = useZipDownload();

  useEffect(() => {
    setRecent(recentPapers.list());
    if (!signedIn) {
      const ids = guestSaved.list();
      if (ids.length) fetch(`/api/papers/batch?ids=${ids.join(",")}`).then((r) => r.json()).then((j: any) => setSaved(j.data ?? [])).catch(() => {});
    }
  }, [signedIn]);

  const tabs = [
    { id: "saved" as const, label: "Saved papers", icon: Bookmark, n: saved.length },
    { id: "modules" as const, label: "Following", icon: Bell, n: followed.length },
    { id: "history" as const, label: "History", icon: History, n: recent.length },
  ];

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-2 border-b" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm", tab === t.id ? "border-info font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="size-4" /> {t.label}
            <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{t.n}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "saved" &&
          (saved.length === 0 ? (
            <EmptyState icon={<Bookmark />} title="Nothing saved yet" description="Tap Save on any paper to keep it here for revision.">
              <Link href="/browse" className={buttonVariants()}>Find papers</Link>
            </EmptyState>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                {!signedIn ? (
                  <p className="text-sm text-muted-foreground">
                    Saved on this device only. <Link href="/register?next=/library" className="font-medium text-info hover:underline">Create a profile</Link> to sync.
                  </p>
                ) : <span />}
                <Button
                  size="sm"
                  onClick={() =>
                    zip.start(
                      saved.filter((p) => p.hasFile).map((p) => ({ paperId: p.id, url: `/api/papers/${p.id}/download`, filename: downloadFilename(p), folder: p.moduleCode, size: p.fileSize })),
                      `NustWeShare_saved_${saved.length}.zip`
                    )
                  }
                  disabled={zip.busy}
                >
                  <FileArchive /> Download all as ZIP
                </Button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {saved.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
                    <Link href={`/papers/${p.id}`} className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{p.moduleCode}</span>
                        <TypeBadge type={p.assessmentType} number={p.assessmentNumber} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{p.academicYear} S{p.semester} · {p.moduleName}</span>
                    </Link>
                    {!signedIn && (
                      <button onClick={() => { guestSaved.toggle(p.id); setSaved((s) => s.filter((x) => x.id !== p.id)); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Remove">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ))}

        {tab === "modules" &&
          (!signedIn ? (
            <EmptyState icon={<Bell />} title="Log in to follow modules" description="Followed modules appear on your home page with new papers highlighted.">
              <Link href="/login?next=/library" className={buttonVariants()}>Log in</Link>
              <Link href="/register?next=/library" className={buttonVariants({ variant: "outline" })}>Create profile</Link>
            </EmptyState>
          ) : followed.length === 0 ? (
            <EmptyState icon={<Bell />} title="Not following any modules" description="Open a module and tap Follow." />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {followed.map((m) => (
                <Link key={m.code} href={`/modules/${m.code.toLowerCase()}`} className="rounded-xl border bg-card p-4 hover:border-input">
                  <span className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold">{m.code}</span>
                    {m.newSince > 0 && <span className="rounded-full bg-info px-2 py-0.5 text-[11px] font-semibold text-white">{m.newSince} new</span>}
                  </span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">{m.name}</span>
                  <span className="mt-2 block text-xs text-muted-foreground">{m.papers} papers</span>
                </Link>
              ))}
            </div>
          ))}

        {tab === "history" &&
          (recent.length === 0 ? (
            <EmptyState icon={<History />} title="No reading history" description="Papers you open are listed here (stored only on this device)." />
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => { recentPapers.clear(); setRecent([]); }}>
                  <Trash2 /> Clear history
                </Button>
              </div>
              <ul className="divide-y rounded-2xl border bg-card">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/papers/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50">
                      <span className="font-mono text-sm font-semibold">{r.moduleCode}</span>
                      <span className="text-sm">{r.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{timeAgo(r.at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ))}
      </div>
      {zip.dialog}
    </div>
  );
}
