import { pgTable, uuid, varchar, integer, boolean, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { departments } from "./departments";

export const programmeLevelEnum = pgEnum("programme_level", [
  "certificate",
  "diploma",
  "bachelor",
  "honours",
  "master",
  "doctorate",
  "other",
]);

export const programmes = pgTable(
  "programmes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 20 }).notNull(), // 07BOAI, 08BCEN etc. — not globally unique due to old/revised, but indexed
    name: varchar("name", { length: 300 }).notNull(), // Bachelor of Artificial Intelligence
    level: programmeLevelEnum("level").notNull(),
    nqfLevel: integer("nqf_level"), // 6,7,8,9,10
    nqfCredits: integer("nqf_credits"),
    nqfQualificationId: varchar("nqf_qualification_id", { length: 20 }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_programmes_department_id").on(t.departmentId),
    index("idx_programmes_code").on(t.code),
    index("idx_programmes_level").on(t.level),
  ]
);
