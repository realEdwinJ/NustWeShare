import { sanitizeR2Key } from "@/lib/security/sanitize";

// Deterministic organized keys per Spec 48 — DB is source of truth, path is convenience only
export function buildR2Key(opts: {
  facultySlug: string;
  moduleCode: string;
  academicYear?: number | null;
  paperId: string;
  fileId: string;
}): string {
  const { facultySlug, moduleCode, academicYear, paperId, fileId } = opts;
  const yearSeg = academicYear ? String(academicYear) : "unknown";
  const raw = `papers/${facultySlug}/${moduleCode.toLowerCase()}/${yearSeg}/${paperId}/${fileId}.pdf`;
  return sanitizeR2Key(raw);
}

// Clean download filename per Spec 88
export function buildDownloadFilename(opts: {
  moduleCode: string;
  academicYear?: number | null;
  assessmentType?: string | null;
  assessmentNumber?: number | null;
}): string {
  const { moduleCode, academicYear, assessmentType, assessmentNumber } = opts;
  const type = assessmentType ? assessmentType.charAt(0) + assessmentType.slice(1).toLowerCase() : "Paper";
  const num = assessmentNumber ? `_${assessmentNumber}` : "";
  const year = academicYear ? `_${academicYear}` : "";
  const typeSeg = assessmentType === "EXAM" || assessmentType === "SUPPLEMENTARY" ? `_${type}` : `_${type}${num}`;
  return `${moduleCode.toUpperCase()}${year}${typeSeg}.pdf`;
}
