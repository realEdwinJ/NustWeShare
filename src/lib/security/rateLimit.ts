// Two limiters: rateLimit() is a cheap per-isolate memory limiter (used for search); rateLimitShared() is the
// Postgres-backed limiter used for everything abuse-sensitive (works across Workers isolates).
type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

export interface RateLimitOpts {
  key: string;
  limit: number;
  windowMs: number;
}

export function rateLimit({ key, limit, windowMs }: RateLimitOpts): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Cleanup every 5 min to prevent memory leak in long-lived dev server
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) if (now > v.resetAt) store.delete(k);
  }, 5 * 60 * 1000).unref?.();
}

export const limits = {
  upload: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10/hour per IP (Spec 52)
  search: { limit: 60, windowMs: 60 * 1000 },
  report: { limit: 5, windowMs: 60 * 1000 },
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
} as const;

/**
 * Shared rate limit backed by Postgres (works across Workers isolates/regions).
 * Atomic fixed window via upsert. Fails open (allows) if the DB is unreachable so outages don't lock everyone out.
 */
export async function rateLimitShared({ key, limit, windowMs }: RateLimitOpts): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    const { getDb } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    const secs = Math.max(1, Math.round(windowMs / 1000));
    const res = await db.execute(sql`
      INSERT INTO rate_limits (key, count, reset_at) VALUES (${key.slice(0, 160)}, 1, now() + make_interval(secs => ${secs}))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= now() THEN excluded.reset_at ELSE rate_limits.reset_at END
      RETURNING count, reset_at`);
    const row = (res.rows as any[])[0];
    const count = Number(row?.count ?? 1);
    const resetAt = new Date(row?.reset_at ?? Date.now() + windowMs).getTime();
    if (Math.random() < 0.01) db.execute(sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 hour'`).catch(() => {});
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt };
  } catch (e) {
    console.warn("[rateLimit] shared limiter unavailable, falling back to memory", e instanceof Error ? e.message : e);
    return rateLimit({ key, limit, windowMs });
  }
}
