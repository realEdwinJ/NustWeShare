import { pgTable, uuid, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { papers } from "./papers";
import { modules } from "./modules";

// Saved papers and followed modules for signed-in users. Exactly one of paperId/moduleId is set.
export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paperId: uuid("paper_id").references(() => papers.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id").references(() => modules.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_bookmarks_user").on(t.userId),
    uniqueIndex("uq_bookmarks_user_paper").on(t.userId, t.paperId).where(sql`paper_id IS NOT NULL`),
    uniqueIndex("uq_bookmarks_user_module").on(t.userId, t.moduleId).where(sql`module_id IS NOT NULL`),
    check("chk_bookmarks_target", sql`(paper_id IS NOT NULL) <> (module_id IS NOT NULL)`),
  ]
);
