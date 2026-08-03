import { timingSafeEqual } from 'crypto';
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Extract a rate-limiting identity from proxy headers.
 *
 * Deliberately uses the RIGHT-most `x-forwarded-for` entry, not the left-most.
 * A client can send its own `X-Forwarded-For` header, and proxies *append* to
 * it — so the left-most value is attacker-controlled and trivially rotated to
 * defeat rate limiting. The right-most entry is the one written by the proxy
 * closest to us and cannot be forged.
 *
 * Worst case (multiple proxy hops) this collapses to a shared bucket, which
 * fails closed — acceptable here, since a successful auth clears the counter.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const nearest = parts[parts.length - 1];
    if (nearest) {
      return nearest;
    }
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
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
