import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Detects whether we're executing inside the Cloudflare Workers runtime
 * (as opposed to local `next dev` / a Node.js script like drizzle-kit or migrate.ts).
 * Workers exposes globals that a plain Node process does not.
 */
function isWorkersRuntime(): boolean {
  return (
    typeof (globalThis as any).WebSocketPair !== "undefined" ||
    typeof (globalThis as any).caches?.default !== "undefined"
  );
}

function getEnvVarFromCloudflare(name: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const val = ctx?.env?.[name];
    if (typeof val === "string" && val.length > 0) return val;
    // HYPERDRIVE is object, not string
    if (name === "HYPERDRIVE" && ctx?.env?.HYPERDRIVE) return "__present__";
  } catch {}
  return undefined;
}

function getConnectionString(): string {
  let hyperdrivePresent = false;
  let hyperdriveConnStr: string | undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    hyperdrivePresent = !!ctx?.env?.HYPERDRIVE;
    hyperdriveConnStr = ctx?.env?.HYPERDRIVE?.connectionString as string | undefined;
    // Also check if DATABASE_URL is available via Hyperdrive env for fallback debugging
    if (!hyperdriveConnStr && ctx?.env?.DATABASE_URL) {
      hyperdriveConnStr = undefined; // keep separate
    }
  } catch (e) {
    // getCloudflareContext not available outside Workers (e.g., next dev) — expected
    if (process.env.NODE_ENV !== "production") {
      // silent in dev; will fallback to DATABASE_URL
    } else {
      console.warn("[db] getCloudflareContext() unavailable:", e instanceof Error ? e.message : e);
    }
  }

  if (hyperdriveConnStr) {
    return hyperdriveConnStr;
  }

  // Prefer Hyperdrive env DATABASE_URL if present (wrangler secret), then process.env
  const cloudflareDatabaseUrl = getEnvVarFromCloudflare("DATABASE_URL");
  // Need to re-fetch DATABASE_URL string correctly
  let databaseUrl: string | undefined;
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env?.DATABASE_URL && typeof ctx.env.DATABASE_URL === "string") {
      databaseUrl = ctx.env.DATABASE_URL;
    }
  } catch {}
  if (!databaseUrl) databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    if (isWorkersRuntime() && hyperdrivePresent === false) {
      // In Workers but Hyperdrive missing — fallback is intentional for resilience.
      // This allows local `wrangler dev` with DATABASE_URL secret and production
      // fallback if Hyperdrive binding is misconfigured (graceful degradation vs crash).
      console.warn("[db] Workers runtime: HYPERDRIVE missing, falling back to DATABASE_URL (prefix:", databaseUrl.slice(0, 20), ")");
    }
    return databaseUrl;
  }

  // No connection string found anywhere
  if (isWorkersRuntime()) {
    throw new Error(
      "[db] No database connection available in Workers runtime. " +
      "HYPERDRIVE.connectionString is missing and DATABASE_URL is not set. " +
      "Check wrangler.jsonc hyperdrive binding and ensure DATABASE_URL secret is set via `wrangler secret put DATABASE_URL` or fix Hyperdrive ID."
    );
  }

  throw new Error("[db] DATABASE_URL not set. Required for local development. Set it in .env or .dev.vars");
}

function isHyperdriveConnectionString(cs: string): boolean {
  return cs.includes("hyperdrive") || cs.includes("hyperdrive.cloudflare.com") || cs.startsWith("postgres://hyperdrive");
}

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = getConnectionString();
  const isHyperdrive = isHyperdriveConnectionString(connectionString);
  // Determine SSL: Hyperdrive manages TLS; direct Neon requires ssl mode
  const needsSsl = !isHyperdrive && (process.env.NODE_ENV === "production" || connectionString.includes("sslmode=require") || connectionString.includes("neon.tech"));
  pool = new Pool({
    connectionString,
    ssl: isHyperdrive ? undefined : needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 5, // keep low for Hyperdrive (pooled) and Neon (serverless); 10 caused contention
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    // Never use statement_timeout via pool options — let Hyperdrive manage
  });
  pool.on("error", (err) => {
    console.error("[db] pool error", err.message);
    // Don't crash process; allow retry. Close pool on fatal error to allow fresh connection on next getDb()
    if ((err as any)?.code === "ECONNRESET" || (err as any)?.message?.includes("terminating")) {
      pool = null;
      dbInstance = null;
    }
  });
  return pool;
}

export function getDb() {
  if (dbInstance) return dbInstance;
  const p = getPool();
  dbInstance = drizzle(p, { schema });
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;

// For scripts that need to close pool
export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

export { schema };
