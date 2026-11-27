import { describe, it, expect } from "vitest";
import { modules } from "@/db/seed/data/modules";
import { MODULE_NAME_FIXES, looksMalformed } from "@/db/seed/data/module_name_fixes";

describe("module catalogue", () => {
  it("has no garbled names after fixes", () => {
    const bad = modules.map((m) => ({ ...m, name: MODULE_NAME_FIXES[m.code] ?? m.name })).filter((m) => looksMalformed(m.name));
    expect(bad).toEqual([]);
  });
  it("every fix targets a real module", () => {
    const codes = new Set<string>(modules.map((m) => m.code));
    expect(Object.keys(MODULE_NAME_FIXES).filter((c) => !codes.has(c))).toEqual([]);
  });
});
