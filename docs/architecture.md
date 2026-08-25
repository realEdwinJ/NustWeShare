# NustWeShare — Architecture (STAGE 1.1)

> Spec: `NustWeShare — Master Spec.md:2444-2473` — 20-point analysis before implementation. Source: Master Spec 96 sections (2,517 lines), `All courses.md` 303 lines, `NustWeShare_Official_Academic_Seed_Data_2026.md` 11,979 lines / 34 curriculum blocks. Prospectuses: FCI 2026 + FEBE 2026.

## 1. Recommended Architecture

**Stack per Spec 93:** Next.js 15 (App Router) + React + TypeScript strict + Tailwind CSS on Cloudflare Workers via OpenNext, PostgreSQL (Neon/Supabase free tier) via Drizzle ORM, Cloudflare R2 for PDFs, PDF.js viewer, Zod validation. No AI APIs (Spec 50).

**Pattern:** Server-centric Next.js with abstraction layers for portability (Spec 94). Business logic (`createPaper()`, `findDuplicate()`, `createReport()`, `deleteAfterFiveReports()`) never imports `cloudflare:` or `pg:` directly — it depends on interfaces `Storage`, `DB`, `Auth`, `RateLimit` implemented in `lib/storage`, `lib/db`, `lib/auth`.

**Request flow:**
```
Client (mobile-first) → Next.js Route Handler (validation via Zod) → Service layer (paper/report/auth/duplicate) → Drizzle (Postgres) + R2 (signed URLs) → CDN cached response
PDF view: browser fetches signed R2 URL directly (Spec 46: do NOT stream large PDFs through Workers)
```

**Why Workers+OpenNext:** fits free-first (Spec 49), co-located with R2/CDN, free tier sufficient. Keep portable: swapping R2 for S3 is one adapter.

## 2. Project Folder Structure

```
NustWeShare/
├── All courses.md
├── NustWeShare — Master Spec.md
├── NustWeShare_Official_Academic_Seed_Data_2026.md
├── IMPLEMENTATION_STAGES.md
├── docs/
│   ├── architecture.md       # this file
│   ├── academic-data.md
│   ├── adding-faculty.md
│   ├── api.md
│   ├── deployment.md
│   └── ...
├── drizzle.config.ts
├── wrangler.toml
├── open-next.config.ts
├── .env.example
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # homepage hero + dominant search (Spec 44,68)
│   │   ├── globals.css
│   │   ├── browse/
│   │   ├── (faculty)/[facultySlug]/
│   │   ├── modules/[code]/
│   │   ├── upload/page.tsx          # ghost-first upload (Spec 9-14)
│   │   ├── leaderboard/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── copyright/page.tsx
│   │   ├── api/
│   │   │   ├── search/route.ts
│   │   │   ├── faculties/route.ts
│   │   │   ├── papers/[id]/route.ts
│   │   │   ├── papers/upload/route.ts
│   │   │   ├── papers/[id]/report/route.ts
│   │   │   ├── papers/[id]/view/route.ts
│   │   │   ├── papers/[id]/download/route.ts
│   │   │   ├── auth/register/route.ts
│   │   │   ├── auth/login/route.ts
│   │   │   ├── leaderboard/route.ts
│   │   │   └── health/route.ts
│   │   ├── loading.tsx / error.tsx / not-found.tsx
│   │   └── sitemap.ts / robots.ts
│   ├── components/
│   │   ├── ui/ (Button, Card, Input, Select, Badge, Dialog, Toast, Skeleton)
│   │   ├── layout/ (Header, Footer, Container)
│   │   ├── search/ (SearchBar)
│   │   ├── browse/ (FacultyCard, ProgrammeList, ModuleGrid)
│   │   ├── viewer/ (PDFViewer)
│   │   ├── upload/ (ModuleSelector, FileCard, DuplicateDialog)
│   │   ├── report/ (ReportDialog)
│   │   └── dashboard/ (Stats, RecentList)
│   ├── lib/
│   │   ├── env.ts              # Zod env validation
│   │   ├── db.ts               # Drizzle client + pooling
│   │   ├── errors.ts           # human-friendly errors (Spec 62)
│   │   ├── logger.ts           # lightweight, no PINs (Spec 77)
│   │   ├── validation/ (zod schemas, pdf.ts)
│   │   ├── filename.ts         # deterministic regex parsing (Spec 14)
│   │   ├── r2/ (client.ts, keys.ts, signedUrl.ts)
│   │   ├── duplicates/ (sha256.ts, metadata.ts, textFingerprint.ts, perceptualHash.ts)
│   │   ├── papers/ (resolve.ts, canonical.ts)
│   │   ├── reports/ (deletion.ts)
│   │   ├── auth/ (hash.ts, session.ts, middleware.ts)
│   │   ├── analytics.ts
│   │   └── security/ (rateLimit.ts, sanitize.ts)
│   └── db/
│       ├── schema/ (faculties.ts, schools.ts, ... papers.ts)
│       ├── migrations/
│       └── seed/ (import.ts, data/, verify.ts)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
└── .github/workflows/deploy.yml
```

