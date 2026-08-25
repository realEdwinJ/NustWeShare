# NustWeShare — Market-Ready Implementation Stages

> Execution rule: `do (X)` or `do (X-Y)` = read required docs for that stage, build it 100% complete with no placeholders, no failing buttons, no vulnerabilities, no mock data. Each stage is market-ready before moving on.

**Source docs:** `NustWeShare — Master Spec.md` (2,517 lines, 96 sections), `All courses.md` (303 lines), `NustWeShare_Official_Academic_Seed_Data_2026.md` (11,979 lines, 34 curriculum blocks)

---

## STAGE 1 — Architecture & Project Foundation
*Spec ref: 95 First Task, 58 DB Design, 61 API, 93 Stack, 94 Portability, 84 Code Quality*

- [ ] 1.1 Analyze Master Spec 95 and produce `docs/architecture.md` with: recommended architecture, folder structure, ERD/schema, tables, indexes/constraints, API routes, upload pipeline, duplicate architecture, auth architecture, reporting, R2, deployment, security, academic data model, seed strategy, UI page map, component architecture, testing strategy, env vars, roadmap + contradictions
- [ ] 1.2 Init Next.js 15 + React + TypeScript (strict) + Tailwind CSS + ESLint + Prettier + absolute imports
- [ ] 1.3 Configure Cloudflare Workers + OpenNext (`opennext.config.ts`, `wrangler.toml`) — use Workers not Pages (Spec 47)
- [ ] 1.4 Postgres setup: choose free tier (Neon/Supabase), connection pooling, Drizzle ORM + drizzle-kit, migration infra (`drizzle.config.ts`)
- [ ] 1.5 Environment abstraction: `lib/env.ts` with Zod validation, `.env.example` with DATABASE_URL, R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, APP_SECRET
- [ ] 1.6 R2 abstraction layer `lib/storage/` (interface: put, get, delete, signedUrl) — keep business logic portable (Spec 94) — no filesystem dependency
- [ ] 1.7 Project structure creation: `/app`, `/components`, `/lib`, `/db/schema`, `/db/migrations`, `/db/seed`, `/lib/validation`, `/lib/security`, `/public`, `/docs`
- [ ] 1.8 GitHub setup: `.gitignore` (secrets), `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md` skeleton, `README.md` with local setup placeholder
- [ ] 1.9 Logging infra `lib/logger.ts` lightweight (no PINs/PII), error handling framework `lib/errors.ts` with human-friendly messages (Spec 62,77)
- [ ] 1.10 Validation base: Zod schemas, sanitization utils
- **Deliverable:** `npm run dev` + `npm run build` + `npm run deploy:preview` all pass, no academic data yet

## STAGE 2 — Database Schema (Fully Normalized, Production-Ready)
*Spec ref: 6 Hierarchy, 7 Module Model, 8 Programmes, 58 Design Requirements, 59 Paper vs File, 60 Data Integrity*

- [ ] 2.1 `faculties` table: id (uuid/v7), code (FEBE/FCI unique), name, slug, created_at
- [ ] 2.2 `schools` table: id, faculty_id FK, name, code, slug — index on faculty_id
- [ ] 2.3 `departments` table: id, school_id FK, name, slug — index on school_id
- [ ] 2.4 `programmes` table: id, department_id FK, name, code (07BOAI etc. unique), level (enum: certificate/diploma/bachelor/honours/master/doctorate), nqf_level, nqf_credits, active bool
- [ ] 2.5 `curricula` table: id, programme_id FK, label (2026 Revised / Phase-in 2026 / Old Phasing-out), code_version, status (active/phase_in/phasing_out/archived), year_introduced — supports multiple curricula per programme (Spec 6, All courses:106)
- [ ] 2.6 `modules` canonical table: id, code (ELC511S unique), name (Electronic Devices), description nullable, department_id FK, active bool, created_at — NO duplicates for cross-programme modules (Spec 7: MATH511S) — ONE canonical row per code even if used by many programmes (e.g., MCI511S used by 7+ programmes)
- [ ] 2.6a Module canonical enforcement checklist: verify `modules.code UNIQUE` prevents duplicates, `programme_modules` is the ONLY place for programme↔module links, courses/programmes are browse/search filters only — not owners of module data (user requirement: same code connected across courses, courses just ease search)
- [ ] 2.7 `programme_modules` join: id, programme_id FK, module_id FK, curriculum_id FK, year_level int nullable (postgrad nullable Spec 8), semester int (1/2 nullable), is_core bool — unique (programme_id, module_id, curriculum_id) — supports "same module, many programmes" (e.g., PLU411S in 10+ programmes via 10 rows, one module row)
- [ ] 2.8 `papers` academic identity: id (uuid), module_id FK, academic_year int (2024-2026), semester int (1/2), assessment_type enum (TEST/EXAM/SUPPLEMENTARY/QUIZ/ASSIGNMENT/LAB/TUTORIAL per Spec 2), assessment_number int nullable (null for EXAM/SUPPLEMENTARY, required for TEST/QUIZ etc. Spec 3), status enum (active/deleted/pending), views int default0, downloads int default0, created_at, deleted_at nullable, deletion_reason nullable — unique index on (module_id, academic_year, semester, assessment_type, assessment_number) partial where status=active
- [ ] 2.9 `paper_files` file identity: id, paper_id FK, r2_object_key unique, original_filename sanitized, file_size int, mime_type, sha256 unique, page_count int nullable, text_fingerprint nullable, perceptual_hash nullable, is_canonical bool default true, uploader_id nullable FK, upload_ip_hash nullable, created_at — indexes on sha256, paper_id, text_fingerprint
- [ ] 2.10 `users` optional profiles: id, username unique, normalized_username unique (lowercase), display_name, pin_hash (argon2/bcrypt), failed_attempts int default0, locked_until timestamp nullable, created_at — case-insensitive uniqueness (Spec 20)
- [ ] 2.11 `social_links` table: id, user_id FK, platform enum (instagram/tiktok/x), handle, display_publicly bool — nullable everything (Spec 21)
- [ ] 2.12 `reports` table: id, paper_id FK, reason enum (duplicate/wrong_module/wrong_year/wrong_type/corrupted/not_paper/other per Spec 33), details text nullable, reporter_id nullable FK, reporter_ip_hash, created_at — unique (paper_id, reporter_id) + unique (paper_id, reporter_ip_hash) to prevent 1 person =5 reports (Spec 34)
- [ ] 2.13 `contribution_stats` materialized view or table: user_id FK unique, approved_count, pending_count, rejected_count, last_contribution_at — updated via triggers
- [ ] 2.14 Apply FK constraints, not-null where required, check constraints (semester in 1,2; year 2000-2030; assessment_number >0), GIN/trigram indexes for search (Spec 37), soft-delete indexes
- [ ] 2.15 Create Drizzle migrations, `npm run db:migrate`, `npm run db:studio` verification, rollback test
- [ ] 2.16 Seed infra test: insert 1 faculty + 1 probe module, verify constraints reject forged module_id, duplicate paper identity
- **Deliverable:** All migrations run clean on local + preview DB, no hard-coded academic data in frontend

