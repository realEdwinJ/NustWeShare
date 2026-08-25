import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Check .env");
  }
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
