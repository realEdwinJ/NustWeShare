"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, FileArchive } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/providers/session";
import { downloadAsZip, type BulkFile, type BulkProgress } from "@/lib/client/bulkDownload";
import { formatBytes } from "@/lib/papers/format";

/** Hook + dialog for building and saving a ZIP of papers with live progress and cancel. */
export function useZipDownload() {
  const [state, setState] = useState<{ open: boolean; name: string; progress: BulkProgress | null; error?: string; result?: { saved: number; failed: string[] } }>({ open: false, name: "", progress: null });
  const ctrl = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const user = useSession();

  const start = useCallback(
    async (files: BulkFile[], zipName: string, readme?: (info: { saved: string[]; failed: string[] }) => string) => {
      if (!files.length) return;
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setState({ open: true, name: zipName, progress: { done: 0, total: files.length, bytes: 0, totalBytes: 0, failed: [], phase: "fetching" } });
      try {
        const result = await downloadAsZip(files, zipName, {
          signal: c.signal,
          groupByFolder: (user?.preferences?.zipGrouping ?? "by-year") === "by-year",
          readme,
          onProgress: (p) => setState((s) => ({ ...s, progress: p })),
        });
        setState((s) => ({ ...s, result }));
        toast({
          tone: result.failed.length ? "info" : "success",
          title: `${zipName} is downloading`,
          description: result.failed.length ? `${result.saved} saved, ${result.failed.length} couldn't be fetched.` : `${result.saved} paper${result.saved === 1 ? "" : "s"} in one ZIP.`,
        });
        setTimeout(() => setState((s) => (s.result ? { ...s, open: false } : s)), 1400);
      } catch (e: any) {
        if (e?.name === "AbortError") {
          setState((s) => ({ ...s, open: false }));
          toast({ title: "Download cancelled" });
        } else {
          setState((s) => ({ ...s, error: e?.message || "Download failed." }));
        }
      }
    },
    [toast, user]
  );

  const cancel = () => {
    ctrl.current?.abort();
    setState((s) => ({ ...s, open: false }));
  };

  const p = state.progress;
  const pct = p ? (p.totalBytes ? (p.bytes / p.totalBytes) * 100 : (p.done / Math.max(1, p.total)) * 100) : 0;
  const busy = !!p && p.phase !== "done" && !state.error && !state.result;

  const dialog = (
    <Dialog
      open={state.open}
      onClose={busy ? cancel : () => setState((s) => ({ ...s, open: false }))}
      title={
        <span className="flex items-center gap-2">
          <FileArchive className="size-4 text-info" /> Preparing {state.name}
        </span>
      }
      description="Papers are bundled in your browser — keep this tab open until it finishes."
      size="sm"
      footer={
        busy ? (
          <Button variant="outline" onClick={cancel}>
            Cancel
          </Button>
        ) : (
          <Button onClick={() => setState((s) => ({ ...s, open: false }))}>Close</Button>
        )
      }
    >
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">{state.error}</p>
      ) : state.result ? (
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle2 className="size-5 text-success" />
          <span>
            Saved {state.result.saved} paper{state.result.saved === 1 ? "" : "s"}.
            {state.result.failed.length > 0 && ` ${state.result.failed.length} skipped.`}
          </span>
        </div>
      ) : (
        p && (
          <div className="space-y-3" aria-live="polite">
            <Progress value={pct} />
            <div className="flex justify-between text-sm">
              <span>
                {p.phase === "fetching" ? `Fetching ${Math.min(p.done + 1, p.total)} of ${p.total}` : p.phase === "zipping" ? "Building ZIP…" : "Saving…"}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatBytes(p.bytes)}
                {p.totalBytes ? ` / ${formatBytes(p.totalBytes)}` : ""}
              </span>
            </div>
          </div>
        )
      )}
    </Dialog>
  );

  return { start, dialog, busy };
}
