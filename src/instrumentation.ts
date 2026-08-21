/**
 * Server startup hook. Runs once per Next.js server instance.
 *
 * Schedules the 30-day statistics purge from inside the app itself, so the
 * YouTube retention rule is satisfied without a second Railway service, an
 * external scheduler, or a shared secret to keep in sync.
 */
export async function register(): Promise<void> {
  // The import must stay inside this branch: Next.js bundles instrumentation
  // for the Edge runtime too, and Prisma cannot be loaded there.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startRetentionScheduler } = await import('@/lib/retention-scheduler');
    startRetentionScheduler();
  }
}
