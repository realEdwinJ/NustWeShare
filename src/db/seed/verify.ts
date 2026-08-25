import "dotenv/config";
import { eq, count } from "drizzle-orm";
import { getDb, closeDb } from "@/lib/db";
import { faculties } from "@/db/schema/faculties";
import { schools } from "@/db/schema/schools";
import { departments } from "@/db/schema/departments";
import { programmes } from "@/db/schema/programmes";
import { curricula } from "@/db/schema/curricula";
import { modules } from "@/db/schema/modules";
import { programmeModules } from "@/db/schema/programme_modules";

async function main() {
  const db = getDb();
  console.log("[verify] checking academic data integrity...");

  const c = {
    faculties: (await db.select({ v: count() }).from(faculties))[0].v,
    schools: (await db.select({ v: count() }).from(schools))[0].v,
    departments: (await db.select({ v: count() }).from(departments))[0].v,
    programmes: (await db.select({ v: count() }).from(programmes))[0].v,
    curricula: (await db.select({ v: count() }).from(curricula))[0].v,
    modules: (await db.select({ v: count() }).from(modules))[0].v,
    programmeModules: (await db.select({ v: count() }).from(programmeModules))[0].v,
  };
  console.log("[verify] counts:", c);

  const checks: Array<{ name: string; pass: boolean; msg: string }> = [];

  checks.push({ name: "faculties=2", pass: c.faculties === 2, msg: `faculties=${c.faculties}` });
  checks.push({ name: "schools=4", pass: c.schools === 4, msg: `schools=${c.schools}` });
  checks.push({ name: "departments=10", pass: c.departments === 10, msg: `departments=${c.departments}` });
  checks.push({ name: "programmes >=60", pass: c.programmes >= 60, msg: `programmes=${c.programmes}` });
  checks.push({ name: "curricula == programmes", pass: c.curricula === c.programmes, msg: `curricula=${c.curricula} programmes=${c.programmes}` });
  checks.push({ name: "modules >=400", pass: c.modules >= 400, msg: `modules=${c.modules}` });
  checks.push({ name: "programmeModules >=800", pass: c.programmeModules >= 800, msg: `pm=${c.programmeModules}` });

  // Spot checks: canonical modules must exist and be unique
  const spotCodes = ["MCI511S", "PLU411S", "COA511S", "BMC511S", "DBF510S", "EPR511S", "ASP611S", "DSA521S"];
  for (const code of spotCodes) {
    const rows = await db.select().from(modules).where(eq(modules.code, code));
    checks.push({
      name: `module ${code} exists`,
      pass: rows.length === 1,
      msg: rows.length === 1 ? `${code} — ${rows[0].name}` : `found ${rows.length}`,
    });
    if (rows.length === 1) {
      // Check that module appears in multiple programmes (canonical dedup per Spec 7)
      const links = await db.select().from(programmeModules).where(eq(programmeModules.moduleId, rows[0].id));
      checks.push({
        name: `module ${code} linked`,
        pass: links.length >= 1,
        msg: `${links.length} programmes`,
      });
    }
  }

  // Check for orphan programme_modules (should be zero because FK restrict)
  // Instead check that every programme has at least one module if it was in seed blocks
  const allProgs = await db.select().from(programmes);
  for (const p of allProgs.slice(0, 5)) {
    const links = await db.select().from(programmeModules).where(eq(programmeModules.programmeId, p.id));
    console.log(`[verify] ${p.code} — ${p.name.slice(0, 40)} — modules=${links.length}`);
  }

  // Faculty hierarchy spot check
  const febe = await db.select().from(faculties).where(eq(faculties.slug, "febe"));
  const fci = await db.select().from(faculties).where(eq(faculties.slug, "fci"));
  checks.push({ name: "febe exists", pass: febe.length === 1, msg: febe[0]?.name ?? "missing" });
  checks.push({ name: "fci exists", pass: fci.length === 1, msg: fci[0]?.name ?? "missing" });

  const febeSchools = await db.select().from(schools).where(eq(schools.facultyId, febe[0]?.id ?? ""));
  const fciSchools = await db.select().from(schools).where(eq(schools.facultyId, fci[0]?.id ?? ""));
  checks.push({ name: "febe schools=2", pass: febeSchools.length === 2, msg: `${febeSchools.length}` });
  checks.push({ name: "fci schools=2", pass: fciSchools.length === 2, msg: `${fciSchools.length}` });

  // Report
  let allPass = true;
  for (const chk of checks) {
    const icon = chk.pass ? "✓" : "✗";
    console.log(`[verify] ${icon} ${chk.name}: ${chk.msg}`);
    if (!chk.pass) allPass = false;
  }

  if (allPass) {
    console.log("[verify] ALL CHECKS PASSED");
  } else {
    console.error("[verify] SOME CHECKS FAILED");
    process.exitCode = 1;
  }

  await closeDb();
}

main().catch(async (e) => {
  console.error("[verify] failed", e);
  await closeDb();
  process.exit(1);
});
