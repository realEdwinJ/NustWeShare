"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, ExternalLink, Maximize2, Minimize2, Minus, PanelLeft, Plus, RotateCw, Search, X, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { readingPosition } from "@/lib/client/library";

type ZoomMode = "fit-width" | "fit-page" | number;
type PageSize = { w: number; h: number }; // at scale 1, rotation 0

const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const GAP = 16;

type Props = {
  url: string;
  title?: string;
  docId?: string;
  downloadUrl?: string;
  defaultZoom?: "fit-width" | "fit-page" | "100";
  onPageCount?: (n: number) => void;
  uploadHref?: string;
};

export function PDFViewer({ url, title, docId, downloadUrl, defaultZoom = "fit-width", onPageCount, uploadHref }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const pdfjsRef = useRef<any>(null);
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);
  const rendered = useRef<Map<number, { scale: number; rotation: number; task?: any; textDivs?: HTMLElement[] }>>(new Map());
  const textCache = useRef<Map<number, string[]>>(new Map());

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const [missing, setMissing] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [sizes, setSizes] = useState<PageSize[]>([]);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState<ZoomMode>(defaultZoom === "100" ? 1 : defaultZoom);
  const [rotation, setRotation] = useState(0);
  const [containerW, setContainerW] = useState(800);
  const [containerH, setContainerH] = useState(600);
  const [sidebar, setSidebar] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<{ page: number; idx: number }[]>([]);
  const [matchIdx, setMatchIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const [resumeFrom, setResumeFrom] = useState<number | null>(null);
  const findInput = useRef<HTMLInputElement>(null);

  // ── Load document ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let task: any;
    (async () => {
      try {
        setStatus("loading");
        setProgress(0);
        const pdfjs: any = await import("pdfjs-dist");
        pdfjsRef.current = pdfjs;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        task = pdfjs.getDocument({ url, rangeChunkSize: 262144, isEvalSupported: false, disableFontFace: false });
        task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
          if (total) setProgress(Math.min(99, (loaded / total) * 100));
        };
        const pdf = await task.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        // Page sizes: read all (cheap metadata) for accurate placeholders
        const list: PageSize[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const p = await pdf.getPage(i);
          const vp = p.getViewport({ scale: 1, rotation: 0 });
          list.push({ w: vp.width, h: vp.height });
          if (cancelled) return;
        }
        rendered.current.clear();
        textCache.current.clear();
        setSizes(list);
        setNumPages(pdf.numPages);
        onPageCount?.(pdf.numPages);
        setStatus("ready");
        if (docId) {
          const pos = readingPosition.get(docId);
          if (pos && pos > 1 && pos <= pdf.numPages) setResumeFrom(pos);
        }
      } catch (e: any) {
        if (cancelled) return;
        console.warn("[PDFViewer]", e);
        const gone = e?.status === 404 || e?.status === 410;
        setMissing(gone);
        setErrMsg(e?.name === "InvalidPDFException" ? "This file isn't a readable PDF." : gone ? "This paper's file is missing." : "We couldn't load this document.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      try {
        task?.destroy();
      } catch {}
      pdfRef.current = null;
    };
  }, [url, docId, onPageCount]);

  // ── Measure container ─────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerW(el.clientWidth);
      setContainerH(el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [status]);

  const rotated = useCallback((s: PageSize) => (rotation % 180 === 0 ? s : { w: s.h, h: s.w }), [rotation]);

  const scale = useMemo(() => {
    if (!sizes.length) return 1;
    // Widest page drives "fit" modes so mixed-size documents keep one stable scale
    const base = sizes.map(rotated).reduce((a, b) => (b.w > a.w ? b : a));
    const pad = containerW < 640 ? 16 : 48;
    if (zoom === "fit-width") return Math.max(0.25, (containerW - pad) / base.w);
    if (zoom === "fit-page") return Math.max(0.25, Math.min((containerW - pad) / base.w, (containerH - 32) / base.h));
    return zoom;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, containerW, containerH, sizes, rotated]);

  // ── Render a page (canvas + text layer) ───────────────────────
  const renderPage = useCallback(
    async (n: number) => {
      const pdf = pdfRef.current;
      const pdfjs = pdfjsRef.current;
      const host = pageEls.current[n - 1];
      if (!pdf || !host || !pdfjs) return;
      const prev = rendered.current.get(n);
      if (prev && prev.scale === scale && prev.rotation === rotation) return;
      try {
        prev?.task?.cancel();
      } catch {}
      const entry: { scale: number; rotation: number; task?: any; textDivs?: HTMLElement[] } = { scale, rotation };
      rendered.current.set(n, entry);
      const p = await pdf.getPage(n);
      const viewport = p.getViewport({ scale, rotation });
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.className = "block";
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      const task = p.render({ canvasContext: ctx, canvas, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
      entry.task = task;
      try {
        await task.promise;
      } catch (e: any) {
        if (e?.name === "RenderingCancelledException") return;
        throw e;
      }
      if (rendered.current.get(n) !== entry) return; // superseded
      const layer = document.createElement("div");
      layer.className = "textLayer";
      host.style.setProperty("--total-scale-factor", String(scale));
      host.querySelector("canvas")?.remove();
      host.querySelector(".textLayer")?.remove();
      host.prepend(canvas);
      host.appendChild(layer);
      host.dataset.rendered = "1";
      host.querySelector(".page-ph")?.remove();
      try {
        const tl = new pdfjs.TextLayer({ textContentSource: p.streamTextContent(), container: layer, viewport });
        await tl.render();
        entry.textDivs = tl.textDivs as HTMLElement[];
        applyHighlights(n);
      } catch {}
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scale, rotation]
  );

  // ── Lazy render + current page tracking ───────────────────────
  useEffect(() => {
    if (status !== "ready") return;
    const root = scrollRef.current;
    if (!root) return;
    const renderIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) renderPage(Number((e.target as HTMLElement).dataset.page));
      },
      { root, rootMargin: "150% 0px" }
    );
    const visible = new Map<number, number>();
    const pageIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(Number((e.target as HTMLElement).dataset.page), e.intersectionRatio);
        let best = 1;
        let bestR = -1;
        for (const [k, v] of visible) if (v > bestR) [best, bestR] = [k, v];
        setPage(best);
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    pageEls.current.forEach((el) => {
      if (el) {
        renderIo.observe(el);
        pageIo.observe(el);
      }
    });
    return () => {
      renderIo.disconnect();
      pageIo.disconnect();
    };
  }, [status, renderPage, numPages]);

  // Re-render visible pages after zoom/rotation change (keep position)
  const anchor = useRef<{ page: number; frac: number } | null>(null);
  useEffect(() => {
    if (status !== "ready") return;
    const a = anchor.current;
    if (a) {
      const el = pageEls.current[a.page - 1];
      if (el && scrollRef.current) scrollRef.current.scrollTop = el.offsetTop + a.frac * el.offsetHeight - GAP;
      anchor.current = null;
    }
    pageEls.current.forEach((el, i) => {
      if (!el || !scrollRef.current) return;
      const r = el.getBoundingClientRect();
      const rr = scrollRef.current.getBoundingClientRect();
      if (r.bottom > rr.top - rr.height && r.top < rr.bottom + rr.height) renderPage(i + 1);
    });
  }, [scale, rotation, status, renderPage]);

  function keepAnchor() {
    const el = pageEls.current[page - 1];
    const sc = scrollRef.current;
    if (el && sc) anchor.current = { page, frac: Math.max(0, (sc.scrollTop - el.offsetTop + GAP) / el.offsetHeight) };
  }

  useEffect(() => {
    setPageInput(String(page));
    if (docId && status === "ready") readingPosition.set(docId, page);
  }, [page, docId, status]);

  const goTo = useCallback((n: number, behavior: ScrollBehavior = "smooth") => {
    const target = Math.max(1, Math.min(numPages, n));
    const el = pageEls.current[target - 1];
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - GAP / 2, behavior });
  }, [numPages]);

  function zoomBy(dir: 1 | -1) {
    keepAnchor();
    const cur = scale;
    const next = dir > 0 ? ZOOM_STEPS.find((z) => z > cur + 0.01) ?? 3 : [...ZOOM_STEPS].reverse().find((z) => z < cur - 0.01) ?? 0.5;
    setZoom(next);
  }

  // ── Fullscreen ───────────────────────────────────────────────
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen?.().catch(() => setFullscreen((v) => !v));
  }

  // ── Find in document ─────────────────────────────────────────
  async function pageText(n: number): Promise<string[]> {
    const cached = textCache.current.get(n);
    if (cached) return cached;
    const p = await pdfRef.current.getPage(n);
    const tc = await p.getTextContent();
    const items = tc.items.map((it: any) => ("str" in it ? it.str : ""));
    textCache.current.set(n, items);
    return items;
  }

  const queryRef = useRef("");
  const matchRef = useRef<{ page: number; idx: number } | null>(null);

  function applyHighlights(n: number) {
    const entry = rendered.current.get(n);
    const divs = entry?.textDivs;
    if (!divs) return;
    const q = queryRef.current.toLowerCase();
    divs.forEach((d, i) => {
      const orig = d.dataset.orig ?? d.textContent ?? "";
      const lower = orig.toLowerCase();
      if (!q || !lower.includes(q)) {
        if (d.dataset.orig !== undefined) {
          d.textContent = orig;
          delete d.dataset.orig;
        }
        return;
      }
      // Wrap only the matching characters so the highlight hugs the word, not the whole line
      d.dataset.orig = orig;
      const isCurrent = matchRef.current?.page === n && matchRef.current?.idx === i;
      const frag = document.createDocumentFragment();
      let pos = 0;
      let first = true;
      for (let at = lower.indexOf(q); at !== -1; at = lower.indexOf(q, at + q.length)) {
        if (at > pos) frag.append(orig.slice(pos, at));
        const mark = document.createElement("span");
        mark.className = isCurrent && first ? "hl current" : "hl";
        mark.textContent = orig.slice(at, at + q.length);
        frag.append(mark);
        pos = at + q.length;
        first = false;
      }
      if (pos < orig.length) frag.append(orig.slice(pos));
      d.replaceChildren(frag);
    });
  }

  useEffect(() => {
    if (!findOpen) return;
    const q = query.trim();
    queryRef.current = q;
    if (q.length < 2 || !pdfRef.current) {
      setMatches([]);
      matchRef.current = null;
      rendered.current.forEach((_, n) => applyHighlights(n));
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const found: { page: number; idx: number }[] = [];
      for (let n = 1; n <= numPages; n++) {
        const items = await pageText(n);
        if (cancelled) return;
        items.forEach((s, idx) => {
          if (s.toLowerCase().includes(q.toLowerCase())) found.push({ page: n, idx });
        });
      }
      setMatches(found);
      setMatchIdx(0);
      setSearching(false);
      matchRef.current = found[0] ?? null;
      rendered.current.forEach((_, n) => applyHighlights(n));
      if (found[0]) goTo(found[0].page);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, findOpen, numPages]);

  function stepMatch(dir: 1 | -1) {
    if (!matches.length) return;
    const next = (matchIdx + dir + matches.length) % matches.length;
    setMatchIdx(next);
    matchRef.current = matches[next];
    rendered.current.forEach((_, n) => applyHighlights(n));
    goTo(matches[next].page);
  }

  function closeFind() {
    setFindOpen(false);
    setQuery("");
    queryRef.current = "";
    matchRef.current = null;
    setMatches([]);
    rendered.current.forEach((_, n) => applyHighlights(n));
  }

  // ── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    if (status !== "ready") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFindOpen(true);
        setTimeout(() => findInput.current?.focus(), 0);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      switch (e.key) {
        case "ArrowRight":
        case "n":
        case "j":
          e.preventDefault();
          goTo(page + 1);
          break;
        case "ArrowLeft":
        case "p":
        case "k":
          e.preventDefault();
          goTo(page - 1);
          break;
        case "+":
        case "=":
          e.preventDefault();
          zoomBy(1);
          break;
        case "-":
          e.preventDefault();
          zoomBy(-1);
          break;
        case "0":
          keepAnchor();
          setZoom("fit-width");
          break;
        case "r":
          keepAnchor();
          setRotation((r) => (r + 90) % 360);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "Home":
          if (t === document.body || rootRef.current?.contains(t)) {
            e.preventDefault();
            goTo(1);
          }
          break;
        case "End":
          if (t === document.body || rootRef.current?.contains(t)) {
            e.preventDefault();
            goTo(numPages);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, numPages, scale, goTo]);

  // Ctrl/⌘ + wheel zoom inside the viewer
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) > 60) {
        zoomBy(acc < 0 ? 1 : -1);
        acc = 0;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, scale]);

  const zoomLabel = zoom === "fit-width" ? "Fit width" : zoom === "fit-page" ? "Fit page" : `${Math.round(scale * 100)}%`;

  // ── UI ───────────────────────────────────────────────────────
  return (
    <div
      ref={rootRef}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-viewer",
        fullscreen ? "fixed inset-0 z-[70] rounded-none border-0" : "h-[78vh] min-h-[480px] sm:h-[82vh]"
      )}
      aria-label={title ? `Document reader: ${title}` : "Document reader"}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-surface/95 px-2 py-1.5 backdrop-blur sm:gap-1.5 sm:px-3" role="toolbar" aria-label="Reader controls">
        <Button variant="ghost" size="icon-sm" onClick={() => setSidebar((v) => !v)} aria-pressed={sidebar} aria-label="Toggle page thumbnails" className="hidden sm:inline-flex" disabled={status !== "ready"}>
          <PanelLeft />
        </Button>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" onClick={() => goTo(page - 1)} disabled={page <= 1 || status !== "ready"} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(pageInput, 10);
              if (Number.isFinite(n)) goTo(n, "auto");
              else setPageInput(String(page));
            }}
            className="flex items-center gap-1 text-sm tabular-nums"
          >
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onBlur={() => setPageInput(String(page))}
              inputMode="numeric"
              aria-label="Page number"
              className="h-8 w-11 rounded-lg border bg-background text-center text-sm outline-none focus:border-ring"
              disabled={status !== "ready"}
            />
            <span className="text-muted-foreground">/ {numPages || "–"}</span>
          </form>
          <Button variant="ghost" size="icon-sm" onClick={() => goTo(page + 1)} disabled={page >= numPages || status !== "ready"} aria-label="Next page">
            <ChevronRight />
          </Button>
        </div>

        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" onClick={() => zoomBy(-1)} aria-label="Zoom out" disabled={status !== "ready"}>
            <Minus />
          </Button>
          <select
            value={typeof zoom === "number" ? String(zoom) : zoom}
            onChange={(e) => {
              keepAnchor();
              const v = e.target.value;
              setZoom(v === "fit-width" || v === "fit-page" ? v : parseFloat(v));
            }}
            className="hidden h-8 rounded-lg border bg-background px-2 text-sm outline-none focus:border-ring sm:block"
            aria-label="Zoom level"
            disabled={status !== "ready"}
          >
            <option value="fit-width">Fit width</option>
            <option value="fit-page">Fit page</option>
            {ZOOM_STEPS.map((z) => (
              <option key={z} value={String(z)}>
                {Math.round(z * 100)}%
              </option>
            ))}
            {typeof zoom === "number" && !ZOOM_STEPS.includes(zoom) && <option value={String(zoom)}>{zoomLabel}</option>}
          </select>
          <Button variant="ghost" size="icon-sm" onClick={() => zoomBy(1)} aria-label="Zoom in" disabled={status !== "ready"}>
            <Plus />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            keepAnchor();
            setRotation((r) => (r + 90) % 360);
          }}
          aria-label="Rotate pages"
          disabled={status !== "ready"}
          className="hidden sm:inline-flex"
        >
          <RotateCw />
        </Button>

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setFindOpen((v) => !v);
              setTimeout(() => findInput.current?.focus(), 0);
            }}
            aria-pressed={findOpen}
            aria-label="Find in document (Ctrl+F)"
            disabled={status !== "ready"}
          >
            <Search />
          </Button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex">
            <span className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-accent" title="Open in new tab">
              <ExternalLink className="size-4" />
              <span className="sr-only">Open in new tab</span>
            </span>
          </a>
          {downloadUrl && (
            <a href={downloadUrl} className="hidden size-8 items-center justify-center rounded-lg hover:bg-accent sm:inline-flex" title="Download PDF">
              <Download className="size-4" />
              <span className="sr-only">Download PDF</span>
            </a>
          )}
          <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"}>
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>

        {findOpen && (
          <div className="flex w-full items-center gap-1.5 pt-1.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={findInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    stepMatch(e.shiftKey ? -1 : 1);
                  } else if (e.key === "Escape") closeFind();
                }}
                placeholder="Find in document…"
                className="h-8 w-full rounded-lg border bg-background pl-8 pr-20 text-sm outline-none focus:border-ring"
                aria-label="Find in document"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {searching ? "…" : query.trim().length >= 2 ? (matches.length ? `${matchIdx + 1} of ${matches.length}` : "No matches") : ""}
              </span>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => stepMatch(-1)} disabled={!matches.length} aria-label="Previous match">
              <ChevronUp />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => stepMatch(1)} disabled={!matches.length} aria-label="Next match">
              <ChevronDown />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={closeFind} aria-label="Close find">
              <X />
            </Button>
          </div>
        )}
      </div>

      {status === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8" role="status">
          <div className="w-full max-w-[min(520px,90%)] space-y-3">
            <div className="skeleton mx-auto aspect-[1/1.414] w-full max-w-sm rounded-lg" />
            <Progress value={progress || 8} className="mx-auto max-w-sm" />
            <p className="text-center text-sm text-muted-foreground">Opening document{progress > 0 ? ` · ${Math.round(progress)}%` : "…"}</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center" role="alert">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-warning-soft text-warning">
            <AlertTriangle className="size-6" />
          </div>
          <p className="font-medium">{errMsg}</p>
          {missing ? (
            <>
              <p className="max-w-sm text-sm text-muted-foreground">It has been hidden until someone re-uploads it. If you have a copy, you can restore it for everyone.</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {uploadHref && (
                  <a href={uploadHref} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-brand-foreground hover:brightness-105">
                    Upload a replacement
                  </a>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="max-w-sm text-sm text-muted-foreground">It may be a temporary network problem. Your browser may still open it directly.</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => location.reload()}>
                  Try again
                </Button>
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-surface px-4 text-sm font-medium hover:bg-accent">
                  <ExternalLink className="size-4" /> Open in new tab
                </a>
                {downloadUrl && (
                  <a href={downloadUrl} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
                    <Download className="size-4" /> Download
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {status === "ready" && (
        <div className="relative flex min-h-0 flex-1">
          {sidebar && <Thumbnails pdf={pdfRef.current} sizes={sizes} current={page} onSelect={(n) => goTo(n, "auto")} />}
          <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-auto overscroll-contain outline-none" tabIndex={0} aria-label="Pages">
            <div className="mx-auto flex w-max min-w-full flex-col items-center" style={{ paddingTop: GAP, paddingBottom: GAP * 2, gap: GAP }}>
              {sizes.map((s, i) => {
                const r = rotated(s);
                return (
                  <div
                    key={i}
                    ref={(el) => {
                      pageEls.current[i] = el;
                    }}
                    data-page={i + 1}
                    className="pdf-page relative shrink-0 overflow-hidden bg-white shadow-[0_1px_3px_rgb(0_0_0/0.12),0_8px_24px_-8px_rgb(0_0_0/0.25)]"
                    style={{ width: Math.floor(r.w * scale), height: Math.floor(r.h * scale) }}
                    aria-label={`Page ${i + 1}`}
                    role="img"
                  >
                    <span className="page-ph pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400" aria-hidden="true">{i + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {resumeFrom && (
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-card py-1.5 pl-4 pr-1.5 text-sm shadow-[var(--shadow-pop)] animate-slide-up">
              <span>Continue from page {resumeFrom}?</span>
              <Button size="sm" onClick={() => { goTo(resumeFrom, "auto"); setResumeFrom(null); }}>
                Resume
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setResumeFrom(null)} aria-label="Dismiss">
                <X />
              </Button>
            </div>
          )}
          <div className="pointer-events-none absolute bottom-3 right-4 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium tabular-nums text-white sm:hidden">
            {page} / {numPages}
          </div>
        </div>
      )}
    </div>
  );
}

function Thumbnails({ pdf, sizes, current, onSelect }: { pdf: any; sizes: PageSize[]; current: number; onSelect: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(new Set<number>());
  const W = 112;

  useEffect(() => {
    const root = ref.current;
    if (!root || !pdf) return;
    const io = new IntersectionObserver(
      async (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          const n = Number(el.dataset.thumb);
          if (done.current.has(n)) continue;
          done.current.add(n);
          const p = await pdf.getPage(n);
          const base = p.getViewport({ scale: 1 });
          const vp = p.getViewport({ scale: (W / base.width) * 2 });
          const c = document.createElement("canvas");
          c.width = vp.width;
          c.height = vp.height;
          c.style.width = "100%";
          c.style.height = "100%";
          await p.render({ canvasContext: c.getContext("2d")!, canvas: c, viewport: vp }).promise.catch(() => {});
          el.querySelector(".thumb-slot")?.replaceChildren(c);
        }
      },
      { root, rootMargin: "200px 0px" }
    );
    root.querySelectorAll("[data-thumb]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pdf]);

  useEffect(() => {
    ref.current?.querySelector(`[data-thumb="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  return (
    <div ref={ref} className="w-40 shrink-0 overflow-y-auto border-r bg-surface/60 p-3" aria-label="Page thumbnails">
      <div className="flex flex-col items-center gap-3">
        {sizes.map((s, i) => (
          <button
            key={i}
            data-thumb={i + 1}
            onClick={() => onSelect(i + 1)}
            className="group flex flex-col items-center gap-1"
            aria-label={`Go to page ${i + 1}`}
            aria-current={current === i + 1 ? "page" : undefined}
          >
            <span
              className={cn("thumb-slot block overflow-hidden rounded-sm bg-white ring-2 ring-offset-2 ring-offset-transparent transition", current === i + 1 ? "ring-info" : "ring-transparent group-hover:ring-input")}
              style={{ width: W, height: Math.round((s.h / s.w) * W) }}
            />
            <span className={cn("text-xs tabular-nums", current === i + 1 ? "font-semibold text-foreground" : "text-muted-foreground")}>{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
