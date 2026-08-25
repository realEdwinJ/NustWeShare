import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_departments_school_id").on(t.schoolId), index("idx_departments_slug").on(t.slug)]
);
