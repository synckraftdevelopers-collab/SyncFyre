import { NextResponse } from "next/server";

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

function applyRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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

/**
 * Fixed-window rate limit check. `key` should already include the route name
 * so different endpoints don't share a bucket for the same client.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  return applyRateLimit(key, limit, windowMs);
}

/**
 * Applies an in-memory fixed-window rate limit.
 *
 * This is appropriate for a single process or local development. Deployments
 * that run multiple instances should back this with shared storage (for
 * example, Redis) to enforce a global limit.
 */
export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  return applyRateLimit(key, limit, windowMs);
}

/** Best-effort client identifier for unauthenticated machine/cron traffic. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

export function rateLimitExceededResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}

/** Clears all local buckets. Intended for deterministic tests. */
export function resetRateLimitStore() {
  buckets.clear();
}
