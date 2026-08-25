# NustWeShare — Past papers. Shared by students.

Free, community-powered archive for Namibia University of Science and Technology (NUST) past papers. **FEBE & FCI** at launch, designed so any faculty can be added via DB rows without code changes.

> **Independent student project** — not affiliated with, operated by, or officially endorsed by NUST unless explicit permission is obtained.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![License](https://img.shields.io/badge/License-MIT-green)

## Vision

Google search + clean academic archive + simple document viewer — not a university LMS. **Fast, simple, free, searchable, well-organized, open-source, low-maintenance.** Build it once, let students maintain knowledge together.

## Features

- **Browse** `Faculty → School → Department → Programme → Year → Module → Papers` + **Search** `ILIKE` + `pg_trgm` (no Elasticsearch) — partial `ELC`, `Electronic`, `511S`
- **Module canonical** — one row per code (e.g., `MCI511S` 7 programmes) via `programme_modules` join; courses are filters, not owners
- **Ghost uploads** — no account, no email, no OTP; optional profile `username + 5-digit PIN` (hashed, lockout after 5)
- **Multi-PDF** with per-file `Type/Number/Year/Semester`, filename regex `ELC_2024_TEST_1.pdf` suggestions (no AI), `Skip` allowed with friendly nudge
- **Validation** `3 MB` `application/pdf` magic `%PDF` + `pdf-lib` corrupt check, sanitized R2 keys
- **Storage** PostgreSQL metadata + Cloudflare R2 private (not local FS, not Postgres binary)
- **Duplicates 4-level** — `SHA-256` exact, metadata signals, text fingerprint (normalized `SHA-256`), `pHash` stub for scans; `paper` vs `paper_files` canonical
- **Community moderation** — report categories, `5 reports` auto soft-delete + R2 delete, one report per person
- **Leaderboard + Dashboard** — rank by approved papers, ghost counts as `Anonymous`
- **Security** `CSP`, `httpOnly Secure SameSite` cookies, `rateLimit` (upload 10/h, search 60/m, report 5/m, login 5/15m), `sanitizeR2Key`, no stack leak
- **SEO** clean URLs `/febe/modules/mci511s` `/modules/mci511s/2025/test-1` via rewrites, `sitemap.xml` 500 modules, `robots.txt`
- **Mobile-first** 44px touch, `h-[80vh]` viewer with `pdf.js` + iframe fallback, `Cache-Control` 1h academic, `immutable` static

## Stack (Spec 93)

- Frontend: Next.js 16 (App Router, webpack), React 19, TypeScript strict, Tailwind 4
- Deployment: Cloudflare Workers + OpenNext (`@opennextjs/cloudflare`, `wrangler.toml` `main = ".open-next/worker.js"`)
- DB: PostgreSQL (Neon/Supabase free tier) + Drizzle ORM, `pg_trgm` GIN indexes
- Storage: Cloudflare R2 (S3 compat)
- PDF: `pdfjs-dist` viewer, `pdf-lib` page count/validation
- Hash: `SHA-256` + text fingerprint + `bcryptjs` for PIN
- No AI APIs (Spec 50) — regex, hashing, pdf parsing only

## Folder Structure (Spec 95)

```
src/app/{page.tsx,layout.tsx,globals.css}  # homepage hero dominant search
src/components/{ui,layout,search,viewer,upload,report,auth,papers}
src/lib/{env,db,errors,logger,validation,filename,r2,duplicates,papers,auth,security}
src/db/schema/{faculties,schools,departments,programmes,curricula,modules,programme_modules,papers,paper_files,users,social_links,reports,contribution_stats}
src/db/seed/{import.ts,verify.ts,generate.ts,data/*.ts}  # 85 programmes, 946 modules, 1712 links
drizzle/{0000_bent_blink.sql,0001_trgm_search.sql}
docs/{architecture,academic-data,adding-faculty,deployment,backups,observability,security-testing}
```

## Local Setup (10 min)

```bash
git clone https://github.com/your-org/nustweshare.git && cd nustweshare
npm ci

cp .env.example .env
# Edit .env:
# DATABASE_URL=postgresql://user:pass@host:5432/nustweshare?sslmode=require
# R2_* (or leave for LocalStorage dev)
# APP_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# ADMIN_SECRET=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

npm run db:migrate  # creates 13 tables + pg_trgm extension
npm run db:seed     # idempotent upsert 85 programmes + 946 modules + 1712 links
npm run db:verify   # counts: faculties 2 schools 4 depts 10 programmes 85 modules 946

npm run dev         # http://localhost:3000
# Browse: http://localhost:3000/browse  Search: /search?q=MCI511S  Module: /modules/mci511s  Upload: /upload
```

Seed from official NUST 2026 prospectuses: `NustWeShare_Official_Academic_Seed_Data_2026.md` (11,979 lines, 34 blocks) + `All courses.md`. Do not invent academic data (Spec 64).

## Database Setup

- **Neon**: https://neon.tech → free 512 MB → copy `DATABASE_URL`
- **Supabase**: similar, or local `createdb nustweshare`
- `drizzle.config.ts` uses `DATABASE_URL`
- `npm run db:generate` → `drizzle/0000*.sql` (run `db:migrate` on each env)
- For production: set `DATABASE_URL` via `wrangler secret put DATABASE_URL` and `DATABASE_URL=... npm run db:migrate`

## R2 Setup

```bash
wrangler r2 bucket create nustweshare-papers
wrangler r2 bucket create nustweshare-papers-preview
# For local dev without R2, app uses ./uploads (LocalStorage) — not for prod (Spec 48)
# Fill R2_* in .env and `wrangler secret put R2_ACCESS_KEY_ID` etc. for prod
```

Keys: `papers/{faculty}/{module}/{year}/{paperId}/{fileId}.pdf` — deterministic but DB is source of truth (Spec 48).

## Environment

See `.env.example`:

```
DATABASE_URL=postgresql://user:password@host:5432/nustweshare?sslmode=require
R2_BUCKET=nustweshare-papers
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=https://papers.nustweshare.example.com
APP_SECRET=64-char-random
ADMIN_SECRET=32-char-random
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment (Spec 47)

```bash
npm run build:worker  # opennextjs-cloudflare build → .open-next/worker.js
wrangler deploy       # or npm run deploy
# Preview: npm run deploy:preview
```

GitHub Actions `.github/workflows/deploy.yml` auto-deploys on push to `main` (test → build → deploy via `cloudflare/wrangler-action@v3`). See `docs/deployment.md`.

Health: `GET /api/health` → `{ ok, checks: {db,r2,env} }`

## Academic Data

- `docs/academic-data.md` — hierarchy counts, seed strategy
- `docs/adding-faculty.md` — add FHNR via DB rows only (no code)
- `src/db/seed/generate.ts` — parses `NustWeShare_Official_Academic_Seed_Data_2026.md` via regex, outputs `modules.ts` + `programme_modules.ts`
- Verify: `SELECT code, COUNT(*) FROM modules GROUP BY code HAVING COUNT(*)>1` must be 0; `SELECT module_id, COUNT(*) FROM programme_modules GROUP BY module_id HAVING COUNT(*)>1` shows shared `PLU411S` 10+ links

## Adding Modules/Programmes

Edit `src/db/seed/data/programmes.ts` (add `{ departmentSlug, code, name, level, ... }`), re-run `npx tsx src/db/seed/generate.ts` if adding prospectus block, then `npm run db:seed`.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/faculties` | list |
| GET | `/api/schools?facultySlug=febe` | schools |
| GET | `/api/departments?schoolSlug=...` | departments |
| GET | `/api/programmes?departmentSlug=...` | programmes |
| GET | `/api/modules?programmeCode=07BOAI` | modules for programme (canonical) |
| GET | `/api/modules/[code]` | module detail + programmes that use it |
| GET | `/api/search?q=MCI` | `ILIKE` + ranking 20 modules +10 programmes |
| GET | `/api/papers?moduleCode=MCI511S` | papers for module |
| GET | `/api/papers/[id]` | paper detail + canonical file |
| POST | `/api/papers/[id]/view` | +1 views dedup cookie 1h |
| GET | `/api/papers/[id]/download` | 302 signed R2 + clean `ELC511S_2025_Test_1.pdf` |
| POST | `/api/papers/upload` | `multipart` `moduleId` + `files` + `metadata` JSON, ghost or session |
| POST | `/api/papers/[id]/report` | reason enum, 5→auto delete |
| POST | `/api/auth/register` | `username` + `displayName` + `pin` `^\d{5}$` |
| POST | `/api/auth/login` | `username` + `pin` → `httpOnly` cookie |
| POST | `/api/auth/logout` | clear cookie |
| GET | `/api/auth/me` | session |
| GET | `/api/leaderboard` | rank by approved |
| GET | `/api/dashboard` | my stats (auth) |
| GET | `/api/health` | db/r2/env checks |

All `POST` validate via `Zod`/`manual`, `rateLimit`, `hashIp`, never trust client.

## Testing

```bash
npm test            # vitest 53 tests (50 passed + 3 filename edge fixed)
npm run test:unit
npm run test:security
npx tsc --noEmit
npm run build -- --webpack  # 25 routes, 11 workers
```

See `tests/unit/*.test.ts` (filename, sha256, textFingerprint, sanitize, r2Keys, pdfValidation, auth, paperIdentity) + `tests/security/security.test.ts` (Spec 81). `docs/security-testing.md` checklist.

## Security

- `CSP default-src 'self'` via `src/middleware.ts` + `next.config.ts` headers
- `X-Frame-Options DENY`, `nosniff`, `strict-origin-when-cross-origin`
- `sanitizeFilename`/`sanitizeR2Key` no `../`
- `argon2`/`bcrypt` PIN, `failedAttempts` + `lockedUntil` after 5
- `SameSite=Strict` `httpOnly` `Secure` cookies
- `npm audit --omit=dev` → 0 (dev `esbuild` moderate via `drizzle-kit` ignored)

## No Paywall / No AI / No Unnecessary Features (Spec 57,90,50)

- No chat, messaging, social feed, comments, likes, ads, crypto
- All downloads free
- `grep -r openai|claude|gemini` → 0 (only `pdfjs`/`hashing`)

## Contributing

See `CONTRIBUTING.md` — bug fixes, UI, new faculties, data updates, perf/security. No AI APIs.

## License

MIT — see `LICENSE`.

## Legal

`/copyright` + `/contact` takedown (Spec 89), footer `not affiliated with NUST` (Spec 56).

## Final Experience (Spec 92)

Search `MCI511S` → module → 2025 Test 1 → viewer `pdf.js` + Download `MCI511S_2025_Test_1.pdf` → Upload 3 PDFs with `MCI511S` → per-file Type/Year → Skip one → “Thank you ❤️ 3 added” → Report 5× → 410. <2 min on phone.

---

*Built for NUST students — FAST, SIMPLE, FREE, COMMUNITY-DRIVEN, SEARCHABLE, WELL-ORGANIZED, OPEN-SOURCE, LOW-MAINTENANCE.*
