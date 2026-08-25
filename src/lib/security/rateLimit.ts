// In-memory rate limiter for Workers local dev; production can swap to KV/D1 via same interface (Spec 94)
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
