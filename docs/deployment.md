# Deployment — Cloudflare Workers + OpenNext

## Stack

- **App**: Next.js 16 with OpenNext (`@opennextjs/cloudflare`) → Cloudflare Workers (not Pages, Spec 47)
- **DB**: PostgreSQL free tier (Neon/Supabase) — `DATABASE_URL`
- **Storage**: Cloudflare R2 private bucket `nustweshare-papers` (Spec 16)
- **CDN**: Cloudflare free (Spec 49 $0 target)

## Prerequisites

```bash
# 1. Create R2 bucket
wrangler r2 bucket create nustweshare-papers
wrangler r2 bucket create nustweshare-papers-preview

# 2. Create Postgres (Neon https://neon.tech) — copy DATABASE_URL
# 3. Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" # APP_SECRET (64)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))" # ADMIN_SECRET (32)
```

## Env Vars

See `.env.example`. Required:

- `DATABASE_URL`
- `R2_BUCKET` / `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (if using S3 compat outside Workers binding)
- `APP_SECRET` (session signing)
- `ADMIN_SECRET` (POST /api/admin/papers/[id]/restore)
- `NEXT_PUBLIC_APP_URL` (e.g., https://nustweshare.workers.dev)

Set via:

```bash
wrangler secret put DATABASE_URL
wrangler secret put APP_SECRET
wrangler secret put ADMIN_SECRET
# or via GitHub Actions secrets
```

## Local Deploy

```bash
npm ci
npm run build:worker   # opennextjs-cloudflare build → .open-next/worker.js
wrangler deploy        # uses wrangler.toml main = ".open-next/worker.js"
# Or preview:
npm run deploy:preview
```

## CI Deploy (GitHub Actions)

Workflow `.github/workflows/deploy.yml` — on push to `main`:

- `npm ci` → `tsc --noEmit` → `npm test` → `npm run build -- --webpack` (checks)
- `npx @opennextjs/cloudflare build` → `wrangler deploy` via `cloudflare/wrangler-action@v3`
- Requires GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL`, `APP_SECRET`, etc.

## Post-Deploy

```bash
# Run migrations + seed on production (via `wrangler exec` or local with prod DATABASE_URL)
DATABASE_URL="postgresql://prod..." npm run db:migrate
DATABASE_URL="postgresql://prod..." npm run db:seed
DATABASE_URL="postgresql://prod..." npm run db:verify

# Check health
curl https://nustweshare.workers.dev/api/health | jq
# Should return { ok: true, checks: { db: {ok:true}, r2:{ok:true}, env:{ok:true} } }

# Sitemap
curl https://nustweshare.workers.dev/sitemap.xml | head
```

## Custom Domain + SSL (Free)

1. Cloudflare Dashboard → Workers & Pages → `nustweshare` → Settings → Triggers → Custom Domain → Add `nustweshare.com`
2. SSL auto-provisions (free, Spec 49)
3. CDN cache: R2 custom domain fronted by Cloudflare, `Cache-Control` headers already set for `/_next/static` (1y immutable) and academic metadata (1h)

## Portability

App is portable per Spec 47,94: swap `R2` for `S3` by changing `getStorage()` adapter, swap `DATABASE_URL` to any Postgres — no Cloudflare-specific business logic.
