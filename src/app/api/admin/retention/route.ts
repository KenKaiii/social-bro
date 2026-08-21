import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { purgeStaleStats } from '@/lib/retention';
import { handleApiError } from '@/lib/api-error';

/**
 * Expire cached platform statistics older than 30 days.
 *
 * Meant to be called on a schedule (Railway cron, or any external scheduler)
 * with the `ADMIN_SECRET` bearer token:
 *
 *   curl -fsS -X POST https://<host>/api/admin/retention \
 *     -H "Authorization: Bearer $ADMIN_SECRET"
 *
 * Add `?dryRun=1` to count what would be expired without writing anything.
 */
export async function POST(request: Request) {
  try {
    const auth = await authorizeAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
    const report = await purgeStaleStats({ dryRun });

    console.warn('[retention] stats purge', report);
    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error, 'Failed to purge stale statistics');
  }
}
