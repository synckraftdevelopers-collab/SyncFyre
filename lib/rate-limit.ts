export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Applies an in-memory fixed-window rate limit.
 *
 * This is appropriate for a single process or local development. Deployments
 * that run multiple instances should back this with shared storage (for
 * example, Redis) to enforce a global limit.
 */
export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  if (!key) throw new Error("A rate-limit key is required.");
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Rate-limit limit must be a positive integer.");
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error("Rate-limit windowMs must be greater than zero.");

  const now = Date.now();
  pruneExpiredBuckets(now);

  const current = buckets.get(key);
  const bucket = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  buckets.set(key, bucket);

  const allowed = bucket.count <= limit;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    allowed,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

/** Clears all local buckets. Intended for deterministic tests. */
export function resetRateLimitStore() {
  buckets.clear();
}