## STAGE 3 — Academic Seed Data Import (FEBE + FCI Complete)
*Spec ref: 6, 64 Initialization, 65 Future Faculties, All courses.md, Seed Data 11,979 lines*

- [ ] 3.1 Build hierarchical importer `db/seed/import.ts` — reads curated JSON/TS seed files (source: Seed Data prospectus), versioned by `2026` curriculum year, idempotent upsert (re-run safe)
- [ ] 3.2 Import Faculties: FEBE + FCI (extensible — adding FHNR etc. requires only DB rows per Spec 65, no code change)
- [ ] 3.3 Import FEBE Schools (2): School of Engineering, School of the Built Environment + Departments (4): Civil Mining & Process; Mechanical Industrial & Electrical; Architecture Planning & Construction; Land and Spatial Sciences
- [ ] 3.4 Import FEBE undergrad programmes (All courses:36-63 + Seed): InSTEM 04SMET, 07BECV, 08BCEN, 08BMEG, 08BEMT, 08BECE, 07BMEC, 08BEME, 08BIND, 07BELL, 07BPEN, 08BEET, 08BEEP + Built Env: 07BARC, 07BQTS/07BOQS pair, 07BURP/07BTAR pair, 07BORR/07BRAR pair, 06DIPS/06DPRS, 08BOPS/08BPRS, 07BLAN/07BLAM, 06DGET/06DGEO, 07BGEC/07BGEO, 07BGET/07BGEI — each with curriculum version row
- [ ] 3.5 Import FEBE postgraduate (All courses:109-150): 09MIWR, 09MECE, 09MEEN, 09MOEN, 09MMET, 09MIEN, 09MSES, 10DPIE/10DRPE, 08BARC, 09ARCM, 08BQSH, 08BRRD, 08BURP, 08HBLA, 08BGMH, 08BGTH, 09MOSS, 10DPSS
- [ ] 3.6 Import FCI structure (2 schools +6 departments): School of Computing (Computer Science/Software Eng/Cyber Security), School of Informatics Journal&Media (Informatics/Journalism&Media/Digital Arts) per All courses:154-193
- [ ] 3.7 Import FCI INCEIT certs: 07CAWT, 07CBDT, 07CEHI
- [ ] 3.8 Import FCI undergrad: 07BOAI (Phase-in 2026), 07BCSS Revised, 07BCMS Phasing-out, 07BCCS Phasing-out 2026, 07BCCY Revised, 07BAIT Old, 07BAIN Revised, 07BJOU — preserve old/revised pairs distinct (Spec 5 Important rule)
- [ ] 3.9 Import FCI postgraduate: 08BAIH, 08BCCH, 09MACS (0909MACS), 10DPCS, 08BHDS/08BDFH, 08BHIF/08BISH, 08BCHS/08HBCS, 08BHUH, 08PGIN, 08BIHW, 08BIFB/08BHIB, 08BDAH, 09MADS, 09MAIN, 10DPIN, 08BJOH, 09MJMT — with correct codes
- [ ] 3.10 Parse all 34 curriculum blocks from Seed Data (text tables YEAR 1 Sem 1/2 etc.) into canonical modules — **CRITICAL: deduplicate shared modules** (MCI511S, PLU411S, COA511S appear across 5-10 programmes → ONE row in `modules`, many rows in `programme_modules`) — verify no duplicate module records, `programme_modules` join is the link, courses are only for search/browsing (user requirement: modules like Mathematics done by almost all courses must be ONE canonical entry)
- [ ] 3.10a Module dedup verification: after seed, `SELECT code, COUNT(*) FROM modules GROUP BY code HAVING COUNT(*)>1` must be 0; `SELECT module_id, COUNT(*) FROM programme_modules GROUP BY module_id HAVING COUNT(*)>1` should show shared modules (e.g., PLU411S ≥5 links) proving same code connected across courses
- [ ] 3.11 Add module search index data (code + name) and verify browse path FEBE→School→Department→Programme→Module returns correct modules
- [ ] 3.12 Add `db/seed/verify.ts` script: counts check (faculties=2, FEBE schools=2, FCI schools=2, modules >400, programmes >50), no orphan programme_modules, spot-check ELC-like probe
- [ ] 3.13 Document `docs/academic-data.md` + `docs/adding-faculty.md` (how to add FHNR without code change: insert faculty/school/dept rows)
- **Deliverable:** `npm run db:seed` imports entire 2026 FEBE+FCI from official prospectuses, browse/search returns real modules (no mocks), re-runnable

