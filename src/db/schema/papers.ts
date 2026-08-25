import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { modules } from "./modules";

// Per Spec 2 allowed types only
export const assessmentTypeEnum = pgEnum("assessment_type", [
  "TEST",
  "EXAM",
  "SUPPLEMENTARY",
  "QUIZ",
  "ASSIGNMENT",
  "LAB",
  "TUTORIAL",
]);

export const paperStatusEnum = pgEnum("paper_status", ["active", "deleted", "pending"]);

// Academic identity per Spec 4 — ONE paper per module+year+semester+type+number
// Multiple files can point to same paper via paper_files (Spec 30)
export const papers = pgTable(
  "papers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "restrict" }),
    academicYear: integer("academic_year").notNull(), // 2024, 2025, 2026
    semester: integer("semester").notNull(), // 1 or 2 per Spec 5 — stored explicitly, not inferred
    assessmentType: assessmentTypeEnum("assessment_type").notNull(),
    // Per Spec 3: TEST+number, QUIZ+number etc., EXAM/SUPPLEMENTARY null
    assessmentNumber: integer("assessment_number"),
    status: paperStatusEnum("status").notNull().default("active"),
    views: integer("views").notNull().default(0),
    downloads: integer("downloads").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletionReason: varchar("deletion_reason", { length: 50 }), // '5_reports' per Spec 35
  },
  (t) => [
    index("idx_papers_module_id").on(t.moduleId),
    index("idx_papers_year").on(t.academicYear),
    index("idx_papers_status").on(t.status),
    index("idx_papers_module_year").on(t.moduleId, t.academicYear),
    // Partial unique: only active papers enforce uniqueness — deleted papers keep history (Spec 35)
    uniqueIndex("uq_paper_identity_active")
      .on(t.moduleId, t.academicYear, t.semester, t.assessmentType, t.assessmentNumber)
      .where(sql`status = 'active'`),
    check("chk_papers_semester", sql`semester IN (1,2)`),
    check("chk_papers_year", sql`academic_year BETWEEN 2000 AND 2035`),
    check(
      "chk_papers_assessment_number",
      sql`(
        (assessment_type IN ('EXAM','SUPPLEMENTARY') AND assessment_number IS NULL) OR
        (assessment_type NOT IN ('EXAM','SUPPLEMENTARY') AND (assessment_number IS NULL OR assessment_number BETWEEN 1 AND 20))
      )`
    ),
  ]
);
