import { pgTable, uuid, integer, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { modules } from "./modules";
import { users } from "./users";
import { papers, assessmentTypeEnum } from "./papers";

// Students ask for papers that are missing; others upvote and fulfil them.
export const paperRequests = pgTable(
  "paper_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    academicYear: integer("academic_year"),
    assessmentType: assessmentTypeEnum("assessment_type"),
    note: varchar("note", { length: 200 }),
    requesterId: uuid("requester_id").references(() => users.id, { onDelete: "set null" }),
    requesterIpHash: varchar("requester_ip_hash", { length: 64 }),
    votes: integer("votes").notNull().default(1),
    fulfilledPaperId: uuid("fulfilled_paper_id").references(() => papers.id, { onDelete: "set null" }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_requests_module").on(t.moduleId), index("idx_requests_votes").on(t.votes)]
);

export const paperRequestVotes = pgTable(
  "paper_request_votes",
  {
    requestId: uuid("request_id")
      .notNull()
      .references(() => paperRequests.id, { onDelete: "cascade" }),
    voterHash: varchar("voter_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_request_vote").on(t.requestId, t.voterHash)]
);
