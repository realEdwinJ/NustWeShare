import { pgTable, uuid, varchar, integer, text, boolean, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export type UserPreferences = {
  theme?: "system" | "light" | "dark";
  viewerZoom?: "fit-width" | "fit-page" | "100";
  viewerMode?: "scroll" | "single";
  downloadNaming?: "clean" | "original";
  zipGrouping?: "flat" | "by-year";
  reduceMotion?: boolean;
  openPdfInNewTab?: boolean;
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Spec 20 case-insensitive uniqueness — store normalized lowercase
    username: varchar("username", { length: 50 }).notNull(),
    normalizedUsername: varchar("normalized_username", { length: 50 }).notNull().unique(),
    displayName: varchar("display_name", { length: 80 }).notNull(),
    pinHash: varchar("pin_hash", { length: 200 }).notNull(), // bcrypt, never plaintext per Spec 19
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    // Profile
    bio: varchar("bio", { length: 280 }),
    avatarColor: varchar("avatar_color", { length: 20 }).notNull().default("indigo"),
    avatarEmoji: varchar("avatar_emoji", { length: 16 }),
    programmeId: uuid("programme_id"),
    studyYear: integer("study_year"),
    // Privacy
    publicProfile: boolean("public_profile").notNull().default(true),
    showOnLeaderboard: boolean("show_on_leaderboard").notNull().default(true),
    uploadAnonymously: boolean("upload_anonymously").notNull().default(false),
    // Preferences (theme, viewer, downloads)
    preferences: jsonb("preferences").$type<UserPreferences>().notNull().default({}),
    // Security
    role: varchar("role", { length: 20 }).notNull().default("user"), // user | admin
    sessionVersion: integer("session_version").notNull().default(0), // bump → logs out everywhere
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    pinChangedAt: timestamp("pin_changed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_users_normalized").on(t.normalizedUsername),
    index("idx_users_username").on(t.username),
  ]
);
