import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { getDb, closeDb } from "@/lib/db";
import { faculties } from "@/db/schema/faculties";
import { schools } from "@/db/schema/schools";
import { departments } from "@/db/schema/departments";
import { programmes } from "@/db/schema/programmes";
import { curricula } from "@/db/schema/curricula";
import { modules } from "@/db/schema/modules";
import { programmeModules } from "@/db/schema/programme_modules";
import { faculties as facultyData } from "./data/faculties";
import { schools as schoolData } from "./data/schools";
import { departments as deptData } from "./data/departments";
import { programmes as programmeData } from "./data/programmes";
import { modules as moduleData } from "./data/modules";
import { programmeModules as pmData } from "./data/programme_modules";
import { logger } from "@/lib/logger";

async function main() {
  const db = getDb();
  console.log("[seed] starting import — FEBE + FCI 2026");
  console.log(`[seed] faculties=${facultyData.length} schools=${schoolData.length} departments=${deptData.length} programmes=${programmeData.length} modules=${moduleData.length} links=${pmData.length}`);

  // 1. Faculties
  console.log("[seed] faculties...");
  for (const f of facultyData) {
    const existing = await db.select().from(faculties).where(eq(faculties.slug, f.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(faculties).values({ code: f.code, name: f.name, slug: f.slug });
      console.log(`  + faculty ${f.slug}`);
    } else {
      await db.update(faculties).set({ code: f.code, name: f.name }).where(eq(faculties.slug, f.slug));
      console.log(`  ~ faculty ${f.slug} (updated)`);
    }
  }

  // Build faculty slug -> id map
  const facultyRows = await db.select().from(faculties);
  const facultyIdBySlug = new Map(facultyRows.map((r) => [r.slug, r.id]));

  // 2. Schools
  console.log("[seed] schools...");
  for (const s of schoolData) {
    const facultyId = facultyIdBySlug.get(s.facultySlug);
    if (!facultyId) throw new Error(`faculty not found: ${s.facultySlug}`);
    const existing = await db.select().from(schools).where(eq(schools.slug, s.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(schools).values({ facultyId, name: s.name, code: s.code, slug: s.slug });
      console.log(`  + school ${s.slug}`);
    } else {
      await db.update(schools).set({ facultyId, name: s.name, code: s.code }).where(eq(schools.slug, s.slug));
      console.log(`  ~ school ${s.slug}`);
    }
  }
  const schoolRows = await db.select().from(schools);
  const schoolIdBySlug = new Map(schoolRows.map((r) => [r.slug, r.id]));

  // 3. Departments
  console.log("[seed] departments...");
  for (const d of deptData) {
    const schoolId = schoolIdBySlug.get(d.schoolSlug);
    if (!schoolId) throw new Error(`school not found: ${d.schoolSlug}`);
    const existing = await db.select().from(departments).where(eq(departments.slug, d.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(departments).values({ schoolId, name: d.name, slug: d.slug });
      console.log(`  + dept ${d.slug}`);
    } else {
      await db.update(departments).set({ schoolId, name: d.name }).where(eq(departments.slug, d.slug));
      console.log(`  ~ dept ${d.slug}`);
    }
  }
  const deptRows = await db.select().from(departments);
  const deptIdBySlug = new Map(deptRows.map((r) => [r.slug, r.id]));

  // 4. Programmes
  console.log("[seed] programmes...");
  for (const p of programmeData) {
    const deptId = deptIdBySlug.get(p.departmentSlug);
    if (!deptId) throw new Error(`dept not found: ${p.departmentSlug} for ${p.code}`);
    const existing = await db.select().from(programmes).where(eq(programmes.code, p.code)).limit(1);
    // Map level string to enum
    const level = p.level;
    if (existing.length === 0) {
      await db.insert(programmes).values({
        departmentId: deptId,
        code: p.code,
        name: p.name,
        level: level as any,
        nqfLevel: p.nqfLevel,
        nqfCredits: p.nqfCredits,
        active: true,
      });
      console.log(`  + programme ${p.code}`);
    } else {
      await db
        .update(programmes)
        .set({ departmentId: deptId, name: p.name, level: level as any, nqfLevel: p.nqfLevel, nqfCredits: p.nqfCredits })
        .where(eq(programmes.code, p.code));
      console.log(`  ~ programme ${p.code}`);
    }
  }
  const progRows = await db.select().from(programmes);
  const progIdByCode = new Map(progRows.map((r) => [r.code, r.id]));
  const progByCode = new Map(programmeData.map((p) => [p.code, p]));

  // 5. Curricula (one per programme)
  console.log("[seed] curricula...");
  for (const p of programmeData) {
    const progId = progIdByCode.get(p.code);
    if (!progId) throw new Error(`programme id missing for ${p.code}`);
    const existing = await db.select().from(curricula).where(eq(curricula.programmeId, progId)).limit(1);
    if (existing.length === 0) {
      await db.insert(curricula).values({
        programmeId: progId,
        label: p.curriculumLabel,
        status: p.curriculumStatus as any,
        yearIntroduced: p.yearIntroduced,
      });
      console.log(`  + curriculum for ${p.code}`);
    } else {
      await db
        .update(curricula)
        .set({ label: p.curriculumLabel, status: p.curriculumStatus as any, yearIntroduced: p.yearIntroduced })
        .where(eq(curricula.programmeId, progId));
      console.log(`  ~ curriculum for ${p.code}`);
    }
  }
  const currRows = await db.select().from(curricula);
  const currIdByProgId = new Map(currRows.map((r) => [r.programmeId, r.id]));
  // Also need progId -> currId quick
  const currIdByProgCode = new Map<string, string>();
  for (const p of programmeData) {
    const pid = progIdByCode.get(p.code);
    if (pid) {
      const cid = currIdByProgId.get(pid);
      if (cid) currIdByProgCode.set(p.code, cid);
    }
  }

  // 6. Modules — canonical, map code -> dept via first programme that uses it
  console.log("[seed] modules...");
  // Build module -> department slug via first pm that references it
  const moduleDeptSlug = new Map<string, string>();
  for (const pm of pmData) {
    if (!moduleDeptSlug.has(pm.moduleCode)) {
      const prog = progByCode.get(pm.programmeCode);
      if (prog) moduleDeptSlug.set(pm.moduleCode, prog.departmentSlug);
    }
  }
  // For modules that are orphan (not in pmData) — shouldn't happen since pmData covers all modules, but handle
  let insertedMods = 0;
  let updatedMods = 0;
  // Batch insert for speed: process in chunks of 100
  const CHUNK = 100;
  for (let i = 0; i < moduleData.length; i += CHUNK) {
    const chunk = moduleData.slice(i, i + CHUNK);
    for (const m of chunk) {
      const deptSlug = moduleDeptSlug.get(m.code);
      const deptId = deptSlug ? deptIdBySlug.get(deptSlug) ?? null : null;
      const existing = await db.select().from(modules).where(eq(modules.code, m.code)).limit(1);
      if (existing.length === 0) {
        await db.insert(modules).values({ code: m.code, name: m.name, departmentId: deptId, active: true });
        insertedMods++;
      } else {
        // Update name if changed, but keep department if already set to avoid churn
        if (existing[0].name !== m.name) {
          await db.update(modules).set({ name: m.name }).where(eq(modules.code, m.code));
        }
        updatedMods++;
      }
    }
    if (i % 500 === 0) console.log(`  ... ${Math.min(i + CHUNK, moduleData.length)}/${moduleData.length}`);
  }
  console.log(`[seed] modules inserted=${insertedMods} updated=${updatedMods}`);

  const modRows = await db.select().from(modules);
  const modIdByCode = new Map(modRows.map((r) => [r.code, r.id]));

  // 7. programme_modules links
  console.log("[seed] programme_modules...");
  let insertedPM = 0;
  let skippedPM = 0;
  for (const pm of pmData) {
    const progId = progIdByCode.get(pm.programmeCode);
    const modId = modIdByCode.get(pm.moduleCode);
    const currId = currIdByProgCode.get(pm.programmeCode);
    if (!progId) {
      console.warn(`  ! programme not found for PM ${pm.programmeCode} -> ${pm.moduleCode}`);
      skippedPM++;
      continue;
    }
    if (!modId) {
      console.warn(`  ! module not found for PM ${pm.programmeCode} -> ${pm.moduleCode}`);
      skippedPM++;
      continue;
    }
    if (!currId) {
      console.warn(`  ! curriculum not found for ${pm.programmeCode}`);
      skippedPM++;
      continue;
    }
    const existing = await db
      .select()
      .from(programmeModules)
      .where(and(eq(programmeModules.programmeId, progId), eq(programmeModules.moduleId, modId), eq(programmeModules.curriculumId, currId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(programmeModules).values({
        programmeId: progId,
        moduleId: modId,
        curriculumId: currId,
        yearLevel: pm.yearLevel,
        semester: pm.semester,
        isCore: true,
      });
      insertedPM++;
    } else {
      // Update year/semester if changed
      const ex = existing[0];
      if (ex.yearLevel !== pm.yearLevel || ex.semester !== pm.semester) {
        await db
          .update(programmeModules)
          .set({ yearLevel: pm.yearLevel, semester: pm.semester })
          .where(eq(programmeModules.id, ex.id));
      }
      skippedPM++;
    }
  }
  console.log(`[seed] programme_modules inserted=${insertedPM} existing/skipped=${skippedPM}`);

  console.log("[seed] done — verifying...");
  // Quick counts
  const counts = {
    faculties: (await db.select().from(faculties)).length,
    schools: (await db.select().from(schools)).length,
    departments: (await db.select().from(departments)).length,
    programmes: (await db.select().from(programmes)).length,
    curricula: (await db.select().from(curricula)).length,
    modules: (await db.select().from(modules)).length,
    programmeModules: (await db.select().from(programmeModules)).length,
  };
  console.log("[seed] counts:", counts);

  // Expected per spec
  const expected = { faculties: 2, schools: 4, departments: 10, programmes: programmeData.length, curricula: programmeData.length };
  let ok = true;
  for (const [k, v] of Object.entries(expected)) {
    if ((counts as any)[k] !== v) {
      console.error(`[seed] mismatch ${k}: expected ${v}, got ${(counts as any)[k]}`);
      ok = false;
    }
  }
  if (counts.modules < 400) {
    console.warn(`[seed] low module count: ${counts.modules} (expected 400+). Check parser.`);
    ok = false;
  }
  if (!ok) {
    console.warn("[seed] verification warnings — check logs");
  } else {
    console.log("[seed] verification passed");
  }

  await closeDb();
  console.log("[seed] import complete");
}

main().catch(async (e) => {
  console.error("[seed] failed", e);
  logger.error("seed_failed", { error: String(e) });
  try {
    await closeDb();
  } catch {}
  process.exit(1);
});
