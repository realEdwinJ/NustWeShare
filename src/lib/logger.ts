type LogLevel = "debug" | "info" | "warn" | "error";

// Lightweight logger per Spec 77 — no PINs, no secrets, no PII
const SENSITIVE_KEYS = new Set([
  "pin",
  "pin_hash",
  "password",
  "secret",
  "token",
  "access_key",
  "secret_key",
  "authorization",
]);

function sanitize(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const record = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) out[k] = "[REDACTED]";
    else if (typeof v === "object" && v !== null) out[k] = sanitize(v);
    else out[k] = v;
  }
  return out;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta: sanitize(meta) } : {}),
  };
  // In production on Workers, this goes to Cloudflare logs
  // Keep it JSON for easy parsing
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "debug" && process.env.NODE_ENV !== "production") console.debug(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
  // Domain helpers per Spec 77
  uploadError: (meta: Record<string, unknown>) => log("error", "upload_error", meta),
  processingFailure: (meta: Record<string, unknown>) => log("error", "processing_failure", meta),
  dbError: (meta: Record<string, unknown>) => log("error", "db_error", meta),
  r2Error: (meta: Record<string, unknown>) => log("error", "r2_error", meta),
  authFailure: (meta: Record<string, unknown>) => log("warn", "auth_failure", meta),
  reportActivity: (meta: Record<string, unknown>) => log("info", "report_activity", meta),
  apiError: (meta: Record<string, unknown>) => log("error", "api_error", meta),
};
