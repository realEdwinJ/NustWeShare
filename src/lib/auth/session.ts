import { createHmac, randomBytes } from "crypto";

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

// Simple signed token: userId.timestamp.signature (httpOnly cookie)
export function createSessionToken(userId: string, secret: string): string {
  const payload = `${userId}.${Date.now()}.${randomBytes(8).toString("hex")}`;
  const sig = sign(payload, secret);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifySessionToken(token: string, secret: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const lastDot = decoded.lastIndexOf(".");
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    if (sign(payload, secret) !== sig) return null;
    const [userId] = payload.split(".");
    return userId;
  } catch {
    return null;
  }
}