## STAGE 4 — Design System & Core UI Shell
*Spec ref: 43 UI/UX, 44 Homepage, 45 Mobile First, 46 Performance, 66 Design System, 67 Brand, 69 Navigation*

- [ ] 4.1 Create design tokens: `app/globals.css` Tailwind config — modern typography (Inter/Geist), restrained palette, subtle borders, rounded cards, accessible contrast, no excessive gradients
- [ ] 4.2 Build `components/ui/` primitives: Button (primary/ghost/destructive, loading, disabled states), Card, Input, Select, Badge, Dialog/Modal, Toast, Skeleton, EmptyState, ErrorState — all keyboard accessible, touch targets 44px+
- [ ] 4.3 Header / Navigation `components/layout/Header.tsx`: Logo NustWeShare (NUST+We+Share concept), nav Home/Browse/Upload/Leaderboard/Profile (Spec 69), mobile hamburger, sticky, accessible focus states
- [ ] 4.4 Footer `components/layout/Footer.tsx`: tagline "Past papers. Shared by students.", legal links (/copyright, /contact, /privacy), non-affiliation disclaimer (Spec 56: independent student project), GitHub link, open-source badge
- [ ] 4.5 Homepage `app/page.tsx` per Spec 68+44 in order: 1 Header, 2 Hero (title + tagline), 3 Dominant Search bar (placeholder "ELC511S / Electronic Devices"), 4 Browse by Faculty (FEBE + FCI cards with School counts), 5 Popular Modules, 6 Recently Added Papers, 7 Top Contributors preview, 8 Upload CTA ("Have a paper we don't have? Share it."), 9 Footer — MAX marketing fluff
- [ ] 4.6 Shared layouts: `app/layout.tsx` metadata, viewport, theme, `components/layout/Container.tsx` max-width, responsive grid
- [ ] 4.7 Loading/Error boundaries: `loading.tsx`, `error.tsx`, `not-found.tsx` with human messages (Spec 62)
- [ ] 4.8 Mobile optimization audit: bundle <200kb JS initial, images optimized, no unnecessary animations, test on Chrome devtools 3G + real phone
- **Deliverable:** Homepage pixel-clean, fully responsive (320px → 1440px), Lighthouse accessibility >=95, every link/button navigates (no dead UI)

## STAGE 5 — Browse Hierarchy
*Spec ref: 38 Browsing, 70 Browse Page, 71 Filtering*

- [ ] 5.1 API: `GET /api/faculties` list, `GET /api/faculties/[slug]/schools`, `GET /api/schools/[id]/departments`, `GET /api/departments/[id]/programmes?curriculum_status=active`, `GET /api/programmes/[id]/modules?year_level=&semester=` — all paginated, cached (ISR 1h for academic metadata Spec 46)
- [ ] 5.2 Pages: `/browse` faculty chooser, `/(faculty)/[facultySlug]` faculty overview (schools), `/schools/[id]`, `/departments/[id]`, `/programmes/[code]` — each shows breadcrumb: Faculty > School > Department > Programme
- [ ] 5.3 Programme → Module grouping: group modules by year_level (1,2,3) or "Postgraduate" where year_level null per Spec 8, show module code + name + semester badge
- [ ] 5.4 Module page `/(faculty)/modules/[code]` per Spec 70: header ELC511S Electronic Devices + department/programme context, papers grouped by year (2026→oldest) then by type (Test1/Test2/Exam/Supplementary/Quiz/Assignment/Lab/Tutorial), filter chips Year/Semester/Type/Number (Spec 71)
- [ ] 5.5 Clean URLs: no UUIDs in public URLs (Spec 87) — use slugs/codes (`/febe/modules/elc511s`, `/febe/modules/elc511s/2025/exam` lowercase), server resolves canonical module from DB (never trust client name per Spec 60)
- [ ] 5.6 Empty states: "No papers yet for this module — be the first to share" + Upload CTA, pagination for large module lists (never load thousands)
- [ ] 5.7 Cache + performance: academic metadata cached, DB indexes verified via EXPLAIN ANALYSE
- **Deliverable:** Full browse flow FEBE→School→Dept→Programme→Module→Papers works with real seeded data, no hard-coded if faculty==FEBE

## STAGE 6 — Search (Core Feature)
*Spec ref: 37 Search*

