import { NextRequest, NextResponse } from "next/server";
import { serveStoredFile } from "@/lib/r2/serve";

export const dynamic = "force-dynamic";

// Legacy raw-key endpoint (kept for old links). New code uses /api/papers/[id]/file and /download.
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const decoded = key
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .join("/");
  if (!decoded.startsWith("papers/") || decoded.includes("..") || decoded.includes("\\") || decoded.length > 500) {
    return new NextResponse("Invalid key", { status: 400 });
  }
  const download = req.nextUrl.searchParams.get("download");
  try {
    return await serveStoredFile(req, decoded, {
      disposition: download ? "attachment" : "inline",
      filename: download || decoded.split("/").pop() || "paper.pdf",
    });
  } catch (e) {
    console.error("[files] failed", e);
    return new NextResponse("Storage error", { status: 500 });
  }
}
