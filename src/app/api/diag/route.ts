import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  let hyperdrivePresent = false;
  let hasConnectionString = false;
  let prefix = "n/a";
  let isWorkersRuntime = false;
  let getCloudflareContextError: string | null = null;
  let dbError: string | null = null;
  let dbOk = false;

  try {
    isWorkersRuntime =
      typeof (globalThis as any).WebSocketPair !== "undefined" ||
      typeof (globalThis as any).caches?.default !== "undefined";
  } catch {}

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx: any = getCloudflareContext();
    hyperdrivePresent = !!ctx?.env?.HYPERDRIVE;
    hasConnectionString = !!ctx?.env?.HYPERDRIVE?.connectionString;
    if (ctx?.env?.HYPERDRIVE?.connectionString) {
      prefix = String(ctx.env.HYPERDRIVE.connectionString).slice(0, 30);
    }
  } catch (e: any) {
    getCloudflareContextError = e?.message?.slice(0, 200) || String(e).slice(0, 200);
  }

  // Try actual DB query
  try {
    const { getDb } = await import("@/lib/db");
    const { faculties } = await import("@/db/schema/faculties");
    const db = getDb();
    const rows = await db.select().from(faculties).limit(1);
    dbOk = true;
  } catch (e: any) {
    const cause = e?.cause ? ` | cause: ${(e.cause as any)?.message?.slice(0, 300) || String(e.cause).slice(0, 300)}` : "";
    dbError = (e?.message?.slice(0, 400) || String(e).slice(0, 400)) + cause;
  }

  return NextResponse.json({
    hyperdrivePresent,
    hasConnectionString,
    prefix,
    isWorkersRuntime,
    getCloudflareContextError,
    dbOk,
    dbError,
    hasLocalDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlPrefix: process.env.DATABASE_URL ? String(process.env.DATABASE_URL).slice(0, 30) : "n/a",
    timestamp: new Date().toISOString(),
  });
}
