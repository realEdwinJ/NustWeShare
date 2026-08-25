import { Errors, AppError } from "@/lib/errors";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB per Spec 15

export function validatePdfFile(file: { size: number; type: string; name: string; buffer?: Buffer | Uint8Array }) {
  if (file.size > MAX_BYTES) {
    throw Errors.fileTooLarge();
  }
  if (file.size === 0) {
    throw new AppError("That file appears to be empty.", "EMPTY_FILE", 400);
  }
  // Extension check
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw Errors.invalidPdf();
  }
  // MIME check (allow application/pdf and octet-stream from some browsers, but verify later via magic bytes)
  if (file.type && file.type !== "application/pdf" && file.type !== "application/octet-stream") {
    throw Errors.invalidPdf();
  }
}

// Server-side magic bytes + header check — never trust client (Spec 15)
export function validatePdfMagic(buffer: Buffer | Uint8Array) {
  if (!buffer || buffer.length < 4) throw Errors.invalidPdf();
  const header = Buffer.from(buffer.slice(0, 5)).toString("ascii");
  if (!header.startsWith("%PDF")) {
    throw Errors.invalidPdf();
  }
  // Additional corruption check via pdfjs can be done later; header is minimum
}
