import { NextRequest, NextResponse } from "next/server";

export function getClientIp(req: NextRequest | Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export function jsonError(code: string, message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...(extra ?? {}) } }, { status });
}

export async function readJson<T = any>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
