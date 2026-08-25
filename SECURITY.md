# Security Policy

## Reporting a Vulnerability

Email: security@nustweshare.example (or open a private GitHub Security Advisory).

**Do not** open a public issue for sensitive vulns.

We will acknowledge within 3 days and fix within 14 days.

## Scope

- `src/app/api` — injection, auth, rate limits, file validation
- `src/lib/security` — sanitization, rate limiting

## What Is Covered

- XSS via CSP `default-src 'self'` + React escaping
- SQL injection via Drizzle parameterized
- File traversal via `sanitizeR2Key`
- PIN brute-force lockout after 5 fails
- Rate limits: upload 10/hour, search 60/min, report 5/min, login 5/15min

## Out of Scope

- Cloudflare Workers infra (report to Cloudflare)
- Postgres/R2 (report to provider)

## Audit

See `docs/security-testing.md` for checklist per Spec 81.

`npm audit --omit=dev` must be 0 for market-ready (dev esbuild moderate ignored).
