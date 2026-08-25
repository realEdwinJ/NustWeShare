import { pgTable, uuid, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

// Updated via service layer or trigger after paper approval; simple table for leaderboard speed
export const contributionStats = pgTable(
  "contribution_stats",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    approvedCount: integer("approved_count").notNull().default(0),
    pendingCount: integer("pending_count").notNull().default(0),
    rejectedCount: integer("rejected_count").notNull().default(0),
    lastContributionAt: timestamp("last_contribution_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_stats_approved").on(t.approvedCount)]
);
