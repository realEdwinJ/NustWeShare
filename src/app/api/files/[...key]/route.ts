import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Serves files from R2 (native binding PAPERS_BUCKET) in Workers, fallback to LocalStorage ./uploads in dev
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const joined = key.join("/");
  const decoded = decodeURIComponent(joined);
  // Prevent traversal
  if (decoded.includes("..")) return new NextResponse("Invalid", { status: 400 });

  // Try native R2 binding first (Workers)
  try {
    // @ts-ignore — only available in Cloudflare Workers runtime via OpenNext
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const bucket = ctx?.env?.PAPERS_BUCKET;
    if (bucket) {
      const obj = await bucket.get(decoded);
      if (!obj) return new NextResponse("Not found", { status: 404 });
      const buf = await obj.arrayBuffer();
      const contentType = obj.httpMetadata?.contentType || "application/pdf";
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(buf.byteLength),
          "Cache-Control": "public, max-age=3600",
          "Content-Disposition": `inline; filename="${encodeURIComponent(decoded.split("/").pop() || "paper.pdf")}"`,
        },
      });
    }
  } catch {}

  // Fallback to LocalStorage ./uploads for dev
  const base = path.join(process.cwd(), "uploads");
  const full = path.join(base, decoded);
  if (!full.startsWith(base)) return new NextResponse("Invalid", { status: 400 });
  try {
    const data = await fs.readFile(full);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
