import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getConnectionString(): string {
  // Production Workers: try Hyperdrive binding first (env.HYPERDRIVE.connectionString)
  try {
    // @ts-ignore — optional, only in Cloudflare Workers via OpenNext
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const hyper = ctx?.env?.HYPERDRIVE?.connectionString as string | undefined;
    if (hyper) return hyper;
  } catch {}
  // Local dev / fallback: raw DATABASE_URL (also used by drizzle-kit)
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL/HYPERDRIVE not set. Check .env or Hyperdrive binding");
  return url;
}

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = getConnectionString();
  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production" || connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    max: 5, // Workers free tier — keep low per Spec 47,78
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
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
