# Security Testing — Spec 81

Run `npm run test:security` (manual checklist for MVP, automated in Stage 16).

## Checklist

- [ ] **Invalid PDF uploads** — POST /api/papers/upload with .exe renamed .pdf → 400 `That file doesn't look like a valid PDF`
- [ ] **Oversized files** — 3.1 MB PDF → 413 `This PDF is larger than the 3 MB limit`
- [ ] **Total payload too large** — 5×3MB (15MB) → 413 `Total upload too large`
- [ ] **Honeypot** — POST with `website=spam` → 400 Bot detected
- [ ] **Malformed requests** — POST /api/papers/upload without moduleId → 400 `Module is required`
- [ ] **Duplicate reports** — POST /api/papers/:id/report twice same IP → 409 `You've already reported`
- [ ] **Brute-force PIN** — 5 wrong logins → 429 `Too many failed attempts` + lockout, 6th within window blocked
- [ ] **SQL injection** — `'; DROP TABLE faculties; --` in search?q → safe via Drizzle parameterized `ILIKE`, no error leak
- [ ] **XSS** — `<script>alert(1)</script>` in username/details → escaped via React, stored raw but rendered escaped, CSP blocks inline
- [ ] **Unauthorized API access** — GET /api/dashboard without cookie → 401
- [ ] **Forged module IDs** — POST upload with moduleId=99999 → 404 `We couldn't find that module`
- [ ] **Manipulated filenames** — `../../../etc/passwd.pdf` → sanitized to `etc_passwd.pdf`, R2 key `papers/fci/...` safe, no traversal
- [ ] **Malicious R2 keys** — `../` in key → 400 `Invalid R2 key: traversal not allowed`
- [ ] **Rate limits** — search 61/min → 429, upload 11/hour → 429, report 6/min → 429
- [ ] **CSRF** — POST from cross-origin Origin header logged, SameSite=Strict cookies block, no state change without cookie
- [ ] **Secrets not leaked** — `grep -r APP_SECRET src` only server, no client bundle, `.env` not committed
- [ ] **No stack traces** — trigger 500 via DB down → response `Something went wrong` not `Failed query: select...`
- [ ] **CSP headers** — `curl -I /` → `Content-Security-Policy: default-src 'self' ...`
- [ ] **Secure cookies** — `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict` (Secure in prod)
- [ ] **PIN hashing** — `SELECT pin_hash FROM users` → `$2b$10$...` not plaintext, never logged
- [ ] **Audit** — `npm audit --omit=dev` → 0 vulnerabilities (dev esbuild moderate ignored, not prod)

## Run

```bash
npm audit --omit=dev
npx tsc --noEmit
npm run build
# manual curl tests above
```

All must pass before market-ready.