- [ ] 6.1 API `GET /api/search?q=` — search module code (ELC511S), module name (Electronic Devices), programme, paper type/year — partial matches (ELC, Electronic, 511S) — Postgres `pg_trgm` + GIN indexes, `ILIKE` + ranking (code exact > code prefix > name), limit 20, response <150ms
- [ ] 6.2 No external search engine (Spec 37 Do NOT add Elasticsearch/Algolia) — pure Postgres
- [ ] 6.3 Frontend `components/search/SearchBar.tsx`: dominant on homepage + header, debounced 250ms, instant dropdown results grouped by Module/Programme, keyboard navigation (↑↓ Enter Esc), accessible aria, mobile friendly
- [ ] 6.4 Search results page `/search?q=` with filters (faculty, year, type), highlight matched terms, pagination
- [ ] 6.5 Module autocomplete for upload selector reuses same search index (controlled list)
- [ ] 6.6 Analytics hook: log search queries (no PII) for performance tuning
- **Deliverable:** Search ELC511S instantly shows Electronic Devices + papers, typo-tolerant where useful, fast on poor internet, all searches use DB not mocks

## STAGE 7 — Paper Pages, PDF Viewer & Downloads
*Spec ref: 39 Paper Page, 40 PDF Viewer, 41 Downloads, 86 SEO, 88 Download Naming*

- [ ] 7.1 Paper API: `GET /api/papers/[id]` with module code/name, academic_year, semester, assessment_type+number, views/downloads, report_count, canonical file R2 key, uploader display (Anonymous or username) — validate IDs server-side per Spec 60
- [ ] 7.2 Paper page `/(faculty)/modules/[code]/[year]/[type-number]` — example: `/febe/modules/elc511s/2025/test-1` — shows ELC511S Electronic Devices, 2025 Semester 2 Test 1, [View Paper] [Download] [Report] + optional Views/Downloads counts (Spec 39 clean, no clutter)
- [ ] 7.3 In-browser PDF viewer `components/viewer/PDFViewer.tsx` using PDF.js (open-source Spec 93) — served via R2/CDN signed URL, not streamed through server function (Spec 46), page navigation, zoom, fullscreen, lazy page render, mobile pinch
- [ ] 7.4 Download handler `GET /api/papers/[id]/download` — validates paper active, increments downloads (dedup rapid refresh via cookie/ip hash window 1h Spec 42), returns R2 object with Content-Disposition `ELC511S_2025_Test_1.pdf` (clean name Spec 88, not random-uuid)
- [ ] 7.5 Views tracking: `POST /api/papers/[id]/view` beacon on viewer open, dedup same session
- [ ] 7.6 SEO per Spec 86: meaningful titles (`ELC511S 2025 Test 1 | Electronic Devices | NustWeShare`), descriptions, canonical URLs, `sitemap.xml` (modules + papers), `robots.txt`, open-graph, structured metadata — no private user info exposed
- [ ] 7.7 Error states: deleted paper 410 "no longer available", corrupted paper report prompt
- **Deliverable:** Click search → module → 2025 Exam → PDF opens instantly in viewer + downloads with correct name, view/download counts approximate per Spec 42

## STAGE 8 — Upload Flow (Ghost-First, Frictionless)
*Spec ref: 9 Upload Philosophy, 10 Module Required, 11 Multi-File, 12 Per-File Metadata, 13 Optional Metadata, 14 Filename Analysis*

- [ ] 8.1 Upload page `/upload` — Step 1 mandatory Module selector: `[ Search modules... ]` autocomplete against DB controlled list (Spec 10: upload button disabled until valid module selected, server validates module_id exists) — shows selected chip `ELC511S — Electronic Devices ✓`
- [ ] 8.2 Step 2 multi-file selector: `<input type="file" accept=".pdf" multiple>` + drag-drop zone, shows file list with size validation hint "Max 3 MB per file", mobile-friendly
- [ ] 8.3 Per-file metadata cards `components/upload/FileCard.tsx` for EACH file independently (Spec 12): filename header + Type select (Test/Exam/Supplementary/Quiz/Assignment/Lab/Tutorial), Number select (1-10, disabled/hidden for EXAM/SUPPLEMENTARY per Spec 3), Year select (2015-current+1), Semester select (1/2) — pre-filled from filename analysis but editable
- [ ] 8.4 Deterministic filename parsing `lib/filename.ts` via regex (no AI per Spec 50,14): patterns `ELC511S_2025_EXAM.pdf`, `ELC_2024_TEST_1.pdf`, `Electronic_Devices_2023_Supplementary.pdf` → suggest Year/Type/Module, NEVER authoritative, user correctable, flags low-confidence
- [ ] 8.5 Optional metadata UX: per card [Add details] / [Skip] — skip shows friendly "Help keep NustWeShare organized ❤️ Adding year and paper type makes this paper much easier for other students to find." (Spec 13) — never punish skip, allow submission with only module
- [ ] 8.6 Submission: `POST /api/papers/upload` multipart — accepts module_id + array of {file, assessment_type, assessment_number, academic_year, semester} — validates each, returns summary per file: success / potential duplicate / error — shows post-upload "Thank you for contributing ❤️ Papers uploaded: 4 Successfully added: 3 Potential duplicates: 1" (Spec 72) + Anonymous vs profile message
- [ ] 8.7 No auth required for upload (ghost) — if user logged in, attach uploader_id; else ghost
- [ ] 8.8 Upload state management: progress per file, retry failed, prevent double submit
- **Deliverable:** Full upload flow end-to-end on mobile + desktop, no account needed, ghost uploads work, per-file independence verified

## STAGE 9 — File Validation & R2 Storage
*Spec ref: 15 PDF Validation, 16 File Storage, 48 Storage, 52 Upload Abuse, 74 Optimization*

