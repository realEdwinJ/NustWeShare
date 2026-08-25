import { describe, it, expect } from "vitest";
import { paperCreateSchema } from "@/lib/validation/schemas";

describe("assessment numbering — Spec 3", () => {
  it("allows TEST with number", () => {
    expect(() => paperCreateSchema.parse({ moduleId: "00000000-0000-0000-0000-000000000000", assessmentType: "TEST", assessmentNumber: 1 })).not.toThrow();
  });

  it("rejects EXAM with number", () => {
    expect(() => paperCreateSchema.parse({ moduleId: "00000000-0000-0000-0000-000000000000", assessmentType: "EXAM", assessmentNumber: 1 })).toThrow();
  });

  it("allows EXAM without number", () => {
    expect(() => paperCreateSchema.parse({ moduleId: "00000000-0000-0000-0000-000000000000", assessmentType: "EXAM", assessmentNumber: null })).not.toThrow();
  });

  it("allows SUPPLEMENTARY without number", () => {
    expect(() => paperCreateSchema.parse({ moduleId: "00000000-0000-0000-0000-000000000000", assessmentType: "SUPPLEMENTARY", assessmentNumber: null })).not.toThrow();
  });

  it("rejects SUPPLEMENTARY with number", () => {
    expect(() => paperCreateSchema.parse({ moduleId: "00000000-0000-0000-0000-000000000000", assessmentType: "SUPPLEMENTARY", assessmentNumber: 1 })).toThrow();
  });

  it("allows QUIZ with number", () => {
    expect(() => paperCreateSchema.parse({ moduleId: "00000000-0000-0000-0000-000000000000", assessmentType: "QUIZ", assessmentNumber: 2 })).not.toThrow();
  });
});
