import { pgTable, uuid, varchar, integer, boolean, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { papers } from "./papers";
import { users } from "./users";

// File identity per Spec 59 — ONE paper can have many files (different scans)
// Canonical per Spec 31
export const paperFiles = pgTable(
  "paper_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paperId: uuid("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "restrict" }),
    r2ObjectKey: varchar("r2_object_key", { length: 500 }).notNull().unique(),
    originalFilename: varchar("original_filename", { length: 300 }).notNull(),
    fileSize: integer("file_size").notNull(), // bytes, <= 3_145_728 per Spec 15
    mimeType: varchar("mime_type", { length: 50 }).notNull().default("application/pdf"),
    sha256: varchar("sha256", { length: 64 }).notNull().unique(), // hex 64 chars per Spec 26
    pageCount: integer("page_count"),
    textFingerprint: varchar("text_fingerprint", { length: 64 }), // normalized text SHA per Spec 28
    perceptualHash: varchar("perceptual_hash", { length: 64 }), // pHash per Spec 29
    isCanonical: boolean("is_canonical").notNull().default(true),
    uploaderId: uuid("uploader_id").references(() => users.id, { onDelete: "set null" }), // null = ghost (Spec 24)
    uploadIpHash: varchar("upload_ip_hash", { length: 64 }), // for dedup/limit, hashed per Spec 52
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_pf_paper_id").on(t.paperId),
    index("idx_pf_sha256").on(t.sha256),
    index("idx_pf_text_fp").on(t.textFingerprint),
    index("idx_pf_uploader").on(t.uploaderId),
    index("idx_pf_canonical").on(t.isCanonical),
    check("chk_pf_file_size", sql`file_size > 0 AND file_size <= 3145728`),
    check("chk_pf_mime", sql`mime_type = 'application/pdf'`),
  ]
);
