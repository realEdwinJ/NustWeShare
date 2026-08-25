import { getDb, closeDb } from "../src/lib/db.ts";
import { modules } from "../src/db/schema/modules.ts";
import { sql } from "drizzle-orm";

const db = getDb();
const q = "MCI";
const like = `%${q}%`;
const rows = await db.select().from(modules).where(sql`${modules.code} ILIKE ${like} OR ${modules.name} ILIKE ${like}`).limit(5);
console.log(rows.map(r => `${r.code}:${r.name}`).join("\n"));
await closeDb();
