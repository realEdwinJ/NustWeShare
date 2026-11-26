import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";

// Shared fixed-window counters. Workers isolates don't share memory, so limits must live in the DB.
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: varchar("key", { length: 160 }).primaryKey(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("idx_rate_limits_reset").on(t.resetAt)]
);
