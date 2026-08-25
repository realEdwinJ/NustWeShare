import { pgTable, uuid, integer, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { programmes } from "./programmes";
import { modules } from "./modules";
import { curricula } from "./curricula";

export const programmeModules = pgTable(
  "programme_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programmeId: uuid("programme_id")
      .notNull()
      .references(() => programmes.id, { onDelete: "restrict" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "restrict" }),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "restrict" }),
    yearLevel: integer("year_level"), // nullable for postgraduate per Spec 8
    semester: integer("semester"), // 1 or 2, future-proof per Spec 5
    isCore: boolean("is_core").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_programme_module_curriculum").on(t.programmeId, t.moduleId, t.curriculumId),
    index("idx_pm_programme_id").on(t.programmeId),
    index("idx_pm_module_id").on(t.moduleId),
    index("idx_pm_curriculum_id").on(t.curriculumId),
    index("idx_pm_year_level").on(t.yearLevel),
  ]
);
