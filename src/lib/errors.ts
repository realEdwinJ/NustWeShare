import { z } from "zod";

// Human-friendly error types per Spec 62 — never expose stack or FK violation details
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: { code: error.code, message: error.message, details: error.details },
      status: error.status,
    };
  }
  if (error instanceof z.ZodError) {
    return {
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check your input and try again.",
        details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      status: 400,
    };
  }
  // Unknown — never leak internals (Spec 62)
  return {
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
    status: 500,
  };
}

// Specific helpers per Spec 62 examples
export const Errors = {
  moduleNotFound: () =>
    new AppError(
      "We couldn't find that module. Please select a valid NUST module.",
      "MODULE_NOT_FOUND",
      404
    ),
  fileTooLarge: () =>
    new AppError("This PDF is larger than the 3 MB limit.", "FILE_TOO_LARGE", 413),
  invalidPdf: () =>
    new AppError("That file doesn't look like a valid PDF. Please check and try again.", "INVALID_PDF", 400),
  tooManyReports: () =>
    new AppError("You've already reported this paper.", "ALREADY_REPORTED", 409),
  rateLimited: (retryAfter?: string) =>
    new AppError(
      `Too many requests. Please try again ${retryAfter ?? "shortly"}.`,
      "RATE_LIMITED",
      429
    ),
  unauthorized: () => new AppError("You need to be logged in to do that.", "UNAUTHORIZED", 401),
  forbidden: () => new AppError("You don't have permission to do that.", "FORBIDDEN", 403),
  notFound: (msg = "Not found.") => new AppError(msg, "NOT_FOUND", 404),
  paperDeleted: () => new AppError("This paper is no longer available.", "PAPER_DELETED", 410),
  pinLocked: (minutes: number) =>
    new AppError(
      `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      "PIN_LOCKED",
      429
    ),
  usernameTaken: () =>
    new AppError("That username is already taken. Please choose another.", "USERNAME_TAKEN", 409),
};
