import { programmes } from "../src/db/seed/data/programmes.ts";
import { programmeModules } from "../src/db/seed/data/programme_modules.ts";
const progCodes = new Set(programmes.map(p=>p.code));
const bad = new Set();
for (const pm of programmeModules) if (!progCodes.has(pm.programmeCode)) bad.add(pm.programmeCode);
console.log([...bad].sort().join('\n'));
console.log('bad distinct', bad.size);
const badList = [...bad];
for (const code of badList.slice(0,10)) {
  const count = programmeModules.filter(pm=>pm.programmeCode===code).length;
  console.log(code, count);
}
