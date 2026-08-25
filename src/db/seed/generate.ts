import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd());
const SEED_PATH = path.join(ROOT, "NustWeShare_Official_Academic_Seed_Data_2026.md");
const OUT_MODULES = path.join(ROOT, "src/db/seed/data/modules.ts");
const OUT_PM = path.join(ROOT, "src/db/seed/data/programme_modules.ts");

function parseSeed() {
  const content = fs.readFileSync(SEED_PATH, "utf-8");
  const lines = content.split("\n");

  // Map code -> { name, departmentHint }
  const modulesMap = new Map<string, { code: string; name: string }>();
  const programmeModules: Array<{
    programmeCode: string;
    moduleCode: string;
    yearLevel: number | null;
    semester: number | null;
  }> = [];

  let currentProgrammeCode: string | null = null;
  let currentYear: number | null = null;
  let currentSemester: number | null = null;

  // Regex for programme heading: ## X. NAME CODE
  const programmeHeadingRegex = /^##\s+\d+\.\s+.*\b([0-9]{2}[A-Z]{2,7})\b/;
  // Also handle 0909MACS special case
  const codePattern = /\b([A-Z]{2,4}\d{3,4}[A-Z]?S)\b/;
  // Skip headers
  const skipLine = (l: string) =>
    l.includes("Course Title") ||
    l.includes("Course           Pre-Requisite") ||
    l.includes("Course       Pre-Requisite") ||
    l.includes("NQF       NQF") ||
    l.includes("YEAR") && l.includes("Semester") === false && l.trim().startsWith("YEAR") && l.length < 15 ||
    l.includes("Faculty of Computing") ||
    l.includes("Prospectus 2026") ||
    l.trim() === "" ||
    l.trim().startsWith("```") ||
    l.trim().startsWith("#");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect programme heading
    const progMatch = line.match(programmeHeadingRegex);
    if (progMatch) {
      let code = progMatch[1];
      // Normalize 0909MACS -> 09MACS
      if (code === "0909MACS") code = "09MACS";
      // For duplicate headings like 07BCSS appears twice, we keep as is but year/semester tracking continues
      currentProgrammeCode = code;
      currentYear = null;
      currentSemester = null;
      continue;
    }

    // Detect YEAR
    const yearMatch = line.match(/YEAR\s+(\d)/i);
    if (yearMatch && line.trim().toUpperCase().startsWith("YEAR")) {
      currentYear = parseInt(yearMatch[1], 10);
      continue;
    }
    // Detect Semester
    const semMatch = line.match(/Semester\s+(\d)/i);
    if (semMatch) {
      currentSemester = parseInt(semMatch[1], 10);
      continue;
    }

    if (!currentProgrammeCode) continue;
    if (skipLine(line)) continue;

    // Try to extract module code
    const m = line.match(codePattern);
    if (m) {
      const code = m[1];
      // Filter out false positives like "Q2015" etc. Must be like XXX###S
      if (!/^[A-Z]{2,4}\d{3}[A-Z]?S$/.test(code)) continue;
      // Skip if line is header like "Course Code"
      if (line.includes("Pre-Requisite") && line.indexOf(code) < 30) continue;

      // Extract name: text before code, trimmed, remove excessive spaces
      const idx = line.indexOf(code);
      let namePart = line.slice(0, idx).trim();
      // Remove leading spaces and collapse
      namePart = namePart.replace(/\s{2,}/g, " ").trim();
      // Heuristic: name should be at least 3 chars and not be "Semester 1" etc.
      if (namePart.length < 3) continue;
      if (/^(Semester|YEAR|Course)/i.test(namePart)) continue;
      // Some lines have "Plus ONE of the following" etc. Skip those
      if (/Plus ONE/i.test(namePart)) continue;
      if (namePart.toLowerCase().includes("strand")) continue;
      // Clean name: take up to 80 chars, trim
      let cleanName = namePart;
      // Remove trailing "None" artifacts? Actually some rows have prereq after code, not before
      // Name may be like "Computer Programming Concepts" — good
      // If name contains double spaces due to table, already collapsed
      // Limit length
      if (cleanName.length > 80) cleanName = cleanName.slice(0, 80).trim();

      // Skip if name looks like a code itself or nonsense
      if (/^[A-Z0-9\s]+$/.test(cleanName) && cleanName.length < 10) continue;

      // Only keep plausible module names (contain at least one space or longer than 8)
      if (!cleanName.includes(" ") && cleanName.length < 10) continue;

      // Add to map if not exists, keep first name
      if (!modulesMap.has(code)) {
        modulesMap.set(code, { code, name: cleanName });
      }

      // Add programme_module relationship
      programmeModules.push({
        programmeCode: currentProgrammeCode,
        moduleCode: code,
        yearLevel: currentYear,
        semester: currentSemester,
      });
    }
  }

  return { modulesMap, programmeModules };
}

function main() {
  console.log(`[generate] reading ${SEED_PATH}`);
  const { modulesMap, programmeModules } = parseSeed();
  console.log(`[generate] found ${modulesMap.size} distinct modules`);
  console.log(`[generate] found ${programmeModules.length} programme_module links`);

  // Sort modules by code
  const modules = Array.from(modulesMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  // Need department mapping for modules — derive from programmes
  // Load programmes data to map module -> department
  const programmesPath = path.join(ROOT, "src/db/seed/data/programmes.ts");
  const progContent = fs.readFileSync(programmesPath, "utf-8");
  // Quick extract mapping via regex for departmentSlug per code
  const deptMap = new Map<string, string>();
  // Very simple: parse lines that contain code and departmentSlug
  // We'll instead import the TS file by evaluating? Simpler: we already have mapping in programmes.ts as JS object, we can require via ts-node? But we can just not set department yet and leave nullable.
  // For now, modules will be assigned department based on first programme that uses it, but we set departmentSlug as null and import will resolve via first programme's department.
  // Let's just create modules.ts with code and name, departmentSlug will be derived at import time.

  const modulesTs = `// Auto-generated from NustWeShare_Official_Academic_Seed_Data_2026.md — ${modules.length} canonical modules
// Do not edit manually — re-run \`tsx src/db/seed/generate.ts\` to regenerate
export const modules = [
${modules.map((m) => `  { code: "${m.code}", name: ${JSON.stringify(m.name)} },`).join("\n")}
] as const;
`;

  // Deduplicate programme_modules: unique by programmeCode+moduleCode (keep first year/semester)
  const seen = new Set<string>();
  const deduped: typeof programmeModules = [];
  for (const pm of programmeModules) {
    const key = `${pm.programmeCode}|${pm.moduleCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(pm);
    }
  }
  console.log(`[generate] deduped to ${deduped.length} unique programme_modules`);

  const pmTs = `// Auto-generated — ${deduped.length} programme_module links
// Each links a programme (by code) to a module (by code) with year/semester where extractable
export const programmeModules = [
${deduped
  .map(
    (pm) =>
      `  { programmeCode: "${pm.programmeCode}", moduleCode: "${pm.moduleCode}", yearLevel: ${pm.yearLevel ?? "null"}, semester: ${pm.semester ?? "null"} },`
  )
  .join("\n")}
] as const;
`;

  fs.writeFileSync(OUT_MODULES, modulesTs, "utf-8");
  fs.writeFileSync(OUT_PM, pmTs, "utf-8");
  console.log(`[generate] wrote ${OUT_MODULES}`);
  console.log(`[generate] wrote ${OUT_PM}`);

  // Print top 10 modules for verification
  console.log("[generate] sample modules:", modules.slice(0, 10).map((m) => `${m.code} — ${m.name}`).join(", "));
}

main();
