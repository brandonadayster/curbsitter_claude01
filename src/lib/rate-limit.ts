import type { NextRequest } from "next/server";

/**
 * Best-effort in-memory rate limiter for public, unauthenticated write
 * endpoints (SECURITY_PRIVACY.md: "Rate limit public forms, ...").
 *
 * IMPORTANT: this is per-instance. On serverless/multi-instance deploys it only
 * blunts casual abuse from a single instance. Before real scale, back this with
 * a shared store (Upstash Redis / Vercel KV) and add bot protection
 * (Cloudflare Turnstile) on the public forms — see OPEN_DECISIONS / launch
 * checklist. The interface stays the same when the backend is swapped.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Occasionally evict expired buckets so the map can't grow unbounded.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/**
 * Fixed-window limiter: `limit` requests per `windowSeconds` per key.
 */
export function rateLimit(
  key: string,
  options: { limit: number; windowSeconds: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowSeconds * 1000 });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= options.limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/**
 * Convenience wrapper for a public endpoint: builds a namespaced per-IP key.
 */
export function limitPublic(
  request: NextRequest,
  namespace: string,
  options: { limit: number; windowSeconds: number },
): RateLimitResult {
  return rateLimit(`${namespace}:${clientIp(request)}`, options);
}
