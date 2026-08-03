/**
 * Rate limiter for API routes.
 *
 * Uses Redis when `REDIS_URL` is configured so the limit is shared across all
 * replicas; falls back to a per-process in-memory counter otherwise (local dev,
 * or if Redis is unreachable). The in-memory path is strictly weaker — with N
 * replicas an attacker gets N x the budget — so Redis is required in production.
 */
import { getRedis } from './redis';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Atomically increment the counter and read its TTL in a single round trip.
 * Sets the expiry only on first increment so the window is fixed from the
 * first request, not extended by later ones.
 */
const INCR_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {count, redis.call('PTTL', KEYS[1])}
`;

function checkInMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // If no entry or window expired, start fresh
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: config.maxRequests - 1, resetTime };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetTime: entry.resetTime };
  }

  // Increment count
  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
}

/**
 * Check rate limit for a given key (usually userId or IP).
 *
 * Shared across replicas when Redis is available. On any Redis failure this
 * degrades to per-process counting rather than blocking the request, so a
 * Redis outage cannot lock every user out.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return checkInMemory(key, config);
  }

  try {
    const reply = (await redis.eval(INCR_SCRIPT, 1, `rl:${key}`, config.windowMs)) as [
      number,
      number,
    ];
    const [count, pttl] = reply;
    const resetTime = Date.now() + (pttl > 0 ? pttl : config.windowMs);

    if (count > config.maxRequests) {
      return { success: false, remaining: 0, resetTime };
    }
    return { success: true, remaining: config.maxRequests - count, resetTime };
  } catch (error) {
    console.error('[rate-limit] redis unavailable, using in-memory fallback:', error);
    return checkInMemory(key, config);
  }
}

/**
 * Clear a key's counter. Call after a *successful* auth attempt so that
 * legitimate use never consumes the brute-force budget — only failures do.
 */
export async function resetRateLimit(key: string): Promise<void> {
  rateLimitStore.delete(key);

  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.del(`rl:${key}`);
  } catch (error) {
    console.error('[rate-limit] failed to reset key:', error);
  }
}

// Preset configurations for different route types
export const RATE_LIMITS = {
  // Expensive operations (LLM calls, transcript extraction)
  expensive: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  // Standard API calls
  standard: { maxRequests: 60, windowMs: 60000 }, // 60 per minute
  // Auth operations (prevent brute force)
  auth: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
  // Search operations
  search: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
} as const;
