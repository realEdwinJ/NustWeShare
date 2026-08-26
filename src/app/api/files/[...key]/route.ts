import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Serves files from R2 (native binding PAPERS_BUCKET) in Workers, fallback to LocalStorage ./uploads in dev
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  // Decode each segment individually to preserve slashes correctly (fixes encodeURIComponent bug from viewerUrl)
  const decodedSegments = key.map((seg) => {
    try { return decodeURIComponent(seg); } catch { return seg; }
  });
  const decoded = decodedSegments.join("/");
  // Prevent traversal — check both raw and decoded
  if (decoded.includes("..") || decoded.includes("\\") || decoded.startsWith("/")) return new NextResponse("Invalid key", { status: 400 });
  if (decoded.length > 500) return new NextResponse("Key too long", { status: 400 });

  // Try native R2 binding first (Workers) — gracefully handle missing binding (dev) vs real Worker
  let bucket: any = null;
  try {
    // @ts-ignore — only available in Cloudflare Workers runtime via OpenNext
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    bucket = ctx?.env?.PAPERS_BUCKET ?? null;
  } catch {
    // Not in Workers runtime — expected for next dev
    bucket = null;
  }
  const downloadParam = req.nextUrl.searchParams.get("download");
  const isDownload = !!downloadParam;
  const dispositionFilename = downloadParam || decoded.split("/").pop() || "paper.pdf";

  if (bucket) {
    try {
      const obj = await bucket.get(decoded);
      if (!obj) return new NextResponse("Not found", { status: 404 });
      const buf = await obj.arrayBuffer();
      const contentType = obj.httpMetadata?.contentType || "application/pdf";
      const safeFilename = dispositionFilename.replace(/\"/g, "").slice(0, 200);
      const disposition = isDownload ? "attachment" : "inline";
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(buf.byteLength),
          "Cache-Control": "public, max-age=3600, immutable",
          "Content-Disposition": `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (e: any) {
      console.error("[files] R2 get failed", e?.message ?? e);
      return new NextResponse("Storage error", { status: 500 });
    }
  }

  // Fallback to LocalStorage ./uploads for dev
  const base = path.join(process.cwd(), "uploads");
  const full = path.join(base, decoded);
  if (!full.startsWith(base)) return new NextResponse("Invalid", { status: 400 });
  try {
    const data = await fs.readFile(full);
    const safeFilename = dispositionFilename.replace(/\"/g, "").slice(0, 200);
    const disposition = isDownload ? "attachment" : "inline";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
