# Backups — Spec 78

## What to Back Up

- **DB metadata**: faculties→modules, papers, paper_files, reports, users (not PDFs)
- **Academic seed**: `src/db/seed/data/*.ts` (already in git)
- **R2 PDFs**: where feasible (10 GB free tier)

## Strategy (Free-First)

### Nightly DB Dump → R2

```bash
# Cron via GitHub Actions or local cron
pg_dump "$DATABASE_URL" --no-owner --clean | gzip > /tmp/nustweshare-$(date +%F).sql.gz
# Upload to R2
wrangler r2 object put nustweshare-papers/backups/db-$(date +%F).sql.gz --file=/tmp/nustweshare-$(date +%F).sql.gz
# Keep 30 days, delete old
wrangler r2 object delete nustweshare-papers/backups/db-$(date -d '30 days ago' +%F).sql.gz
```

GitHub Actions workflow `.github/workflows/backup.yml` (create if needed) runs `0 2 * * *`.

### R2 Replication

R2 has automatic replication within region. For cross-region, enable `wrangler r2 bucket replication`.

### Academic Seed

Seed data is in git — any clone has it. No extra backup needed beyond `git`.

## Restore

```bash
# DB
gunzip < /tmp/nustweshare-2026-08-24.sql.gz | psql "$DATABASE_URL"

# Single paper restore (admin)
curl -X POST https://nustweshare.com/api/admin/papers/<id>/restore -H "x-admin-secret: $ADMIN_SECRET"

# R2 object restore (if soft-deleted, still in R2? 5-report delete does R2.delete; restore from backup)
wrangler r2 object get nustweshare-papers/backups/db-2026-08-24.sql.gz --file=/tmp/restore.sql.gz
```

## No Single Laptop Dependency (Spec 78)

- DB dumps to R2, not local laptop
- Seed in git (GitHub)
- R2 objects replicated

## Retention

- DB dumps: 30 days rolling
- R2 PDFs: indefinite (free 10 GB) — if exceeds, add lifecycle to move old to Archive
