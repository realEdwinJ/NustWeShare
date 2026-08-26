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
      // unsafe-eval removed; pdfjs worker loaded via blob: or CDN should use workerSrc without eval
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://cdnjs.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "worker-src 'self' blob:",
    ].join("; ")
  );

  // For API routes, ensure we don't cache sensitive responses
  // IMPORTANT: only no-store for mutating / private endpoints, not for public GET listings (papers, modules, search, faculties)
  // Previous bug: /api/papers (GET public) was forced no-store, conflicting with handler's public s-maxage
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const isPrivate =
      req.nextUrl.pathname.startsWith("/api/auth") ||
      req.nextUrl.pathname.startsWith("/api/papers/upload") ||
      req.nextUrl.pathname.startsWith("/api/papers/") && req.nextUrl.pathname.includes("/report") ||
      req.nextUrl.pathname.startsWith("/api/dashboard") ||
      req.nextUrl.pathname === "/api/diag" ||
      req.nextUrl.pathname === "/api/health";
    const isPublicGet = req.method === "GET" && [
      "/api/papers",
      "/api/modules",
      "/api/faculties",
      "/api/schools",
      "/api/departments",
      "/api/programmes",
      "/api/search",
      "/api/leaderboard",
    ].some((p) => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(p + "/"));
    if (isPrivate) {
      res.headers.set("Cache-Control", "no-store");
    } else if (isPublicGet) {
      // Let route handler control cache; don't override
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

