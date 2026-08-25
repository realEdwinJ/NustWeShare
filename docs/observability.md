# Observability — Spec 77

Lightweight, no PINs/PII.

## What We Log

Via `src/lib/logger.ts` → `console.{log,warn,error}` → Cloudflare Workers Logs / `wrangler tail`:

- `upload_error` — file validation, duplicate, size
- `processing_failure` — text fingerprint / pHash failure
- `db_error` — Drizzle errors
- `r2_error` — S3/R2 put/get/delete
- `auth_failure` — login fail, lockout
- `report_activity` — paperId, reason (no reporter identity)
- `api_error` — 500s

**Never log**: `pin`, `pin_hash`, `secret`, `token`, `access_key`

## How to View

```bash
wrangler tail nustweshare --format pretty
# Filter
wrangler tail nustweshare | grep upload_error
```

Cloudflare Dashboard → Workers & Pages → `nustweshare` → Logs → Tail.

## Health

`GET /api/health` → `{ ok, checks: {db, r2, env}, latencyMs }` — 200 if all ok, 503 if any fail. Use for uptime monitor (e.g., UptimeRobot).

```bash
curl -s https://nustweshare.workers.dev/api/health | jq
```

## Metrics (Approximate, Spec 42)

- `papers.views` / `downloads` — deduped via cookie 1h, not perfect
- `reports` count per paper
- `uploads` total

Query via `SELECT COUNT(*) FROM papers WHERE status='active'` etc.

## Alerting

Simple: Cloudflare alert on `>5%` error rate or `health` 503. For MVP, manual `wrangler tail` is enough.

## No Invasive Tracking

No personal data collection, no third-party analytics (Spec 42, 77).
