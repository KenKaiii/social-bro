import { timingSafeEqual } from 'crypto';
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Extract the client IP for rate limiting, as set by Railway's edge proxy.
 *
 * Railway strips any client-supplied `X-Forwarded-For` / `X-Real-Ip` before
 * setting its own, so these headers cannot be spoofed to evade a limit
 * (verified against the live edge: injected values were discarded).
 *
 * `x-real-ip` is preferred because it is a single value. In `x-forwarded-for`
 * the LEFT-most entry is the real client; the right-most is an internal
 * Railway hop that varies by edge POP, which would shard the rate-limit
 * bucket per POP and effectively disable the limit.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const client = forwarded.split(',')[0]?.trim();
    if (client) {
      return client;
    }
  }

  return 'unknown';
}

/**
 * Constant-time string comparison. Returns false for length mismatches
 * without leaking timing information about the matching prefix.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export type AdminAuthResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Authorize an admin request via the `ADMIN_SECRET` bearer token.
 *
 * Rate limited per-IP so the shared secret cannot be ground down by brute
 * force, and compared in constant time to avoid a timing oracle.
 */
export async function authorizeAdmin(request: Request): Promise<AdminAuthResult> {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    throw new Error('ADMIN_SECRET environment variable must be configured');
  }

  const rateLimitKey = `admin:${getClientIp(request)}`;
  const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.auth);
  if (!rateLimit.success) {
    return { ok: false, status: 429, error: 'Too many attempts. Please try again later.' };
  }

  const authHeader = request.headers.get('authorization') ?? '';
  if (!safeEqual(authHeader, `Bearer ${adminSecret}`)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  // Correct secret: clear the counter so routine admin work is never
  // throttled. Only failed attempts consume the budget.
  await resetRateLimit(rateLimitKey);
  return { ok: true };
}
