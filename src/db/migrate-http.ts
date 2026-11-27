// Runs Drizzle migrations over Neon's HTTPS SQL endpoint (for environments without direct Postgres/TCP access).
// Usage: DATABASE_URL=postgres://… npm run db:migrate:http
import "dotenv/config";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const db = drizzle(neon(url));
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  console.log(`[migrate:http] running from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("[migrate:http] done");
}

main().catch((e) => {
  console.error("[migrate:http] failed", e instanceof Error ? e.message : e);
  process.exit(1);
});