No hard-coded `if faculty==FEBE` anywhere (Spec 65) — all faculty routing is DB-driven via `faculty.slug`.

## 3. Database ERD / Schema

```
faculties 1──* schools 1──* departments 1──* programmes 1──* curricula
                                                    │
                                                    *──* programme_modules *──1 modules (canonical)
                                                         (curriculum_id FK)        │
                                                                                   │
papers *──1 modules                                                       programme_modules
  │ 1──* paper_files (file identity)
  │ 1──* reports
  │
  └── (views/downloads counters)

users 1──* paper_files (uploader_id nullable, ghost = null)
users 1──* social_links
users 1──* reports (reporter_id nullable, ip hash fallback)
users 1──1 contribution_stats (materialized)
```

Normalized, academic entities in DB not frontend (Spec 6), module deduplicated (Spec 7: MATH511S one row), curriculum versions distinct (Spec 6, All courses:106), paper vs file separate (Spec 59).

## 4. Complete List of Tables

1. `faculties` — FEBE, FCI, future faculties
2. `schools` — School of Engineering, Built Environment, Computing, Informatics...
3. `departments` — Civil Mining & Process, Mechanical Industrial & Electrical, etc.
4. `programmes` — 07BOAI, 07BCSS, 07BCCS, 07BAIT, 07BARC, 06DIPS etc. with nqf_level/credits
5. `curricula` — version rows per programme (2026 Revised / Phase-in / Old Phasing-out)
6. `modules` — canonical, code unique (ELC511S), name, dept FK
7. `programme_modules` — join with year_level nullable, semester 1/2, curriculum_id
8. `papers` — academic identity (module_id, academic_year, semester, assessment_type, assessment_number) per Spec 4
9. `paper_files` — file identity per Spec 59: r2_object_key, sha256, text_fingerprint, perceptual_hash, is_canonical
10. `users` — optional profiles per Spec 18-20: username, normalized_username unique, display_name, pin_hash, lockout fields
11. `social_links` — platform, handle, display_publicly
12. `reports` — paper_id, reason enum, reporter_ip_hash/reporter_id, per Spec 33-36
13. `contribution_stats` — approved/pending/rejected counts + rank source (or view)

Plus: migration metadata (drizzle_migrations), optional `analytics_events` if needed.

## 5. Important Indexes & Constraints

**Uniqueness (DB-enforced, not app-only):**
- `faculties.code UNIQUE`, `faculties.slug UNIQUE`
- `modules.code UNIQUE` (canonical per Spec 7)
- `programmes.code UNIQUE` per curriculum? Actually `programmes.code + curricula` combo — programmes.code not globally unique due to old/revised pairs sharing code but different curriculum rows handle it
- `users.normalized_username UNIQUE` case-insensitive (Spec 20: Adonnis==adonnis)
- `papers` partial unique: `UNIQUE(module_id, academic_year, semester, assessment_type, assessment_number) WHERE status='active'` — allows soft-deleted dupes but prevents active dupes (Spec 58)
- `paper_files.sha256 UNIQUE` (Level 1 dedup Spec 26)
- `paper_files.r2_object_key UNIQUE`
- `programme_modules UNIQUE(programme_id, module_id, curriculum_id)`
- `reports UNIQUE(paper_id, reporter_id) WHERE reporter_id IS NOT NULL` + `UNIQUE(paper_id, reporter_ip_hash) WHERE reporter_id IS NULL` (Spec 34: one person cannot generate 5 reports)
- `paper_files.text_fingerprint` indexed (not unique) for near-dup lookup

