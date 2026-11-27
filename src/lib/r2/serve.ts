import { NextRequest, NextResponse } from "next/server";

type ServeOpts = { disposition: "inline" | "attachment"; filename: string; cacheControl?: string };

function getBucket(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    return getCloudflareContext()?.env?.PAPERS_BUCKET ?? null;
  } catch {
    return null;
  }
}

export function contentDisposition(type: "inline" | "attachment", filename: string) {
  const safe = filename.replace(/["\\\r\n]/g, "").slice(0, 200) || "paper.pdf";
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

/** Parses a single "bytes=a-b" range header. Returns null when absent/unsatisfiable-ignorable. */
export function parseRange(header: string | null, size: number): { offset: number; length: number } | "invalid" | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, s, e] = m;
  if (s === "" && e === "") return null;
  let start: number;
  let end: number;
  if (s === "") {
    const suffix = parseInt(e, 10);
    if (suffix === 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(s, 10);
    end = e === "" ? size - 1 : Math.min(parseInt(e, 10), size - 1);
  }
  if (start >= size || end < start) return "invalid";
  return { offset: start, length: end - start + 1 };
}

function baseHeaders(opts: ServeOpts, etag?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": contentDisposition(opts.disposition, opts.filename),
    "Cache-Control": opts.cacheControl ?? "private, max-age=3600",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    // Allow our own pages to embed the PDF (viewer fallback), nobody else
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
  };
  if (etag) h["ETag"] = etag;
  return h;
}

/** Streams an object from R2 (or ./uploads in dev) with Range + conditional GET support. */
export async function serveStoredFile(req: NextRequest, key: string, opts: ServeOpts): Promise<Response> {
  const bucket = getBucket();
  const rangeHeader = req.headers.get("range");
  const ifNoneMatch = req.headers.get("if-none-match");

  if (bucket) {
    const head = await bucket.head(key);
    if (!head) return new NextResponse("Not found", { status: 404 });
    const etag = head.httpEtag as string | undefined;
    if (etag && ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: baseHeaders(opts, etag) });
    }
    const size = head.size as number;
    const range = parseRange(rangeHeader, size);
    if (range === "invalid") {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const obj = await bucket.get(key, range ? { range } : undefined);
    if (!obj) return new NextResponse("Not found", { status: 404 });
    const headers = baseHeaders(opts, etag);
    if (range) {
      headers["Content-Range"] = `bytes ${range.offset}-${range.offset + range.length - 1}/${size}`;
      headers["Content-Length"] = String(range.length);
      return new NextResponse(obj.body, { status: 206, headers });
    }
    headers["Content-Length"] = String(size);
    return new NextResponse(obj.body, { status: 200, headers });
  }

  // Local dev fallback
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const base = path.join(process.cwd(), "uploads");
  const full = path.join(base, key);
  if (!full.startsWith(base + path.sep)) return new NextResponse("Invalid", { status: 400 });
  let data: Buffer;
  try {
    data = await fs.readFile(full);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const etag = `"${data.length.toString(16)}-${(await fs.stat(full)).mtimeMs.toString(16)}"`;
  if (ifNoneMatch && ifNoneMatch === etag) return new NextResponse(null, { status: 304, headers: baseHeaders(opts, etag) });
  const range = parseRange(rangeHeader, data.length);
  if (range === "invalid") return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${data.length}` } });
  const headers = baseHeaders(opts, etag);
  if (range) {
    headers["Content-Range"] = `bytes ${range.offset}-${range.offset + range.length - 1}/${data.length}`;
    headers["Content-Length"] = String(range.length);
    return new NextResponse(new Uint8Array(data.subarray(range.offset, range.offset + range.length)), { status: 206, headers });
  }
  headers["Content-Length"] = String(data.length);
  return new NextResponse(new Uint8Array(data), { status: 200, headers });
}
