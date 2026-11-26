import { NextRequest, NextResponse } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isCrossSite(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false; // non-browser clients (curl, server-to-server) — protected by auth/secrets instead
  try {
    return new URL(origin).host !== (req.headers.get("x-forwarded-host") || req.headers.get("host"));
  } catch {
    return true;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // CSRF (Spec 51): block cross-site state-changing API requests outright
  if (isApi && MUTATING.has(req.method) && isCrossSite(req)) {
    return NextResponse.json({ error: { code: "CSRF", message: "Cross-site request blocked." } }, { status: 403 });
  }

  // One canonical URL per module: /modules/MCI511S → /modules/mci511s
  const mod = /^\/modules\/([^/]+)$/.exec(pathname);
  if (mod && req.method === "GET" && mod[1] !== mod[1].toLowerCase()) {
    const url = req.nextUrl.clone();
    url.pathname = `/modules/${mod[1].toLowerCase()}`;
    return NextResponse.redirect(url, 308);
  }

  const res = NextResponse.next();
  if (process.env.NODE_ENV === "production" && req.nextUrl.protocol === "https:") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  if (!isApi) {
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
      ].join("; ")
    );
  }

  if (isApi) {
    const isPrivate =
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/account") ||
      pathname.startsWith("/api/bookmarks") ||
      pathname.startsWith("/api/admin") ||
      pathname.startsWith("/api/dashboard") ||
      pathname.startsWith("/api/papers/upload") ||
      pathname.includes("/report") ||
      pathname === "/api/diag" ||
      pathname === "/api/health";
    if (isPrivate) res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|pdf.worker|icons/).*)"],
};
