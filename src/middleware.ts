import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // CSRF check for state-changing POST to /api (Spec 51) — verify Origin is same-site if present
  if (req.method === "POST" && req.nextUrl.pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      console.warn("[csrf] cross-site POST", { path: req.nextUrl.pathname, origin, host });
    }
  }

  const res = NextResponse.next();

  // Security headers per Spec 51 (CSP, nosniff, frame deny, etc.)
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // For API routes, ensure we don't cache sensitive responses
  if (req.nextUrl.pathname.startsWith("/api/")) {
    // Add rate limit headers if present from route handlers (they set Retry-After)
    // Don't cache auth/report/upload
    if (["/api/auth", "/api/papers/upload", "/api/papers"].some((p) => req.nextUrl.pathname.startsWith(p))) {
      res.headers.set("Cache-Control", "no-store");
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
