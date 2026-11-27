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

function sanitizeConnectionString(cs: string): string {
  // Neon pooler URL with channel_binding=require causes pg 8.x to intermittently fail on SCRAM auth (channel binding not supported in Node pg).
  // Strip channel_binding for Node/Hyperdrive - Hyperdrive handles it internally.
  try {
    const url = new URL(cs);
    if (url.searchParams.has("channel_binding")) {
      url.searchParams.delete("channel_binding");
      return url.toString();
    }
  } catch {}
  // Fallback string replace
  return cs.replace(/[?&]channel_binding=require/, "").replace(/channel_binding=require&?/, "");
}

function getConnectionString(): string {
  let hyperdrivePresent = false;
  let hyperdriveConnStr: string | undefined;

  let hyperdriveId: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    hyperdrivePresent = !!ctx?.env?.HYPERDRIVE;
    hyperdriveConnStr = ctx?.env?.HYPERDRIVE?.connectionString as string | undefined;
    hyperdriveId = (ctx?.env?.HYPERDRIVE as any)?.id as string | undefined;
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

  // If Hyperdrive placeholder ID is still the default fake one, ignore it and force DATABASE_URL fallback
  // This prevents "database not connected" on first click when Hyperdrive not properly configured in Cloudflare dashboard
  const isPlaceholderHyperdrive = hyperdriveId === "507d02782751464e9d9b46bcd732f2ea";
  if (hyperdriveConnStr && !isPlaceholderHyperdrive) {
    return sanitizeConnectionString(hyperdriveConnStr);
  }
  if (hyperdriveConnStr && isPlaceholderHyperdrive) {
    console.warn("[db] Hyperdrive ID is placeholder, falling back to DATABASE_URL");
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
    return sanitizeConnectionString(databaseUrl);
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

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

function createPool(): Pool {
  const connectionString = getConnectionString();
  const isHyperdrive = isHyperdriveConnectionString(connectionString);
  // Hyperdrive manages TLS; direct Neon/remote Postgres requires SSL
  const needsSsl = !isHyperdrive && (connectionString.includes("sslmode=require") || connectionString.includes("neon.tech"));
  const workers = isWorkersRuntime();
  const p = new Pool({
    connectionString,
    ssl: isHyperdrive ? undefined : needsSsl ? { rejectUnauthorized: false } : undefined,
    // In Workers each request gets its own small pool (Hyperdrive does the real pooling)
    max: workers ? 5 : 10,
    idleTimeoutMillis: workers ? 5000 : 30000,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle: true,
  });
  p.on("error", (err) => console.error("[db] pool error", err.message));
  return p;
}

/**
 * In Cloudflare Workers, sockets belong to the request that opened them: reusing a pool across requests
 * makes later requests hang ("Worker's code had hung"). So we scope the pool to the request's
 * ExecutionContext. Outside Workers (next dev, scripts) a single process-wide pool is used.
 */
const perRequest = new WeakMap<object, { pool: Pool; db: DrizzleDb }>();

function requestScope(): object | null {
  if (!isWorkersRuntime()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    return (ctx?.ctx as object) ?? null;
  } catch {
    return null;
  }
}

export function getDb(): DrizzleDb {
  const scope = requestScope();
  if (scope) {
    let entry = perRequest.get(scope);
    if (!entry) {
      const p = createPool();
      entry = { pool: p, db: drizzle(p, { schema }) };
      perRequest.set(scope, entry);
    }
    return entry.db;
  }
  if (dbInstance) return dbInstance;
  pool = createPool();
  dbInstance = drizzle(pool, { schema });
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
