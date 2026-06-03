// Tiny in-memory rate limiter. Single-instance only — replace with Redis/Upstash for production.
// State resets on process restart; acceptable for first-pass deploys.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastGc = 0;

function gc(now: number) {
  if (now - lastGc < 60_000) return;
  lastGc = now;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number };

/**
 * Check if `key` is within its limit. Increments on each call (even when allowed).
 * @param key       caller-defined; include route + identifier
 * @param max       max requests per window
 * @param windowMs  window size in ms
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  if (process.env.RATE_LIMIT_DISABLED === "true") return { allowed: true };
  const now = Date.now();
  gc(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (existing.count >= max) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }
  existing.count += 1;
  return { allowed: true };
}
