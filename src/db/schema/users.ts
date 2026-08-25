import { pgTable, uuid, varchar, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Spec 20 case-insensitive uniqueness — store normalized lowercase
    username: varchar("username", { length: 50 }).notNull(),
    normalizedUsername: varchar("normalized_username", { length: 50 }).notNull().unique(),
    displayName: varchar("display_name", { length: 80 }).notNull(),
    pinHash: varchar("pin_hash", { length: 200 }).notNull(), // argon2/bcrypt, never plaintext per Spec 19
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_users_normalized").on(t.normalizedUsername),
    index("idx_users_username").on(t.username),
  ]
);
