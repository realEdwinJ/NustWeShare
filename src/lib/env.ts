import { z } from "zod";

const envSchema = z.object({
  // DATABASE_URL is required for local dev and drizzle-kit migrations;
  // in production Workers, HYPERDRIVE binding provides connectionString and DATABASE_URL may be absent
  DATABASE_URL: z.string().optional(),
  APP_SECRET: z.string().min(16, "APP_SECRET must be at least 16 chars"),
  ADMIN_SECRET: z.string().min(16).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function getEnvSource(): Record<string, unknown> {
  // Merge Cloudflare Workers env (via getCloudflareContext) + process.env for resilience
  const src: Record<string, unknown> = { ...process.env };
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env) {
      for (const [k, v] of Object.entries(ctx.env)) {
        if (typeof v === "string" && v.length > 0) src[k] = v;
        // Don't copy objects like HYPERDRIVE/PAPERS_BUCKET
      }
      // Ensure HYPERDRIVE presence doesn't trigger DATABASE_URL requirement
      if (ctx.env.HYPERDRIVE?.connectionString) src["DATABASE_URL"] = src["DATABASE_URL"] || "hyperdrive-present";
    }
  } catch {}
  return src;
}

export function getEnv(): Env {
  if (cached) return cached;
  const source = getEnvSource();
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }
  cached = parsed.data;
  return cached;
}

// For build-time validation without throwing in client bundles
export function validateEnv() {
  try {
    getEnv();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
