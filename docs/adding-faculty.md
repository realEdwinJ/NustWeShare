# Adding a New Faculty

Per Spec 65 — no core code change, only DB rows + optional seed data.

## Steps (Example: Faculty of Health, Natural Resources and Applied Sciences)

1. **Add faculty row** — via seed file or SQL:
```sql
INSERT INTO faculties (code, name, slug) VALUES ('FHNR', 'Faculty of Health, Natural Resources and Applied Sciences', 'fhnr');
```

2. **Add schools** under faculty:
```sql
INSERT INTO schools (faculty_id, name, code, slug)
SELECT id, 'School of Natural Resources', 'SNR', 'school-of-natural-resources' FROM faculties WHERE slug='fhnr';
```

3. **Add departments** under schools:
```sql
INSERT INTO departments (school_id, name, slug)
SELECT id, 'Department of Agriculture', 'dept-agriculture' FROM schools WHERE slug='school-of-natural-resources';
```

4. **Add programmes** under department — add to `src/db/seed/data/programmes.ts`:
```ts
{ departmentSlug: "dept-agriculture", code: "07BAGR", name: "Bachelor of Agriculture", level: "bachelor", nqfLevel: 7, nqfCredits: 360, curriculumLabel: "2026", curriculumStatus: "active", yearIntroduced: 2026 },
```

5. **Add curriculum + modules** — if you have prospectus tables, run `src/db/seed/generate.ts` after appending a new block to the seed markdown, or manually add entries to `modules.ts` and `programme_modules.ts`.

6. **Run seed**:
```bash
npm run db:migrate
npm run db:seed
npm run db:verify
```

Browse will immediately show new faculty via `GET /api/faculties` — no `if faculty==FEBE` code.

## Notes
- Keep `slug` URL-safe, lowercase, hyphens.
- Preserve old curricula with `status='archived'` rather than deleting — past papers remain discoverable.
- Module codes are canonical: if a new faculty shares a module like AME511S Mathematics, reuse existing module row via `programme_modules` link rather than creating duplicate.
- No frontend hard-coding required.
