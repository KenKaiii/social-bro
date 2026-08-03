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
    // Queue commands while the socket is still connecting or briefly
    // reconnecting. With this disabled, every command issued before the
    // connection became ready failed instantly with "Stream isn't writeable",
    // silently degrading every replica to per-process limiting.
    enableOfflineQueue: true,
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    // Hard ceiling per command, so a stalled Redis falls back to the
    // in-memory path quickly instead of holding the request open.
    commandTimeout: 1000,
    // Bounded reconnect backoff; returning a number keeps ioredis retrying.
    retryStrategy: (times: number) => Math.min(times * 200, 5000),
  });

  // Without a listener, a connection error is an unhandled 'error' event and
  // crashes the process.
  client.on('error', (error: Error) => {
    console.error('[redis] connection error:', error.message);
  });

  // Logged once per replica so a silent fallback to in-memory limiting is
  // visible in deploy logs rather than being invisible until abused.
  client.on('ready', () => {
    console.log('[redis] connected — rate limiting is shared across replicas');
  });

  return client;
}
