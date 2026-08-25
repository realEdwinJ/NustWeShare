import { pgTable, uuid, varchar, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { departments } from "./departments";

// Canonical module per Spec 7 — ONE row per code even if used across programmes
export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 20 }).notNull().unique(), // ELC511S, MCI511S — unique canonical (Spec 7)
    name: varchar("name", { length: 300 }).notNull(), // Electronic Devices
    description: text("description"),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // trigram GIN index will be added via migration SQL (pg_trgm) for partial search Spec 37
    index("idx_modules_code").on(t.code),
    index("idx_modules_name").on(t.name),
  ]
);
