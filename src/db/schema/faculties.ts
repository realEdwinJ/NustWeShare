import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const faculties = pgTable(
  "faculties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 20 }).notNull().unique(), // FEBE, FCI
    name: varchar("name", { length: 200 }).notNull(), // Faculty of Engineering and the Built Environment
    slug: varchar("slug", { length: 50 }).notNull().unique(), // febe, fci
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_faculties_slug").on(t.slug)]
);
