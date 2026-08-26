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

function getConnectionString(): string {
  let hyperdrivePresent = false;
  let hyperdriveConnStr: string | undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    hyperdrivePresent = !!ctx?.env?.HYPERDRIVE;
    hyperdriveConnStr = ctx?.env?.HYPERDRIVE?.connectionString as string | undefined;
  } catch (e) {
    console.error("[db] getCloudflareContext() threw:", e instanceof Error ? e.message : e);
  }

  // TEMP DIAGNOSTIC LOG — remove once you've confirmed Hyperdrive is wired up correctly.
  // Never logs the full connection string or credentials.
  console.log(
    "[db] hyperdrivePresent:", hyperdrivePresent,
    "| hasConnectionString:", !!hyperdriveConnStr,
    "| prefix:", hyperdriveConnStr ? hyperdriveConnStr.slice(0, 20) : "n/a",
    "| isWorkersRuntime:", isWorkersRuntime()
  );

  if (hyperdriveConnStr) {
    return hyperdriveConnStr;
  }

  if (isWorkersRuntime()) {
    // Critical: do NOT fall back to process.env.DATABASE_URL here. In the deployed Worker,
    // DATABASE_URL is not declared anywhere in wrangler.jsonc (no var, no secret) — if it's
    // somehow defined at runtime, it's coming from an unintended source (e.g. a dashboard
    // variable that got named or mapped incorrectly), not a real database credential.
    // A previous incident showed exactly this: an unrelated variable change broke live
    // search because a silent fallback picked up a placeholder value. Fail loudly instead.
    throw new Error(
      "[db] Running inside Workers runtime but env.HYPERDRIVE.connectionString is missing. " +
      "Refusing to fall back to DATABASE_URL. Check the HYPERDRIVE binding in wrangler.jsonc " +
      "and confirm it's attached to this deployed Worker version."
    );
  }

  // Genuine local Node.js dev (next dev) or scripts (drizzle-kit, migrate.ts) — DATABASE_URL is expected here.
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("[db] DATABASE_URL not set. Required for local development.");
  }
  return url;
}

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = getConnectionString();
  const isHyperdrive = connectionString.includes("hyperdrive") || connectionString.includes("501e0e");
  pool = new Pool({
    connectionString,
    ssl:
      isHyperdrive
        ? undefined // Hyperdrive handles SSL via its own proxy, don't override
        : process.env.NODE_ENV === "production" || connectionString.includes("sslmode=require")
          ? { rejectUnauthorized: false }
          : undefined,
    max: isHyperdrive ? 10 : 5, // Hyperdrive origin_connection_limit is 20, allow more concurrent for browse/search
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    statement_timeout: 10000,
    query_timeout: 10000,
  });
  pool.on("error", (err) => {
    console.error("[db] pool error", err.message);
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
