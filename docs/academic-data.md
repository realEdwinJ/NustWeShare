# Academic Data — FEBE + FCI 2026

Source: Official NUST 2026 prospectuses — `NustWeShare_Official_Academic_Seed_Data_2026.md` (11,979 lines, 34 curriculum blocks) + `All courses.md` (303 lines).

## Hierarchy

```
Faculty (2) → School (4) → Department (10) → Programme (85) → Curriculum (85) → Module (946 canonical) → programme_modules (1,712 links)
```

### Faculties
- FEBE — Faculty of Engineering and the Built Environment (`febe`)
- FCI — Faculty of Computing and Informatics (`fci`)

### Schools
- FEBE: School of Engineering (`school-of-engineering`), School of the Built Environment (`school-of-the-built-environment`)
- FCI: School of Computing (`school-of-computing`), School of Informatics, Journalism and Media Technology (`school-of-informatics-journalism-media-technology`)

### Departments (10)
- FEBE 4: Civil Mining & Process, Mechanical Industrial & Electrical, Architecture Planning & Construction, Land Spatial Sciences
- FCI 6: Computer Science, Software Engineering, Cyber Security, Informatics, Journalism & Media, Digital Arts & Animation

### Programmes (85 codes)
- FEBE undergrad engineering: 04SMET, 07BECV, 08BCEN, 08BMEG, 08BEMT, 08BECE, 07BMEC, 08BEME, 08BIND, 07BELL, 07BPEN, 08BEET, 08BEEP (13)
- FEBE built env undergrad: 07BARC, 07ARCB (replaces 07BARC), 07BQTS/07BOQS, 07BURP/07BTAR, 07BORR/07BRAR, 06DIPS/06DPRS, 08BOPS/08BPRS, 07BLAN/07BLAM, 06DGET/06DGEO, 07BGEC/07BGEO, 07BGET/07BGEI (19)
- FEBE postgrad: 09MIWR, 09MECE, 09MEEN, 09MOEN, 09MMET, 09MIEN, 09MSES, 10DPIE/10DRPE, 08BARC, 09ARCM, 08BQSH, 08BRRD, 08BURP, 08HBLA, 08BGMH, 08BGTH, 09MOSS, 10DPSS (18)
- FCI certificates: 07CAWT, 07CBDT, 07CEHI (3)
- FCI undergrad: 07BOAI, 07BCSS, 07BCMS (old), 07BCCS, 07BCCY, 07BCSW, 07BAIT, 07BAIN, 07BJOU (9)
- FCI postgrad: 08BAIH, 08BCCH, 09MACS, 10DPCS, 08BHDS/08BDFH, 08BHIF/08BISH, 08BCHS/08HBCS, 08BHUH, 08PGIN, 08BIHW, 08BIFB/08BHIB, 08BDAH, 09MADS, 09MAIN, 10DPIN, 08BJOH, 09MJMT (20)
Total distinct codes: 84 → 85 with 07ARCB revision.

Each programme has one curriculum row with `label` and `status` (active/phase_in/phasing_out/archived) preserving old/revised per prospectus (e.g., 07BAIT phasing_out 2029, 07BAIN phase_in 2026).

### Modules (946 canonical)
- Extracted deterministically from curriculum tables in seed file via `src/db/seed/generate.ts`.
- Deduplicated: one row per code (e.g., PLU411S, MCI511S, COA511S appear in many programmes but stored once per Spec 7).
- Names normalized from table rows, first occurrence kept.
- Examples: MCI511S Mathematics for Computing 1A, PLU411S Principles of English Language Use, COA511S Computer Organisation and Architecture, DSA521S Data Structures 1, etc.
- Department assigned at import via first programme that uses the module (e.g., MCI511S via 07BOAI → dept-computer-science).

### Programme-Module Links (1,712)
- Each curriculum block's YEAR 1-3 / Semester 1-6 tables parsed for yearLevel + semester where extractable.
- Unique on (programmeId, moduleId, curriculumId) — idempotent.
- Example: 07BOAI Year1 Sem1 → PLU411S, CAI510S, COA511S, IPM510S, IAI510S, DBF510S.

## Seed Generation

```
npm run db:seed:generate  # via tsx src/db/seed/generate.ts
```

Reads `NustWeShare_Official_Academic_Seed_Data_2026.md`, regex extracts:
- Programme headings `## X. NAME CODE`
- YEAR / Semester context
- Module rows via code pattern `[A-Z]{2,4}\d{3,4}S`

Outputs:
- `src/db/seed/data/modules.ts` (946)
- `src/db/seed/data/programme_modules.ts` (1,712)

Static hierarchy files are hand-curated from `All courses.md` prospectus structure:
- `faculties.ts`, `schools.ts`, `departments.ts`, `programmes.ts` (85)

## Import

```bash
cp .env.example .env  # set DATABASE_URL (Neon/Supabase)
npm run db:migrate    # creates 13 tables + pg_trgm extension
npm run db:seed       # idempotent upsert, ~85 programmes + 946 modules + 1712 links
npm run db:verify     # counts + spot checks
```

- Idempotent: re-running does not duplicate (checks by slug/code before insert, updates names).
- Versioned by `yearIntroduced` and `curriculumStatus` — old papers remain discoverable via archived curricula.
- FK integrity enforced via DB constraints; verify script checks orphan links = 0.

## Adding Faculties (Spec 65)

No code change needed beyond DB rows. See `docs/adding-faculty.md`.

## Verification

After seed:
- `faculties=2` `schools=4` `departments=10` `programmes=85` `curricula=85` `modules=946` `programme_modules=1712`
- Spot checks: MCI511S linked to ≥3 programmes, PLU411S to ≥5, COA511S exists.

Run `npm run db:verify` after import.
