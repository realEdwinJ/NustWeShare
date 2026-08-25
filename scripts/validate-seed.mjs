import { faculties } from "../src/db/seed/data/faculties.ts";
import { schools } from "../src/db/seed/data/schools.ts";
import { departments } from "../src/db/seed/data/departments.ts";
import { programmes } from "../src/db/seed/data/programmes.ts";
import { modules } from "../src/db/seed/data/modules.ts";
import { programmeModules } from "../src/db/seed/data/programme_modules.ts";

console.log('faculties', faculties.length);
console.log('schools', schools.length);
console.log('departments', departments.length);
console.log('programmes', programmes.length);
console.log('modules', modules.length);
console.log('pm', programmeModules.length);
const progCodes = new Set(programmes.map(p=>p.code));
const modCodes = new Set(modules.map(m=>m.code));
let badProg=0, badMod=0;
for (const pm of programmeModules) {
  if (!progCodes.has(pm.programmeCode)) badProg++;
  if (!modCodes.has(pm.moduleCode)) badMod++;
}
console.log('badProgRefs', badProg, 'badModRefs', badMod);
console.log('sample prog', programmes[0]);
console.log('sample mod', modules[0]);
console.log('sample pm', programmeModules[0]);
