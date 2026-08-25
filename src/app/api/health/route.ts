import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; msg?: string; latencyMs?: number }> = {};
  const start = Date.now();

  // DB check
  try {
    const t0 = Date.now();
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    // Simple query: count faculties (should be 2)
    const { faculties } = await import("@/db/schema/faculties");
    const rows = await db.select().from(faculties).limit(1);
    checks.db = { ok: true, latencyMs: Date.now() - t0, msg: `faculties=${rows.length >= 0 ? "ok" : "empty"}` };
  } catch (e: any) {
    checks.db = { ok: false, msg: e.message?.slice(0, 120) || String(e).slice(0, 120) };
  }

  // R2 check — try to list or get from storage abstraction (dev uses LocalStorage)
  try {
    const t0 = Date.now();
    const { getStorage } = await import("@/lib/r2/client");
    const storage = getStorage();
    // Try to get a non-existent key — should return null, not throw
    const res = await storage.get("health-check-probe");
    checks.r2 = { ok: true, latencyMs: Date.now() - t0, msg: res === null ? "ok (probe null)" : "ok" };
  } catch (e: any) {
    checks.r2 = { ok: false, msg: e.message?.slice(0, 120) || String(e).slice(0, 120) };
  }

  // Env check
  try {
    const { getEnv } = await import("@/lib/env");
    getEnv();
    checks.env = { ok: true };
  } catch (e: any) {
    checks.env = { ok: false, msg: e.message?.slice(0, 80) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const latency = Date.now() - start;

  return NextResponse.json(
    {
      ok: allOk,
      checks,
      latencyMs: latency,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
    },
    { status: allOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