- [ ] 9.1 Client pre-validation: MIME `application/pdf`, extension `.pdf`, file.size <=3MB — immediate friendly error "This PDF is larger than the 3 MB limit." (Spec 62)
- [ ] 9.2 Server hard validation `lib/validation/pdf.ts` (never trust client Spec 15): check magic bytes `%PDF-` header, MIME, file signature, reject if not PDF, corrupt check via pdf-lib/pdfjs parse attempt, enforce 3MB per file, reject unsupported formats
- [ ] 9.3 Security: sanitize original filenames (strip path, control chars), generate safe R2 object keys `lib/r2/keys.ts` — deterministic organized but DB source of truth: `/papers/{facultySlug}/{moduleCode}/{year}/{paperId}/{fileId}.pdf` (Spec 48), never execute uploaded files, treat as untrusted
- [ ] 9.4 R2 upload: private bucket, `putObject` with correct Content-Type, ACL private, generate controlled signed URLs for view/download (short expiry), delete handling
- [ ] 9.5 DB persistence: create `papers` row (or find existing paper identity for file reuse per Spec 30) + `paper_files` row with r2_object_key, original_filename, file_size, mime, sha256, page_count (from pdf parse), upload_ip_hash, uploader_id nullable
- [ ] 9.6 Do NOT store PDF binaries in Postgres (Spec 16), do NOT recompress PDFs blindly (Spec 74), avoid duplicate binary storage when SHA-256 identical
- [ ] 9.7 CDN: Cloudflare cache for R2 via custom domain, range requests for viewer
- **Deliverable:** Malicious .exe renamed .pdf rejected server-side, 3.1MB file rejected with good message, valid PDF stored in R2 and retrievable, DB holds only metadata

## STAGE 10 — Duplicate Detection (4-Level, Production-Critical)
*Spec ref: 25-32 Duplicates, 30 Paper vs File, 31 Canonical, 76 Background Processing*

- [ ] 10.1 Level 1 SHA-256 `lib/duplicates/sha256.ts`: calculate SHA-256 (Web Crypto SubtleCrypto) for every file on server, if exists in `paper_files.sha256` → exact binary duplicate → reject/prevent duplicate storage (Spec 26), return existing paper link
- [ ] 10.2 Level 2 metadata signals `lib/duplicates/metadata.ts`: collect original filename, file size, page count, PDF creation metadata — scored as signals not proof (filename alone never sufficient Spec 27)
- [ ] 10.3 Level 3 text fingerprint `lib/duplicates/textFingerprint.ts` (no LLM/AI): if PDF has extractable text → extract via pdfjs text extraction, normalize: lowercase, collapse whitespace, remove page numbers/headers noise, strip irrelevant formatting → SHA-256 of normalized text as `text_fingerprint` — compare against existing paper_files for near-identical content (different scans/export resolutions) (Spec 28)
- [ ] 10.4 Level 4 scanned docs `lib/duplicates/perceptualHash.ts`: if no text layer → render pages to images (via pdfjs + canvas in Workers if feasible, else fallback), compute perceptual hash (pHash via `sharp` or `phash` lib) per page, compare Hamming distance → overall similarity score → flag "appear to contain same paper" (Spec 29) — do NOT auto-delete, flag only
- [ ] 10.5 Paper vs File association `lib/papers/resolve.ts`: on upload, check existing `papers` identity (module+year+semester+type+number) — if multiple files map to same paper → attach as additional `paper_files` row, select canonical per Spec 31 (prefer readable, complete, correctly oriented, good resolution, text layer, reasonable size), keep alternates internally but not exposed
- [ ] 10.6 Duplicate UI `components/upload/DuplicateDialog.tsx`: if likely duplicate → show "Possible duplicate detected. An existing paper appears to contain the same assessment. Existing: ELC511S — 2024 — Exam [Use existing paper] [Upload anyway]" (Spec 32) — false positives tolerated, store second copy rather than be aggressive
- [ ] 10.7 Async processing: upload → store → enqueue fingerprint jobs (light queue via `setTimeout`/`waitUntil` or simple inline for v1, not blocking UI per Spec 76), keep simple unless queue needed
- [ ] 10.8 Uniqueness enforcement: DB partial unique index prevents duplicate paper identities, SHA-256 unique prevents binary dupes, text_fingerprint indexed for near-dup search
- **Deliverable:** Upload same scan twice → blocked on SHA-256; upload two phone scans of same paper → text fingerprint/perceptual flags potential duplicate dialog; different resolution exports detected

## STAGE 11 — Reporting & Auto-Deletion (Community Moderated)
*Spec ref: 33 Reporting, 34 Auto Five-Report Deletion, 35 Deletion Implementation, 36 Report Privacy*

