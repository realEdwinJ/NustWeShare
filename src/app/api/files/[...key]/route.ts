import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Serves files from LocalStorage (dev only). Production uses R2 signed URLs directly.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const joined = key.join("/");
  const decoded = decodeURIComponent(joined);
  // Prevent traversal
  if (decoded.includes("..")) return new NextResponse("Invalid", { status: 400 });
  const base = path.join(process.cwd(), "uploads");
  const full = path.join(base, decoded);
  // Ensure inside base
  if (!full.startsWith(base)) return new NextResponse("Invalid", { status: 400 });
  try {
    const data = await fs.readFile(full);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=3600",
        // Allow PDF.js to fetch via range? For MVP, no range support
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
