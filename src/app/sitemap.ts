import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const urls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/browse`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/febe`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/fci`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/upload`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/copyright`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Add modules (limit to 100 for sitemap size, paginated in real)
  try {
    const { getDb } = await import("@/lib/db");
    const { modules } = await import("@/db/schema/modules");
    const db = getDb();
    const mods = await db.select({ code: modules.code }).from(modules).limit(500);
    for (const m of mods) {
      urls.push({ url: `${base}/modules/${m.code.toLowerCase()}`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 });
    }
  } catch {
    // DB not available at build
  }

  return urls;
}