**Foreign keys:** all FKs with `ON DELETE RESTRICT` for academic hierarchy (don't cascade delete programme and orphan modules), `papers.module_id → modules.id`, `paper_files.paper_id → papers.id ON DELETE SET NULL` for integrity after soft delete.

**Checks:**
- `semester IN (1,2)`, `academic_year BETWEEN 2000 AND 2035`
- `assessment_type IN ('TEST','EXAM','SUPPLEMENTARY','QUIZ','ASSIGNMENT','LAB','TUTORIAL')` (Spec 2)
- `assessment_number IS NULL AND assessment_type IN ('EXAM','SUPPLEMENTARY') OR assessment_number BETWEEN 1 AND 20` (Spec 3 EXAM/SUPP no number)
- `file_size <= 3145728` (3 MB Spec 15)

**Indexes:**
- `idx_modules_code_trgm` GIN trigram on `modules.code`, `modules.name` for search (Spec 37 partial matches)
- `idx_papers_module_year` on `(module_id, academic_year DESC)` for module page grouping (Spec 70)
- `idx_papers_search` on `(assessment_type, academic_year)`
- `idx_paper_files_paper_id`, `idx_reports_paper_id`, `idx_programme_modules_module_id`
- `idx_users_normalized` btree on `normalized_username`

**Soft delete:** `papers.deleted_at TIMESTAMPTZ`, `papers.deletion_reason TEXT` ('5_reports'), indexed where `deleted_at IS NULL` for active queries (Spec 35).

## 6. API Routes

All clean, Zod-validated, consistent error format `{error: {code, message}}` human-friendly (Spec 62,61).

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/faculties` | list faculties | — |
| GET | `/api/faculties/[slug]/schools` | schools for faculty | — |
| GET | `/api/schools/[id]/departments` | departments | — |
| GET | `/api/departments/[id]/programmes?status=` | programmes | — |
| GET | `/api/programmes/[code]/modules` | modules for programme | — |
| GET | `/api/search?q=` | search modules/programmes/papers (Spec 37) | — |
| GET | `/api/modules/[code]` | module detail | — |
| GET | `/api/papers?module_id=&year=&type=` | filter papers | — |
| GET | `/api/papers/[id]` | paper detail | — |
| POST | `/api/papers/[id]/view` | increment views deduped | — |
| GET | `/api/papers/[id]/download` | signed R2 redirect + count download | — |
| POST | `/api/papers/upload` | multipart: module_id + files[] + per-file metadata | optional |
| POST | `/api/papers/[id]/report` | report paper (anonymous) | — |
| POST | `/api/auth/register` | username+display_name+5-digit PIN | — |
| POST | `/api/auth/login` | username+PIN, set httpOnly cookie | — |
| POST | `/api/auth/logout` | clear cookie | auth |
| GET | `/api/auth/me` | session | auth |
| GET | `/api/leaderboard?limit=` | top contributors | — |
| GET | `/api/dashboard` | my stats | auth |
| GET | `/api/health` | DB + R2 check | — |
| POST | `/api/admin/papers/[id]/restore` | restore deleted (ADMIN_SECRET) | admin |

HTTP semantics correct, pagination `?page&limit`, never expose stack traces.

## 7. Upload Pipeline

Per Spec 9-16, 74, 76:

```
Client:
  1. Select module via controlled search (must exist in DB, UI disables Upload until selected — Spec 10)
  2. Select 1..N PDFs via file picker/drag-drop
  3. Client pre-validates MIME + 3MB, shows per-file FileCard with Type/Number/Year/Semester selects
  4. Deterministic filename parse suggests values (Spec 14 regex, no AI), user correctable, Skip allowed (Spec 13)

Submit POST /api/papers/upload (multipart):
  5. Server validates module_id exists (resolve canonical name server-side Spec 60)
  6. For each file:
     a. Validate magic bytes %PDF-, MIME, corrupt via pdf parse, size <=3MB (Spec 15) — reject with "This PDF is larger than 3 MB limit"
     b. Sanitize filename, generate safe R2 key: /papers/{facultySlug}/{moduleCode}/{year}/{paperId}/{fileId}.pdf (Spec 48, DB is source of truth)
     c. Compute SHA-256 (Level 1) — if exists, return existing paper, skip R2 put (Spec 26, 74)
     d. Extract page_count, pdf metadata
     e. Resolve paper identity: find or create papers row by (module_id, year, semester, type, number) (Spec 30)
     f. Create paper_files row with sha256, uploader_id (or null ghost), ip_hash
     g. Async (waitUntil or inline v1) compute text_fingerprint + perceptualHash if needed, update row, run duplicate check (Spec 28-29)
  7. Return per-file result: {fileName, status: 'added'|'duplicate'|'error', paperId, duplicatePaper?, message}
  8. Client shows "Thank you ❤️ Papers uploaded: 4 Successfully added: 3 Potential duplicates: 1" (Spec 72)
```

No AI, no email, no OTP.

## 8. Duplicate Detection Architecture

Per Spec 25-32, critical:

**Level 1 — SHA-256 exact (Spec 26):** `crypto.subtle.digest('SHA-256', buffer)` server-side, compare `paper_files.sha256`. Binary identical → reject storage, return existing paper ID. Deterministic, zero false positive.

**Level 2 — File metadata signals (Spec 27):** file size, page count, original filename, creation date — collected but never sufficient alone. Used to score candidates; filename alone never declares duplicate.

**Level 3 — Text fingerprint (Spec 28):** if PDF has text layer: extract via `pdfjs` → normalize: lowercase, collapse whitespace `\s+ → ' '`, remove header/footer noise (page numbers regex `^\d+\s*$`), strip formatting → hash normalized text via SHA-256 → store `text_fingerprint`. Two PDFs with same content but different export resolutions share fingerprint despite different SHA-256. No LLM.

**Level 4 — Scanned docs perceptual (Spec 29):** if no text layer: render first 3 pages to images (pdfjs + canvas via `@napi-rs/canvas` or Workers image), compute pHash (DCT-based, 64-bit), store `perceptual_hash`, compare Hamming distance ≤8 → similar → overall similarity score. Flag "These two PDFs appear to contain the same paper." Never auto-delete on perceptual alone — flag for UI.

**Handling (Spec 30-32):**
- Distinguish PAPER identity (academic) vs FILE identity (binary). Multiple `paper_files` can point to one `papers` row.
- Canonical selection per Spec 31: prefer readable, complete, correctly oriented, clear, not corrupted, good resolution, has text layer, reasonable size. `is_canonical=true` only for one file per paper; others remain internal.
- UI: if likely duplicate (SHA-256 match or text_fingerprint match or perceptual score > threshold) → show `DuplicateDialog`: "Possible duplicate detected. An existing paper appears to contain the same assessment. Existing: ELC511S — 2024 — Exam [Use existing paper] [Upload anyway]" (Spec 32). Non-aggressive: allow upload anyway on uncertain. Background `waitUntil` so UI not blocked (Spec 76 v1 simple inline is acceptable).

## 9. Authentication / Profile Architecture

Per Spec 18-21 ghost-first:

**Two modes:**
- Ghost uploader: no row in `users`, `paper_files.uploader_id = NULL`, paper shows "Anonymous contributor" (Spec 24)
- Profile user: optional `users` row

**Register/Login:**
- `POST /api/auth/register` body `z.object({username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/), display_name: z.string().min(1).max(50), pin: z.string().regex(/^\d{5}$/) })`
- `normalized_username = username.toLowerCase().trim()` unique index (Spec 20)
- `pin_hash = await argon2.hash(pin)` (not bcrypt 10 rounds but argon2id default) never plaintext, never logged (Spec 19,77)
- `POST /api/auth/login` verifies hash, increments `failed_attempts`, if `failed_attempts >=5` set `locked_until = now + 15min * (attempts-5)` progressive (Spec 19), returns 429 with "Too many attempts, try again in X minutes"
- Success: `Set-Cookie: session=jwtOrRandomToken; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/` (30 days) — JWT signed with `APP_SECRET` containing `userId` or opaque session stored in DB/ KV for revocation. Rate limit 5/logins per 15min per IP via `lib/security/rateLimit`.

**Profiles & Socials:**
- `users.display_name`, `social_links` rows for instagram/tiktok/x handles with `display_publicly` bool toggles (Spec 21), never mandatory, user may stay fully anonymous.
- Dashboard pulls from `contribution_stats` + `papers` join via `uploader_id`.

**No email/OTP/password reset/magic links** (Spec 19).

## 10. Reporting Architecture

Per Spec 33-36, 54 low-maintenance:

- Table `reports` with `reason` enum: `DUPLICATE | WRONG_MODULE | WRONG_YEAR | WRONG_ASSESSMENT_TYPE | CORRUPTED | NOT_A_PAST_PAPER | OTHER` (Spec 33)
- UI: one-click report dialog on paper page, anonymous publicly, optional details textarea for OTHER
- API validates paper exists and active, enforces `UNIQUE(paper_id, reporter_ip_hash)` and `UNIQUE(paper_id, reporter_id)` (Spec 34: one person cannot make 5 reports). Reporter identity hashed (ip hash via SHA-256 + salt), never exposed (Spec 36). Rate limit 5 reports/min/IP.
- After insert, in transaction: `SELECT COUNT(*) FROM reports WHERE paper_id=$1` — if `>=5` → `UPDATE papers SET deleted_at=NOW(), deletion_reason='5_reports', status='deleted' WHERE id=$1 AND deleted_at IS NULL` + `R2.deleteObject(r2_object_key)` for canonical file (Spec 35 soft-delete keep minimal metadata/history). Keep audit trail for stats.
- Public GET returns 410 gone "no longer available" after deletion (Spec 35).
- Minimal admin restore via `ADMIN_SECRET` header checked server-side — re-activates row, restore R2 from backup if available.

Community-owned: malicious 5-report delete is accepted trade-off (Spec 34).

## 11. R2 Storage Architecture

Per Spec 16,48,74:

- Bucket: `nustweshare-papers` (prod) + `nustweshare-papers-preview` (preview) via env `R2_BUCKET`
- Adapter `lib/r2/client.ts` interface: `put(key, buffer, contentType)`, `get(key)`, `delete(key)`, `getSignedUrl(key, expires)` — implementation uses `@aws-sdk/client-s3` compatible R2 endpoint or Cloudflare binding. Keeps business logic portable (Spec 94).
- Key generation `lib/r2/keys.ts`: `papers/{facultySlug}/{moduleCode}/{year}/{paperId}/{fileId}.pdf` lowercase, sanitized (no `..`, no spaces, only `[a-z0-9_-]`). Deterministic but not source of truth — DB `r2_object_key` is.
- Access: private bucket, signed URLs expiry 1h for viewer/download, `Content-Disposition: inline` for viewer, `attachment; filename="ELC511S_2025_Test_1.pdf"` for download (Spec 88)
- Storage optimization: avoid binary dupes via SHA-256 check, do NOT blindly recompress (Spec 74)
- Deletion on 5 reports via adapter delete. No local filesystem (Spec 48: app must not depend on local FS).
- CDN: R2 custom domain fronted by Cloudflare CDN for cache, Workers not proxying large bodies (Spec 46).

## 12. Deployment Architecture

Per Spec 47,49:

- Preferred: Cloudflare Workers + OpenNext (`open-next.config.ts`) — builds Next.js SSR/RSC to Worker bundle, keeps Next.js features while deploying to Workers (not Pages older architecture).
- `wrangler.toml`: name `nustweshare`, compatibility_date current, bindings `R2_BUCKET`, `DB` via `DATABASE_URL` secret, `APP_SECRET`, `ADMIN_SECRET`
- Build: `opennextjs-cloudflare build` → `wrangler deploy`. Portable fallback: can deploy to Vercel/any Node host by swapping R2 adapter + `DATABASE_URL` (Spec 47 keep portable).
- GitHub Actions `.github/workflows/deploy.yml`: on push to `main` → `npm ci → npm run build → npm run db:migrate (preview) → wrangler deploy`, PR previews via Workers preview.
- Env via `wrangler secret put DATABASE_URL` etc., `.env.example` provides placeholders (Spec 79).
- Health check `/api/health` checks DB connect + R2 list 1 key.
- Free-first: Hosting $0 (Workers free), DB free tier (Neon 512MB), R2 free (10GB), GitHub free, SSL free via Cloudflare — no paid service initially (Spec 49). Can add paid later without refactor due to abstractions.

## 13. Security Architecture

Per Spec 51,52,60,77:

- Server-side validation mandatory: Zod on all route handlers, never trust client (Spec 60: client sends IDs, server resolves canonical names). Validate `module_id` exists before accepting paper.
- PDF: MIME `application/pdf` + magic bytes `%PDF` + parse check via `pdf-lib`, max 3 MB per file, max 3 files concurrent, total payload 12 MB, MIME spoof rejected.
- Filenames sanitized: strip directories, replace unsafe chars, generate safe R2 keys (prevent `../` traversal).
- Do not execute uploaded files, treat every PDF as untrusted (Spec 51).
- SQL injection: Drizzle parameterized, no string concat, `npm audit` clean.
- XSS: escape rendered data, React auto-escape, CSP header `default-src 'self'; script-src 'self'; object-src 'none'`
- CSRF: SameSite=strict cookies + token for state-changing POSTs where applicable.
- Cookies: httpOnly, secure, sameSite, not exposing secrets client-side.
- PIN: hashed argon2id, never plaintext/logged, rate-limited login 5/15min + progressive lockout (Spec 19), account lock after 5 fails.
- Rate limiting: per-IP limits via KV/memory `lib/security/rateLimit.ts` — upload 10/hour/ip, search 60/min/ip, report 5/min/ip, login 5/15min/ip.
- Secrets via env, never in repo, audit via `grep -r SECRET`.
- Logging: lightweight, no PINs/PII/tokens (Spec 77).

## 14. Academic Data Model

Per Spec 6-8,64 + `All courses.md` + Seed Data:

- Hierarchy Faculty→School→Department→Programme→Curricula→Module (Spec 6). Frontend never hard-codes, all controlled lists from DB (Spec 6).
- FEBE: 2 schools (Engineering, Built Environment) + 4 departments (Civil Mining & Process; Mechanical Industrial & Electrical; Architecture Planning & Construction; Land Spatial Sciences) → ~25 programme codes + ~30 postgraduate codes per `All courses:2-3`
- FCI: 2 schools (Computing; Informatics Journalism & Media) + 6 departments (Computer Science, Software Eng, Cyber Security, Informatics, Journalism & Media, Digital Arts & Animation) → 3 certs + ~8 undergrad codes + ~15 postgrad codes (All courses:4-6)
- Critical: multiple curricula per programme code — e.g., Bachelor of Quantity Surveying `07BQTS` (curriculum version) vs `07BOQS` (another), Bachelor of Informatics `07BAIT` (old phasing out 2029) vs `07BAIN` (revised phase-in 2026) — handled via `curricula` table, not merging (Seed Data Important modeling rule).
- Module canonical per Spec 7: e.g., `MCI511S Mathematics for Computing 1A` appears in 07BCSS, 07BCMS, 07BCCY → one `modules` row, many `programme_modules` joins with distinct `year_level`/`semester`/`curriculum_id`.
- Programme level flexible nullable `year_level` for postgrad per Spec 8.
- Future faculty add: insert rows only, no code change (Spec 65).

## 15. Initial Seed-Data Strategy

- Source truth: official NUST 2026 prospectuses (Seed Data lines 12-14) + `All courses.md` curated codes. Never invent data (Spec 64).
- Import pipeline: `src/db/seed/import.ts` idempotent. Steps:
  1. Load `src/db/seed/data/faculties.json`, `schools.json`, `departments.json`, `programmes.json`, `curricula.json`, `modules.json`, `programme_modules.json` generated from markdown tables or hand-curated verified extract.
  2. Upsert in order: faculties → schools → departments → programmes → curricula → modules (deduplicate by code) → programme_modules.
  3. For each Seed Data curriculum block (e.g., 07BOAI page 14-15) parse Year/Semester tables into module rows: code, name, NQF level/credits stored as metadata but not required for MVP.
  4. Verify via `verify.ts`: expect faculties=2, FEBE schools=2, FCI schools=2, FEBE depts=4, FCI depts=6, programmes ≈60 (including curriculum version rows), modules ≈450-600 deduplicated, programme_modules ≈800. Spot-check specific modules `COA511S`, `ELC` placeholder not in FCI but test probe `MCI511S` appears in ≥5 programmes.
  5. Run `npm run db:seed` locally + preview + prod. Re-runnable due to `ON CONFLICT DO UPDATE`.
- Academic data initialization before browse/search/upload (Spec 64 ordering). Versioned by year `2026` so later `2027` prospectus amendments create new `curricula` rows, old papers remain discoverable (Seed Data rule: archive must preserve old curriculum papers).

## 16. UI Page Map

Per Spec 44,68-71, 92 ideal experience:

- `/` — Hero (NustWeShare + tagline), dominant search bar (ELC511S/ Electronic Devices placeholder), FEBE card (Faculty of Engineering and Built Environment) + FCI card, Recently Added Papers (6 most recent active), Popular Modules (most papers), Top Contributors (5), Upload CTA — search dominates (Spec 44,68)
- `/browse` — faculty chooser
- `/[facultySlug]` — e.g., `/febe` lists schools
- `/schools/[id]` — departments
- `/departments/[id]` — programmes
- `/programmes/[code]` — programme detail + curriculum version switcher + modules grouped by year_level
- `/modules/[code]` + `/(faculty)/modules/[code]` — module page showing papers grouped by year (2026→) with per-year Test1/Test2/Exam/Supp etc. (Spec 70), filters (71)
- `/modules/[code]/[year]/[type-number]` — paper page with viewer (Spec 39-40)
- `/search?q=` — results page
- `/upload` — module selector → multi-file → per-file cards → submit (Spec 10-13)
- `/leaderboard` — contributor ranks (Spec 22)
- `/dashboard` — my stats (Spec 23) auth required
- `/profile/[username]` — public profile + papers
- `/settings` — edit display name, PIN, socials + toggles
- `/copyright`, `/contact` — takedown (Spec 89) + disclaimer (Spec 56)
- `sitemap.xml`, `robots.txt` (Spec 86)

All URLs clean human-readable without UUIDs (Spec 87).

## 17. Component Architecture

- `components/ui/*` — headless + Tailwind, reusable across pages, no giant components (Spec 84)
- Search: `SearchBar` debounced, dropdown portal, keyboard nav, shared via homepage header + upload module selector
- Upload: `ModuleSelector` (uses search API, controlled), `FileList` → `FileCard` (per-file state isolation, filename parse suggestion, validation feedback), `DuplicateDialog` modal
- Viewer: `PDFViewer` wraps `pdfjs-dist` worker, props `signedUrl`, handles loading/error/zoom/page, lazy render via IntersectionObserver
- Report: `ReportDialog` with radio reasons + textarea other, single POST
- Layout: `Header` + `Footer` + `Container` + `Breadcrumbs` consistent across all pages
- State: React server components for data fetch + client components for interactivity only as needed; no global state library for v1 (keep simple).
- Type safety: strict TS, no `any`, shared types `src/lib/types.ts` for Paper, Module, Programme.

## 18. Testing Strategy

Per Spec 80-82:

- **Unit** `tests/unit/` Jest/Vitest: paper identity uniqueness (module+year+semester+type+number), assessment_type+number validation (EXAM null, TEST required), SHA-256 generation, text fingerprint normalization (whitespace, case, header noise), report counting, 5-report deletion transaction (decrement not needed), PIN hashing + case-insensitive username, upload validation (magic bytes, size 3MB, forged module_id), filename parsing regex (ELC_2024_TEST_1 → 2024 TEST 1)
- **Integration** `tests/integration/` against real Postgres (test DB): upload ghost → R2 mock → papers+paper_files created, duplicate SHA blocked, text fingerprint near-dup flagged, search finds seeded module, browse hierarchy correct, report 5× triggers soft delete, leaderboard orders correctly
- **Security** `tests/security/`: invalid PDF (exe renamed), oversized 3.1MB, malformed multipart, duplicate report from same IP blocked, brute-force 5 fails → lockout, SQL injection `'; DROP TABLE'`, XSS `<script>alert(1)</script>` escaped, forged module_id 99999 rejected, manipulated filename `../../../etc/passwd` sanitized, malicious R2 key `..` rejected
- **E2E** Playwright: full flow search→module→paper→viewer→download (filename check)→upload 3 files (module selected, mixed metadata, skip one)→report 5×→verify 410→leaderboard→dashboard (cover all happy paths)
- **Manual QA checklist** (Stage 16.5): every button real, no placeholder, no mock uploads, no dummy academic data.
- Coverage target: critical business logic >80%, not 100% (Spec 80), CI runs on PR.

## 19. Environment Variables

Per Spec 79, never commit secrets, provide `.env.example`:

```
DATABASE_URL=postgresql://user:pass@host:5432/nustweshare
R2_BUCKET=nustweshare-papers
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_PUBLIC_URL=https://papers.nustweshare.com
APP_SECRET=64-char-random
ADMIN_SECRET=32-char-random-for-restore
NEXT_PUBLIC_APP_URL=https://nustweshare.com
```

Validation via `lib/env.ts` Zod on startup, fail fast if missing. Secrets via `wrangler secret put` in prod, CI via GitHub secrets.

## 20. Development Roadmap

Ordered per Spec 82 + stages file, low-maintenance first:

1. **Foundation (Stage 1-3, this doc + scaffold + DB + seed)** — academic data ready before upload (Spec 64)
2. **Browse/Search/View (Stages 4-7)** — students can discover papers
3. **Upload + R2 (Stages 8-9)** — ghost multi-file with validation
4. **Duplicates (Stage 10)** — 4-level detection, canonical
5. **Reports (Stage 11)** — community auto 5-delete
6. **Auth/Dashboard/Leaderboard (Stages 12-13)** — optional profiles complete loop
7. **Hardening/QA/Deploy (Stages 14-18)** — security, performance, testing, live, legal, docs → market-ready v1.0.0

Parallelizable: 5/6, 15-16.

## 21. Contradictions & Technical Problems Identified

1. **Prospectus freshness:** `All courses.md` lists old/revised phasing dates up to 2030 (e.g., 07BCMS phasing out 2029/2030), while Seed Data header warns prospectuses may be amended — resolution: versioned `curricula` table preserves archive discoverability, importer warns on mismatch and allows new 2027 curricula without overwriting.
2. **Module canonical vs programme-specific semester:** same module code appears with different year_level/semester across programmes (e.g., `COA511S` Sem 1 in 07BOAI but Sem 2 in 07BCMS) — resolved via `programme_modules.semester` not `modules.semester` (Spec 5 future-proof).
3. **EXAM/SUPPLEMENTARY numbering:** Spec 3 says EXAM does NOT require number, but programmatic uniqueness must allow EXAM null while TEST requires number — DB check constraint handles it; UI hides Number select for those types.
4. **R2 vs CDN vs Workers streaming:** Spec 46 says do NOT stream large PDFs through server functions — resolved via signed R2 URLs + viewer fetching directly, Worker only validates + redirects.
5. **No email/OTP vs account recovery:** 5-digit PIN without reset (Spec 19) means lost PIN = lost account — accepted per spec, documented, mitigated via "write down PIN" UX copy, no recovery flow to keep zero-email.
6. **Auto 5-report deletion abuse:** community could maliciously delete — accepted trade-off per Spec 34, mitigated via per-reporter uniqueness + rate limit, restore via ADMIN_SECRET only.
7. **Perceptual hashing in Workers:** Workers lack heavy canvas deps — v1 uses Node preview for generation via `waitUntil` or deferred job; if Workers cannot render PDFs to images reliably, Stage 10 falls back to text fingerprint + SHA-256 only and flags scanned docs as "needs manual review" — acceptable because false negatives better than false positives (Spec 32).
8. **Workers free tier limits:** Postgres connections limited — use pooling (`pgbouncer` via Neon) + short-lived clients, no persistent connections in Worker.

## 22. Guiding Principle

Build as if NUST students will use it tomorrow (Spec 96): FAST, SIMPLE, FREE, SEARCHABLE, WELL-ORGANIZED, OPEN-SOURCE, LOW-MAINTENANCE. No toy demos, no fake upload buttons, no dummy results, no AI APIs.

---
*Teams: do (1) done upon writing this file. Next: scaffold actual Next.js project per section 2.*
