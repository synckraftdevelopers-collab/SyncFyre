import { NextResponse } from "next/server";

/**
 * dev-task-split.md Phase 1 (#10): rate limiting for machine/cron endpoints.
 *
 * Best-effort, in-memory, fixed-window limiter scoped to a single serverless
 * instance. It stops a single misbehaving/compromised device or a naive
 * secret-guessing script from hammering an endpoint from one connection, but
 * it does NOT provide a hard global limit across a horizontally scaled
 * deployment (each instance keeps its own counters). If SyncFyre later runs
 * many concurrent instances behind these endpoints, swap the store below for
 * a shared one (Upstash Redis, Supabase table, etc.) without changing the
 * call sites.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastPrune = 0;

function pruneExpired(now: number) {
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Fixed-window rate limit check. `key` should already include the route name
 * so different endpoints don't share a bucket for the same client.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt, limit };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt, limit };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt, limit };
}

/** Best-effort client identifier for unauthenticated machine/cron traffic. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

export function rateLimitExceededResponse(result: RateLimitResult) {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
