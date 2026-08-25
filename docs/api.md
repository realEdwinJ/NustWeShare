# API — Clean, Validated, Consistent Errors (Spec 61,62)

Base: `NEXT_PUBLIC_APP_URL` (e.g., https://nustweshare.com)

## Conventions

- `GET` for read, `POST` for write
- Validate via `Zod` or manual, 400 `VALIDATION_ERROR` with human `We couldn't find that module...`
- 500 never leaks stack → `Something went wrong`
- `Cache-Control` for academic metadata `s-maxage=3600`, no-store for auth/upload
- Rate limit via `src/lib/security/rateLimit` (memory, swap to KV for Workers)

## Endpoints

See `src/app/api` — 20 routes, all `force-dynamic`:

- `GET /api/faculties` → `[{code, name, slug}]`
- `GET /api/schools?facultySlug=febe` → schools
- `GET /api/departments?schoolSlug=...` → departments
- `GET /api/programmes?departmentSlug=...` → programmes
- `GET /api/modules?programmeCode=07BOAI` → modules via `programme_modules` join (canonical)
- `GET /api/modules/[code]` → `{code, name, programmes: [{code, name, yearLevel}]}` + dept
- `GET /api/search?q=MCI` → `{modules, programmes}` ranked `exact code → prefix → contains`
- `GET /api/papers?moduleCode=MCI511S&year=2025&type=TEST` → papers `moduleCode` + joined `modules.name`, pagination `limit/page`
- `GET /api/papers/[id]` → `module:{code,name}, academicYear, semester, assessmentType, assessmentNumber, views/downloads, canonicalFile`
- `POST /api/papers/[id]/view` → +1 views dedup cookie 1h
- `GET /api/papers/[id]/download` → 302 `R2 signedUrl` + `X-Download-Filename: MCI511S_2025_Test_1.pdf` + cookie dedup
- `POST /api/papers/upload` → `multipart` `moduleId` + `files` + `metadata` JSON, ghost or session `uploaderId`, returns `{results, summary}`
- `POST /api/papers/[id]/report` → `{reason, details}`, 409 if already reported, 5→auto delete
- `POST /api/auth/register` → `{username, displayName, pin}` → 201 + `httpOnly` cookie
- `POST /api/auth/login` → `{username, pin}` → cookie, 429 lockout after 5
- `POST /api/auth/logout` → clear cookie
- `GET /api/auth/me` → session
- `GET /api/leaderboard?limit=20` → `[{rank, username, displayName, approvedCount}]` + Anonymous
- `GET /api/dashboard` → `{total, approved, pending, rejected, rank, recent}` (auth)
- `GET /api/health` → `{ok, checks: {db,r2,env}}`
- `GET /api/files/[...key]` → `application/pdf` from `uploads` (dev) or R2 (prod)

## Errors

```json
{ "error": { "code": "MODULE_NOT_FOUND", "message": "We couldn't find that module..." } }
```

Never `Foreign key constraint violation`.
