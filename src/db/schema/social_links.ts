import { pgTable, uuid, varchar, boolean, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const platformEnum = pgEnum("platform", ["instagram", "tiktok", "x"]);

export const socialLinks = pgTable(
  "social_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    handle: varchar("handle", { length: 80 }).notNull(),
    displayPublicly: boolean("display_publicly").notNull().default(false), // per Spec 21
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_social_user_id").on(t.userId), index("idx_social_platform").on(t.platform)]
);
