import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { faculties } from "./faculties";

export const schools = pgTable(
  "schools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facultyId: uuid("faculty_id")
      .notNull()
      .references(() => faculties.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 200 }).notNull(),
    // code is optional for schools — some have no short code
    code: varchar("code", { length: 20 }),
    slug: varchar("slug", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_schools_faculty_id").on(t.facultyId), index("idx_schools_slug").on(t.slug)]
);
