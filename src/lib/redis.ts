import Redis from 'ioredis';

/**
 * Shared Redis connection, used for cross-replica rate limiting.
 *
 * Returns null when `REDIS_URL` is unset (local dev), so callers fall back to
 * their in-memory path instead of failing.
 */
let client: Redis | null = null;
let initialized = false;

/**
 * Railway resolves `*.railway.internal` over IPv6 (and IPv4 on newer
 * environments). ioredis defaults to IPv4-only lookups, so `family=0` is
 * required to let it connect over either.
 * See https://docs.railway.com/networking/private-networking/library-configuration
 */
function buildUrl(rawUrl: string): string {
  return rawUrl.includes('family=')
    ? rawUrl
    : `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}family=0`;
}

export function getRedis(): Redis | null {
  if (initialized) {
    return client;
  }
  initialized = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  client = new Redis(buildUrl(url), {
    // Fail fast rather than queueing commands behind a dead connection —
    // callers degrade to in-memory limiting instead of hanging the request.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    lazyConnect: false,
  });

  // Without a listener, a connection error is an unhandled 'error' event and
  // crashes the process.
  client.on('error', (error: Error) => {
    console.error('[redis] connection error:', error.message);
  });

  return client;
}
