import { eq, and, sql, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { papers } from "@/db/schema/papers";
import type { InferSelectModel } from "drizzle-orm";

export type PaperIdentity = {
  moduleId: string;
  academicYear: number;
  semester: number;
  assessmentType: "TEST" | "EXAM" | "SUPPLEMENTARY" | "QUIZ" | "ASSIGNMENT" | "LAB" | "TUTORIAL";
  assessmentNumber: number | null;
};

// Find existing active paper by identity, or create new one
export async function findOrCreatePaper(identity: PaperIdentity): Promise<{ id: string; created: boolean }> {
  const db = getDb();
  // Handle null for assessmentNumber in unique index — need isNull check
  const existing = await db
    .select()
    .from(papers)
    .where(
      and(
        eq(papers.moduleId, identity.moduleId),
        eq(papers.academicYear, identity.academicYear),
        eq(papers.semester, identity.semester),
        eq(papers.assessmentType, identity.assessmentType as any),
        identity.assessmentNumber === null ? isNull(papers.assessmentNumber) : eq(papers.assessmentNumber, identity.assessmentNumber),
        eq(papers.status, "active")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { id: existing[0].id, created: false };
  }

  const inserted = await db
    .insert(papers)
    .values({
      moduleId: identity.moduleId,
      academicYear: identity.academicYear,
      semester: identity.semester,
      assessmentType: identity.assessmentType as any,
      assessmentNumber: identity.assessmentNumber,
      status: "active",
      views: 0,
      downloads: 0,
    })
    .returning({ id: papers.id });

  return { id: inserted[0].id, created: true };
}

export async function getPaperById(id: string): Promise<InferSelectModel<typeof papers> | null> {
  const db = getDb();
  const rows = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
  return rows[0] ?? null;
}
