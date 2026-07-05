import { env } from "@/lib/env";
import { redisConnection } from "@/lib/queue";

/**
 * Fixed-window rate limiter (System Design §9). Redis-backed when REDIS_URL
 * is set (shared across instances); falls back to an in-process Map so local
 * dev without Redis still enforces limits.
 */
type Result = { allowed: boolean; remaining: number; retryAfterSec: number };

const memory = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<Result> {
  const now = Date.now();

  if (env.REDIS_URL) {
    const redis = redisConnection();
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSec);
    const ttl = count > limit ? await redis.ttl(redisKey) : windowSec;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSec: Math.max(1, ttl),
    };
  }

  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSec: windowSec };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function tooManyRequests(retryAfterSec: number) {
  return new Response(
    JSON.stringify({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests — slow down a little.",
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}
