import { z } from "zod";

// Assessment types per Spec 2
export const assessmentTypeSchema = z.enum([
  "TEST",
  "EXAM",
  "SUPPLEMENTARY",
  "QUIZ",
  "ASSIGNMENT",
  "LAB",
  "TUTORIAL",
]);

export const paperCreateSchema = z.object({
  moduleId: z.string().uuid(),
  academicYear: z.number().int().min(2000).max(2035).nullable().optional(),
  semester: z.number().int().min(1).max(2).nullable().optional(),
  assessmentType: assessmentTypeSchema.nullable().optional(),
  assessmentNumber: z.number().int().min(1).max(20).nullable().optional(),
}).superRefine((data, ctx) => {
  if (
    data.assessmentType &&
    ["EXAM", "SUPPLEMENTARY"].includes(data.assessmentType) &&
    data.assessmentNumber != null
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Exam and Supplementary should not have a number (Spec 3).",
      path: ["assessmentNumber"],
    });
  }
});

export const reportSchema = z.object({
  reason: z.enum([
    "duplicate",
    "wrong_module",
    "wrong_year",
    "wrong_assessment_type",
    "corrupted",
    "not_paper",
    "other",
  ]),
  details: z.string().max(500).optional(),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscore"),
  displayName: z.string().min(1).max(50),
  pin: z.string().regex(/^\d{5}$/, "PIN must be exactly 5 digits"),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  pin: z.string().regex(/^\d{5}$/),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(100),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});
