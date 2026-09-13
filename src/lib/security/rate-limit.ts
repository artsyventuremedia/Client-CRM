/**
 * In-memory sliding-window rate limiter. Good enough for a single dev/staging
 * instance; a real multi-instance production deployment must back this with
 * Redis (or a similar shared store) since this state does not survive a
 * restart and is not shared across processes.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

// Periodically forget buckets that have gone idle so this map cannot grow
// without bound over a long-running process.
setInterval(
  () => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [key, bucket] of buckets) {
      if (bucket.hits.length === 0 || bucket.hits[bucket.hits.length - 1] < cutoff) {
        buckets.delete(key);
      }
    }
  },
  10 * 60 * 1000,
).unref();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const retryAfterSeconds = Math.ceil((windowMs - (now - bucket.hits[0])) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
