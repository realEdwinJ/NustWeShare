"use client";

import { buildZip, uniqueNames } from "@/lib/zip";

export type BulkFile = { paperId: string; url: string; filename: string; folder?: string; size?: number | null };
export type BulkProgress = { done: number; total: number; bytes: number; totalBytes: number; failed: string[]; phase: "fetching" | "zipping" | "saving" | "done" };

/** Trigger a browser download for a same-origin URL without navigating away. */
export function downloadUrl(url: string, filename?: string) {
  const a = document.createElement("a");
  a.href = url;
  if (filename) a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Fetches each file (3 at a time), builds a ZIP in the browser and saves it.
 * Running client-side keeps Worker CPU near zero and gives real per-file progress.
 */
export async function downloadAsZip(
  files: BulkFile[],
  zipName: string,
  opts: { signal?: AbortSignal; onProgress?: (p: BulkProgress) => void; groupByFolder?: boolean; readme?: (info: { saved: string[]; failed: string[] }) => string } = {}
) {
  const total = files.length;
  const totalBytes = files.reduce((s, f) => s + (f.size ?? 0), 0);
  const results: ({ name: string; data: Uint8Array } | null)[] = new Array(total).fill(null);
  const failed: string[] = [];
  let done = 0;
  let bytes = 0;
  const report = (phase: BulkProgress["phase"]) => opts.onProgress?.({ done, total, bytes, totalBytes, failed: [...failed], phase });
  report("fetching");

  let next = 0;
  async function worker() {
    while (next < total) {
      const i = next++;
      const f = files[i];
      try {
        const res = await fetch(f.url, { signal: opts.signal, credentials: "same-origin" });
        if (!res.ok) throw new Error(String(res.status));
        const reader = res.body?.getReader();
        let data: Uint8Array;
        if (reader) {
          const chunks: Uint8Array[] = [];
          let len = 0;
          for (;;) {
            const { value, done: d } = await reader.read();
            if (d) break;
            chunks.push(value);
            len += value.length;
            bytes += value.length;
            report("fetching");
          }
          data = new Uint8Array(len);
          let o = 0;
          for (const c of chunks) {
            data.set(c, o);
            o += c.length;
          }
        } else {
          data = new Uint8Array(await res.arrayBuffer());
          bytes += data.length;
        }
        results[i] = { name: opts.groupByFolder && f.folder ? `${f.folder}/${f.filename}` : f.filename, data };
      } catch (e: any) {
        if (e?.name === "AbortError") throw e;
        failed.push(f.filename);
      } finally {
        done++;
        report("fetching");
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, total) }, worker));
  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const ok = results.filter(Boolean) as { name: string; data: Uint8Array }[];
  if (ok.length === 0) throw new Error("None of the files could be downloaded.");
  report("zipping");
  const names = uniqueNames(ok.map((r) => r.name));
  const entries = ok.map((r, i) => ({ name: names[i], data: r.data }));
  if (opts.readme) entries.push({ name: "README.txt", data: new TextEncoder().encode(opts.readme({ saved: names, failed })) });
  const parts = buildZip(entries, "Downloaded from NustWeShare");
  report("saving");
  saveBlob(new Blob(parts as BlobPart[], { type: "application/zip" }), zipName);
  report("done");
  return { saved: ok.length, failed };
}
