"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  url: string;
  title?: string;
};

export function PDFViewer({ url, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Try PDF.js first
        const pdfjs: any = await import("pdfjs-dist");
        // Use wasm or worker — for Next.js, use the legacy worker via CDN or local
        // Set workerSrc to unpkg or local copy; for MVP we use the built-in worker via pdfjs-dist
        if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
          // Use the worker from pdfjs-dist (webpack will handle)
          try {
            pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
          } catch {}
        }

        const loadingTask = pdfjs.getDocument({ url, withCredentials: false });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setNumPages(pdf.numPages);
        setLoading(false);

        // Render first few pages as canvases for quick preview
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";
        const renderCount = Math.min(pdf.numPages, 5); // render up to 5 pages initially
        for (let i = 1; i <= renderCount; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.maxWidth = "800px";
          canvas.style.margin = "0 auto";
          canvas.style.display = "block";
          canvas.style.marginBottom = "12px";
          canvas.style.border = "1px solid #e2e8f0";
          canvas.style.borderRadius = "12px";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          // @ts-ignore
          await page.render({ canvasContext: ctx, viewport }).promise;
          container.appendChild(canvas);
        }
        if (pdf.numPages > 5) {
          const more = document.createElement("p");
          more.textContent = `+ ${pdf.numPages - 5} more pages — download to view all`;
          more.className = "text-center text-xs text-muted-foreground mt-2";
          container.appendChild(more);
        }
      } catch (e: any) {
        console.warn("[PDFViewer] pdfjs failed, fallback to iframe", e);
        if (!cancelled) {
          setUseIframeFallback(true);
          setLoading(false);
          setError(null);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (useIframeFallback) {
    return (
      <div className="w-full h-[80vh] rounded-2xl overflow-hidden border bg-white">
        <iframe src={url} title={title || "PDF Viewer"} className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {loading && (
        <div className="rounded-2xl border bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading PDF…</p>
          <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden max-w-md mx-auto">
            <div className="h-full w-1/3 bg-primary animate-pulse" />
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive text-center py-4">{error}</p>}
      <div ref={containerRef} className={numPages ? "space-y-2" : "hidden"} aria-label={title || "PDF Viewer"} />
      {numPages && !loading && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          {numPages} page{numPages === 1 ? "" : "s"} ·{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Open in new tab
          </a>
        </p>
      )}
    </div>
  );
}
