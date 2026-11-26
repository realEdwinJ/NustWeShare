"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { EditPaperDialog } from "@/components/papers/EditPaperDialog";
import { TypeBadge } from "@/components/papers/ModulePapers";
import { compactNumber } from "@/lib/papers/format";
import { RelTime } from "@/components/ui/rel-time";

type Item = {
  fileId: string; paperId: string; moduleCode: string; moduleName: string; academicYear: number; semester: number;
  assessmentType: string; assessmentNumber: number | null; views: number; downloads: number; status: string; hideUploader: boolean; uploadedAt: string;
};

export function MyUploads({ items }: { items: Item[] }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>(Object.fromEntries(items.map((i) => [i.fileId, i.hideUploader])));
  const { toast } = useToast();
  const router = useRouter();

  async function toggleHide(id: string, v: boolean) {
    setHidden((h) => ({ ...h, [id]: v }));
    const r = await fetch(`/api/account/uploads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hideUploader: v }) });
    if (!r.ok) {
      setHidden((h) => ({ ...h, [id]: !v }));
      toast({ tone: "error", title: "Couldn't update" });
    } else {
      toast({ tone: "success", title: v ? "Now shown as Anonymous" : "Your name is shown" });
      router.refresh();
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Paper</th>
            <th className="px-4 py-2.5 font-medium">Stats</th>
            <th className="px-4 py-2.5 font-medium">Uploaded</th>
            <th className="px-4 py-2.5 font-medium">Show my name</th>
            <th className="px-4 py-2.5 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.fileId} className="border-b last:border-0">
              <td className="px-4 py-3">
                {u.status === "active" ? (
                  <Link href={`/papers/${u.paperId}`} className="group block">
                    <span className="flex items-center gap-2">
                      <span className="font-mono font-semibold group-hover:underline">{u.moduleCode}</span>
                      <TypeBadge type={u.assessmentType} number={u.assessmentNumber} />
                      <span className="tabular-nums text-muted-foreground">{u.academicYear} S{u.semester}</span>
                    </span>
                    <span className="block max-w-xs truncate text-xs text-muted-foreground">{u.moduleName}</span>
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-mono">{u.moduleCode}</span> {u.academicYear} <Badge variant="destructive">Removed</Badge>
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{compactNumber(u.views)}</span>
                <span className="ml-3 inline-flex items-center gap-1"><Download className="size-3.5" />{compactNumber(u.downloads)}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground"><RelTime date={u.uploadedAt} /></td>
              <td className="px-4 py-3">
                {u.status === "active" && (
                  <span className="flex items-center gap-2">
                    <Switch checked={!hidden[u.fileId]} onCheckedChange={(v) => toggleHide(u.fileId, !v)} label="Show my name on this paper" />
                    {hidden[u.fileId] && <EyeOff className="size-4 text-muted-foreground" aria-label="Anonymous" />}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {u.status === "active" && (
                  <EditPaperDialog compact paper={{ id: u.paperId, moduleCode: u.moduleCode, academicYear: u.academicYear, semester: u.semester, assessmentType: u.assessmentType, assessmentNumber: u.assessmentNumber }} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
