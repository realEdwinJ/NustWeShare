import { createHash } from "crypto";

export function sha256(buffer: Buffer | Uint8Array): string {
  return createHash("sha256").update(buffer as Buffer).digest("hex");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
