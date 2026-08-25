import { pgTable, uuid, varchar, integer, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { programmes } from "./programmes";

export const curriculumStatusEnum = pgEnum("curriculum_status", [
  "active",
  "phase_in",
  "phasing_out",
  "archived",
]);

export const curricula = pgTable(
  "curricula",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programmeId: uuid("programme_id")
      .notNull()
      .references(() => programmes.id, { onDelete: "restrict" }),
    label: varchar("label", { length: 200 }).notNull(), // 2026 Revised, Phase-in 2026, Old Phasing-out
    codeVersion: varchar("code_version", { length: 30 }), // optional suffix to disambiguate
    status: curriculumStatusEnum("status").notNull().default("active"),
    yearIntroduced: integer("year_introduced"), // 2026, 2024 etc.
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_curricula_programme_id").on(t.programmeId),
    index("idx_curricula_status").on(t.status),
  ]
);