- [ ] 11.1 Report API: `POST /api/papers/[id]/report` body {reason, details} — reasons enum per Spec 33, anonymous publicly, simple UI `components/report/ReportDialog.tsx` 1-click + Other text box, extremely simple
- [ ] 11.2 Anti-abuse: store reporter_ip_hash + reporter_id nullable, unique constraint prevents one person =5 reports (Spec 34), rate limit reports per IP (5/min), CAPTCHA not required initially but honeypot + timing check
- [ ] 11.3 Anonymous storage: never expose reporter identity/username/social to uploader/public (Spec 36), log internally only for dedup
- [ ] 11.4 Auto 5-report deletion `lib/reports/deletion.ts`: on each report, count reports for paper_id — if count >=5 → transaction: set `papers.deleted_at=NOW()`, `papers.deletion_reason='5_reports'`, `papers.status='deleted'`, delete R2 object (`deleteObject`), keep minimal metadata for integrity/stats (soft-delete per Spec 35) — no admin approval, community-owned trade-off accepted (Spec 34)
- [ ] 11.5 Public handling: `/api/papers/[id]` returns 410 "no longer available" after deletion, remove from search/browse indexes, keep stats
- [ ] 11.6 Restore capability (minimal admin): `POST /api/admin/papers/[id]/restore` — guarded by ADMIN_SECRET env, re-activates paper (R2 restore from backup if feasible), logs action
- [ ] 11.7 Email-free: no notification emails (no OTP/email per Spec 5)
- **Deliverable:** Report 5× from 5 distinct IPs → paper auto-disappears from site + R2 deleted, 5th reporter from same IP blocked, reporter identities never leak

## STAGE 12 — Optional Profiles, Auth (Username + 5-Digit PIN) & Social
*Spec ref: 18 Optional Profiles, 19 Authentication, 20 Username, 21 Social Media*

- [ ] 12.1 API `POST /api/auth/register`: body {username, display_name, pin (5 digits)} — validate username unique case-insensitive via `normalized_username=lower(trim(username))` (Adonnis=adonnis=ADONNIS same per Spec 20), pin regex ^\d{5}$, hash via argon2id/bcrypt (never plaintext Spec 19), store normalized for search/lowercase index
- [ ] 12.2 API `POST /api/auth/login`: {username, pin} — lookup normalized, verify hash, rate limit 5 fails → temporary lockout with progressive delay (`locked_until` + `failed_attempts`), secure httpOnly sameSite=strict cookie `session_token` (signed JWT or DB session), CSRF token where relevant (Spec 51)
- [ ] 12.3 API `POST /api/auth/logout`, `GET /api/auth/me` session validation, middleware `lib/auth/middleware.ts`
- [ ] 12.4 Profile pages: `/profile/[username]` public (if user opts in), settings page `/settings` to edit display_name, PIN change (verify old PIN), optional socials Instagram/TikTok/X per Spec 21 with handle + display_publicly toggle — never mandatory, can remain anonymous
- [ ] 12.5 Username/profile uniqueness tests, PIN brute-force lockout tests, secure cookie tests
- [ ] 12.6 Attach uploader_id to paper_files when uploading logged in — else ghost (Anonymous contributor per Spec 24)
- [ ] 12.7 Data minimization: NO email/phone/OTP/password reset/magic links per Spec 19 — PIN only, explain in UI "PIN is not a normal password — keep it safe"
- **Deliverable:** Register adonnis + PIN 12345, login, upload attaches to profile, duplicate username AdOnNiS rejected, 5 wrong PINs locks account, ghost uploads still work side-by-side

## STAGE 13 — Leaderboard, Dashboard & Contribution UX
*Spec ref: 22 Leaderboard, 23 User Dashboard, 42 Analytics, 72 Contribution UX, 73 Community Philosophy*

- [ ] 13.1 Leaderboard API `GET /api/leaderboard?limit=20` — ordered by approved papers count desc, include rank, username/display_name, approved_count — anonymous contributors may appear as "Anonymous — 97 papers" per Spec 22, respects `display_publicly`, soft-deleted papers excluded, cached 5min
- [ ] 13.2 Leaderboard page `/leaderboard` — rank table with medals #1-3, "You" highlight if logged in, friendly copy per Spec 73 "Help the next NUST student. Every paper helps."
- [ ] 13.3 Dashboard `app/dashboard/page.tsx` (auth required) per Spec 23: Papers contributed total, Approved/Pending/Rejected counts, Leaderboard rank #12, Recent contributions list (ELC511S 2025 Test1 etc.) — simple, no social feed/comments/likes (Spec 57)
- [ ] 13.4 Analytics `lib/analytics.ts`: track paper views/downloads/uploads/approved/reports per Spec 42 — views/downloads dedup via cookie+ip window, approximate ok, no invasive tracking, no personal data collection, daily aggregation job
- [ ] 13.5 Contribution UX post-upload: success confetti + "Thank you for contributing to NustWeShare ❤️" (Spec 72), stats breakdown, link to view papers, if logged in "added to your profile" else "You contributed anonymously."
- [ ] 13.6 Profile contribution list `/profile/[username]/papers` paginated
- **Deliverable:** Upload 3 papers logged in → dashboard shows 3 pending → approved → leaderboard rank updates, ghost uploads show "Anonymous", no forced real names

## STAGE 14 — Security Hardening (Market-Ready, No Vulnerabilities)
*Spec ref: 51 Security, 52 Upload Abuse, 60 Data Integrity, 81 Security Testing*

