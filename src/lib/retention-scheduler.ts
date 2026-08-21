import { purgeStaleStats } from '@/lib/retention';

/**
 * In-process scheduler for the 30-day statistics purge.
 *
 * Kept in its own module so `instrumentation.ts` can import it dynamically
 * inside its Node-runtime branch: Next.js also bundles instrumentation for the
 * Edge runtime, and Prisma cannot be loaded there.
 */

/** How often to purge once the server is up. */
const PURGE_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** Delay before the first run, so a deploy and its migrations settle first. */
const FIRST_RUN_DELAY_MS = 60 * 1000;

async function runPurge(): Promise<void> {
  try {
    const report = await purgeStaleStats();
    const { savedSearchResults, savedItems, repurposeVideos } = report.expired;

    // Only worth a line when something actually changed.
    if (savedSearchResults + savedItems + repurposeVideos > 0) {
      console.warn('[retention] expired stale platform stats', report);
    }
  } catch (error) {
    // A failed purge must never take the server down; the next tick retries.
    console.error('[retention] purge failed', error);
  }
}

export function startRetentionScheduler(): void {
  // Both timers are unref'd so they never hold the process open during a
  // shutdown — the HTTP server is what keeps it alive.
  const first = setTimeout(() => {
    void runPurge();
    setInterval(() => void runPurge(), PURGE_INTERVAL_MS).unref?.();
  }, FIRST_RUN_DELAY_MS);

  first.unref?.();
}
