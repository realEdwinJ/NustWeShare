import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/browse`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/upload`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/leaderboard`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/help`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/copyright`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
  try {
    const { getDb } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    // Modules with papers first (most useful to searchers), then papers themselves
    const mods = await db.execute(sql`
      SELECT m.code, max(p.updated_at) AS updated FROM modules m
      JOIN papers p ON p.module_id = m.id AND p.status = 'active'
      GROUP BY m.code ORDER BY updated DESC LIMIT 5000`);
    for (const m of mods.rows as any[]) urls.push({ url: `${base}/modules/${String(m.code).toLowerCase()}`, lastModified: new Date(m.updated), changeFrequency: "weekly", priority: 0.8 });
    const papers = await db.execute(sql`SELECT id, updated_at FROM papers WHERE status = 'active' ORDER BY updated_at DESC LIMIT 20000`);
    for (const p of papers.rows as any[]) urls.push({ url: `${base}/papers/${p.id}`, lastModified: new Date(p.updated_at), changeFrequency: "monthly", priority: 0.6 });
    const faculties = await db.execute(sql`SELECT slug FROM faculties`);
    for (const f of faculties.rows as any[]) urls.push({ url: `${base}/browse/${f.slug}`, changeFrequency: "weekly", priority: 0.7 });
  } catch {
    // DB unavailable — static URLs only
  }
  return urls;
}