- [ ] 14.1 Server-side validation on EVERY endpoint: Zod parse, never trust frontend values, resolve module/programme names from DB via IDs (Spec 60), reject forged module_id with 400 "We couldn't find that module. Please select a valid NUST module." (Spec 62)
- [ ] 14.2 PDF validation hardening: magic bytes, MIME, file signature, corrupt detection, max 3MB, concurrency 3 files/request, total payload limit 12MB
- [ ] 14.3 Upload abuse: per-IP rate limits (e.g., 10 uploads/hour via Upstash/CF KV or in-memory for v1), request limits, file size limits, honeypot field, timing check
- [ ] 14.4 Auth security: PIN hashed argon2, rate limit login 5/15min + progressive delay, failed attempts tracked, lockout, secure httpOnly cookies, sameSite, path, maxAge, CSRF protection on state-changing routes
- [ ] 14.5 Injection/XSS: parameterized queries via Drizzle (no raw SQL concat), escape output, Content-Security-Policy headers, sanitize filenames, safe R2 keys (no path traversal `../`), do NOT expose stack traces or DB errors to users (Spec 62)
- [ ] 14.6 Environment: all secrets via env, `.env.example` placeholders, never commit secrets, verify `process.env` access only server-side, audit deps `npm audit`
- [ ] 14.7 Rate limiting infra `lib/security/rateLimit.ts` abstracted (works on Workers KV or memory) applied to search, upload, report, auth
- [ ] 14.8 Security testing pass per Spec 81: invalid PDF uploads blocked, oversized rejected, malformed requests 400, duplicate reports blocked, brute-force locked, SQL injection `'; DROP --` safe, XSS `<script>` escaped, forged module_id rejected, manipulated filenames sanitized, malicious R2 keys `../../etc/passwd` rejected — automated tests written
- **Deliverable:** `npm run test:security` all green, no OWASP Top 10 gaps, every user input treated as untrusted (Spec 51 "treat every uploaded PDF as untrusted input")

## STAGE 15 — Performance, Accessibility, SEO & Mobile Polish
*Spec ref: 45 Mobile First, 46 Performance, 66 Design System, 85 Accessibility, 86 SEO*

- [ ] 15.1 Performance: static assets CDN cached, PDFs served from R2/CDN (not proxied through Workers per Spec 46), DB only metadata, app only dynamic ops, academic metadata ISR cached 1h, pagination (limit 20) never load thousands, API responses <200ms p95, image optimization, JS bundle audit
- [ ] 15.2 Mobile: test all flows upload/search/viewer/report on 360px width, 3G throttle, touch targets verified, no horizontal scroll, PDF viewer pinch/zoom works one-handed
- [ ] 15.3 Accessibility per Spec 85: semantic HTML (`<nav>`, `<main>`, heading hierarchy), keyboard navigation (Tab order, Esc closes modals), screen-reader labels (aria-label on search, upload), contrast 4.5:1 verified, focus states visible, form errors announced, no color-only status (use icons + text)
- [ ] 15.4 SEO: sitemap includes all module/paper pages, robots.txt, canonical URLs, meaningful titles per URL structure Spec 87 (`/febe`, `/fci`, `/febe/modules/elc511s`, `/febe/modules/elc511s/2025/exam`), meta descriptions, OG images, no private user info in sitemap
- [ ] 15.5 Lighthouse CI: performance >=90, accessibility >=95, SEO >=95 on homepage + module page + paper page
- **Deliverable:** Lighthouse green on all core pages, site feels fast on poor mobile data, every page keyboard navigable

## STAGE 16 — Testing (Critical Logic, No Broken Buttons)
*Spec ref: 80 Testing, 81 Security Testing, 95 Ownerless philosophy*

- [ ] 16.1 Unit tests `tests/unit/`: paper identity (`module+year+semester+type+number` uniqueness, EXAM number null enforcement Spec 3/58), assessment numbering, SHA-256 generation, report counting, five-report deletion transaction, PIN hashing + + lockout, upload validation (MIME/size/forged), module validation, DB constraints, filename parsing regex cases (ELC_2024_TEST_1 etc.)
- [ ] 16.2 Integration tests `tests/integration/`: upload → R2 mock → DB → duplicate check → paper_files link, search returns seeded module, browse hierarchy returns correct counts, report → 5th triggers soft delete, auth register→login→upload attaches, leaderboard ranking
- [ ] 16.3 E2E tests `tests/e2e/` Playwright: full user journey — visit homepage → search ELC511S → click module → view grouped papers → open viewer → download (check filename ELC511S_2025_Test_1.pdf) → go /upload → select module → drop 3 PDFs with mixed metadata → skip one → submit → see thank you → report a paper 5× (distinct IPs) → verify 410
- [ ] 16.4 Security tests per 14.8, plus upload 100 files rate-limited, brute-force 6th attempt locked verified
- [ ] 16.5 Manual QA checklist (every button): search bar, faculty cards, module links, year filters, viewer nav/zoom/fullscreen, download button, report button + categories, upload module selector, file picker drag-drop, per-file Type/Year selects, Skip, Submit, leaderboard ranks, dashboard counts, login/register, profile settings — NONE dead, NONE placeholder, NONE mock that does nothing (Spec 96)
- [ ] 16.6 Test coverage on critical business logic >80%, `npm test` CI passes
- **Deliverable:** All tests green in CI, manual QA sheet signed, no fake buttons, no dummy data where real required (Spec 96 Do NOT fake functionality)

## STAGE 17 — Deployment, Backups & Observability (Live Ready)
*Spec ref: 47 Hosting, 49 Free-First, 76 Background, 77 Observability, 78 Backups, 79 Env Vars*

