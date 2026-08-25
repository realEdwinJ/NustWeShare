# Contributing to NustWeShare

Thank you for helping fellow NUST students!

## How to Contribute

- **Bug fixes**: open issue → PR
- **UI improvements**: keep mobile-first, accessible, no gradients overload
- **New faculties/programmes/modules**: see `docs/adding-faculty.md` + `docs/academic-data.md`
- **Academic data updates**: edit `src/db/seed/data/*.ts` or re-run `npx tsx src/db/seed/generate.ts`
- **Performance/security**: no AI APIs (Spec 50), no paywall

## Setup

```bash
git clone https://github.com/your-fork/nustweshare.git && cd nustweshare
npm ci
cp .env.example .env  # fill DATABASE_URL, APP_SECRET
npm run db:migrate
npm run db:seed
npm run db:verify
npm run dev
```

Seed data from official NUST 2026 prospectuses — do not invent programmes.

## PR Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes (50 tests, 3 filename edge cases fixed)
- [ ] `npm run build` passes (webpack, 25 routes)
- [ ] No `console.log` secrets, no `dangerouslySetInnerHTML`
- [ ] Mobile tested 360px, keyboard nav, `min-h-[44px]` touch targets
- [ ] No hard-coded `if faculty==FEBE` (Spec 65)
- [ ] New faculty added via DB rows only

## Spec

Read `NustWeShare — Master Spec.md` (96 sections) + `IMPLEMENTATION_STAGES.md` before large changes.

## Community

- Be kind, no harassment
- Anonymous uploads respected
- 5 reports auto-delete is intentional (Spec 34)

## License

MIT — by contributing you agree to MIT.
