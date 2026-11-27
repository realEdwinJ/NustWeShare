import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Form posts (no JS) get redirected home; fetch callers get JSON
  const wantsHtml = (req.headers.get("accept") || "").includes("text/html");
  const res = wantsHtml ? NextResponse.redirect(new URL("/", req.url), 303) : NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return res;
}