- [ ] 17.1 Production env: provision Postgres free tier + R2 bucket (production + preview), set Cloudflare secrets via `wrangler secret put` (DATABASE_URL, R2 creds, APP_SECRET, ADMIN_SECRET), verify `.env.example` matches
- [ ] 17.2 Deploy pipeline: `npm run build` → `opennext build` → `wrangler deploy` via GitHub Actions `/.github/workflows/deploy.yml` — auto on main push (Spec 54 automatic deployment), preview deployments on PRs
- [ ] 17.3 Run migrations + seed on production: `wrangler exec "npm run db:migrate && npm run db:seed"` verify counts, run sitemap generation post-deploy
- [ ] 17.4 Custom domain + SSL (Cloudflare free), CDN cache rules for static + R2 assets, health check endpoint `/api/health`
- [ ] 17.5 Backups: nightly DB dump to R2 (`/backups/` prefix) + academic seed JSON + verification of R2 object replication, keep 30 days, restore procedure documented
- [ ] 17.6 Observability: lightweight logs to Cloudflare Logs/Workers Analytics for upload errors, processing failures, DB/R2 errors, auth failures, report activity, API errors (Spec 77) — no PINs logged, error alerting via log tail
- [ ] 17.7 Free-tier validation: hosting $0/month target, DB free tier, R2 free tier, GitHub free, SSL/CDN free — no paid service unless justified (Spec 49)
- [ ] 17.8 Smoke test production: search, view PDF, upload ghost 1 PDF, report, leaderboard loads, no console errors
- **Deliverable:** Live URL (e.g., `nustweshare.workers.dev` + custom domain) green, backups restorable, deploys without manual owner intervention

## STAGE 18 — Legal, Open-Source & Final Market-Ready Polish
*Spec ref: 53 Open Source, 55 GitHub Contribution, 56 Legal, 89 Takedown, 90-92 Final Experience*

- [ ] 18.1 Pages: `/copyright` + `/contact` lightweight takedown mechanism (Spec 89: explain if rights holder believes doc should be removed, submit request — community-maintained), no legal advice, contact form stores to DB + email forwarder optional
- [ ] 18.2 Footer/legal: site-wide disclaimer "NustWeShare is an independent student/community project and is not affiliated with, operated by, or officially endorsed by NUST..." (Spec 56), no false official branding, copyright notice
- [ ] 18.3 Open-source docs: `README.md` (vision, stack, features, folder structure, local setup `git clone → npm i → cp .env.example .env → npm run db:migrate → npm run db:seed → npm run dev`, deployment, adding faculties), `CONTRIBUTING.md` (bug fixes, UI improvements, new faculties, academic data updates per Spec 55), `LICENSE`, `SECURITY.md`, `docs/` folder (local-setup.md, database-setup.md, r2-setup.md, env.md, deployment.md, academic-data.md, adding-faculty.md, duplicate-detection.md, api.md, community-guidelines.md) — forkable by another NUST student (Spec 53)
- [ ] 18.4 No unnecessary features audit: verify NO Chat/Messaging/Social feed/Comments/Likes/Lecturer profiles/Course notes/AI tutor/AI summaries/Forums/Complex notifications/Paid subscriptions/Ads/Crypto/Gamification overload per Spec 57 — pure archive
- [ ] 18.5 No paywall verification per Spec 90 — all downloads free, no subscriptions/credits
- [ ] 18.6 No AI APIs verification per Spec 50 — grep codebase for openai/claude/gemini/deepseek api keys, none found, only regex/hashing/pdf parsing/perceptual
- [ ] 18.7 Final polish: copy review ("Past papers. Shared by students.", "Help keep NustWeShare organized ❤️"), brand consistent (Spec 67 NUST+We+Share), empty states friendly, error messages humane per Spec 62, all placeholder lorem removed, favicon/OG image
- [ ] 18.8 Final ideal experience rehearsal per Spec 92: search ELC511S → Electronic Devices → see 2026/2025 grouped Test1/Test2/Exam → click 2025 Exam → PDF opens instantly → Download → Upload 3 PDFs selecting ELC511S → add details to two → skip one → one duplicate dialog → confirm → Done in <2min on phone
- [ ] 18.9 Launch checklist: all STAGE 1-17 deliverables verified, `npm run build` passes, `npm audit` clean, sitemap submit, GitHub repo public, deployment tagged v1.0.0, "Build it once. Let the students maintain the knowledge together." (Spec 96) achieved
- **Deliverable:** Market-ready, fast, simple, free, searchable, well-organized, open-source, low-maintenance — ready for NUST students to use and contributors to fork

---

## How to Execute
```
do (1)        → builds Stage 1 completely
do (2-3)      → builds Stages 2 through 3 completely
do (4-6) etc. → builds that range completely
do (all)      → builds entire product market-ready
```

## Definition of Market-Ready (Must Pass Before Done)
- [ ] Every button/link navigates and does real work (no dead UI, no "#" links)
- [ ] No templates, no TODO, no `placeholder.pdf`, no mock data where real required
- [ ] No vulnerabilities (Stage 14 + 16.4 green, `npm audit` clean, CSP set)
- [ ] Seeded with full 2026 FEBE+FCI real academic data
- [ ] Search + Browse + View + Download + Upload (ghost+profile) + Duplicate flag + Report→auto-delete + Auth + Leaderboard/Dashboard all work end-to-end on mobile + desktop
- [ ] Deployed to Cloudflare Workers + R2 + Postgres free tier, backups ok, logs ok
- [ ] Docs allow another student to fork and run in 10 minutes
- [ ] Lighthouse 90+ performance, 95+ a11y, feels like "Google search + clean academic archive + simple document viewer" not a university LMS (Spec 1)

