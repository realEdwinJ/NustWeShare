import { pgTable, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

// Small key/value store for operational state (e.g. last storage integrity scan).
export const systemState = pgTable("system_state", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
