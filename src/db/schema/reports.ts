import { pgTable, uuid, varchar, text, timestamp, index, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { papers } from "./papers";
import { users } from "./users";

export const reportReasonEnum = pgEnum("report_reason", [
  "duplicate",
  "wrong_module",
  "wrong_year",
  "wrong_assessment_type",
  "corrupted",
  "not_paper",
  "other",
]);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paperId: uuid("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    reason: reportReasonEnum("reason").notNull(),
    details: text("details"),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }), // null for ghost reporters
    reporterIpHash: varchar("reporter_ip_hash", { length: 64 }), // hashed IP for anon + dedup per Spec 34,36
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_reports_paper_id").on(t.paperId),
    index("idx_reports_reason").on(t.reason),
    // One report per person per paper — prevents one person generating 5 reports (Spec 34)
    uniqueIndex("uq_reports_paper_reporter").on(t.paperId, t.reporterId).where(sql`reporter_id IS NOT NULL`),
    uniqueIndex("uq_reports_paper_ip").on(t.paperId, t.reporterIpHash).where(sql`reporter_ip_hash IS NOT NULL`),
  ]
);
