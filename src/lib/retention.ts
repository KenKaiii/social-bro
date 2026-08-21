import { prisma } from '@/lib/db';

/**
 * Cached platform statistics expire after 30 days.
 *
 * The YouTube API Services Developer Policies (III.E.4) require non-authorized
 * data — including view, like and comment counts — to be deleted or refreshed
 * within 30 calendar days. Refreshing every saved row would burn API quota, so
 * we expire the numbers instead and keep everything the user deliberately
 * saved: title, creator, URL and thumbnail all survive.
 *
 * The same rule is what stops third-party creator statistics from accumulating
 * indefinitely, which is the other half of why this exists.
 */
export const STATS_MAX_AGE_DAYS = 30;

/** Saved searches processed per statement, so one run never locks a big table. */
const BATCH_SIZE = 500;

/** Null means "expired" here, which is deliberately not the same as a real 0. */
const EXPIRED_STATS = { viewCount: null, likeCount: null, commentCount: null };

/** Already-expired rows are skipped, so counts mean "newly expired". */
const NOT_ALREADY_EXPIRED = { NOT: { viewCount: null, likeCount: null, commentCount: null } };

export interface PurgeReport {
  cutoff: string;
  dryRun: boolean;
  /** Rows expired per table — or, when `dryRun`, rows that would be expired. */
  expired: {
    savedSearchResults: number;
    savedItems: number;
    repurposeVideos: number;
  };
}

export function staleCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - STATS_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Expire stale cached statistics.
 *
 * Every write is bounded by an age filter — there is no unfiltered `updateMany`
 * in here — and nothing is ever deleted, so the worst case is losing stale
 * numbers rather than a user's saved content. Pass `dryRun` to count first.
 *
 * Each table records when its cached copy was written: `SavedSearch.createdAt`
 * is reset whenever a search is re-saved (which replaces all of its results),
 * and `savedAt` plays that role on the other two.
 */
export async function purgeStaleStats({
  now = new Date(),
  dryRun = false,
}: { now?: Date; dryRun?: boolean } = {}): Promise<PurgeReport> {
  const cutoff = staleCutoff(now);
  const staleByAge = { savedAt: { lt: cutoff }, ...NOT_ALREADY_EXPIRED };

  // Relation filters are not available on updateMany, so stale parents are
  // resolved to ids first. This also gives the batching for free.
  const staleSearchIds = (
    await prisma.savedSearch.findMany({
      where: { createdAt: { lt: cutoff }, results: { some: NOT_ALREADY_EXPIRED } },
      select: { id: true },
    })
  ).map((s) => s.id);

  if (dryRun) {
    const [savedSearchResults, savedItems, repurposeVideos] = await Promise.all([
      prisma.savedSearchResult.count({
        where: { savedSearchId: { in: staleSearchIds }, ...NOT_ALREADY_EXPIRED },
      }),
      prisma.savedItem.count({ where: staleByAge }),
      prisma.repurposeVideo.count({ where: staleByAge }),
    ]);
    return {
      cutoff: cutoff.toISOString(),
      dryRun: true,
      expired: { savedSearchResults, savedItems, repurposeVideos },
    };
  }

  let savedSearchResults = 0;
  for (let i = 0; i < staleSearchIds.length; i += BATCH_SIZE) {
    const { count } = await prisma.savedSearchResult.updateMany({
      where: {
        savedSearchId: { in: staleSearchIds.slice(i, i + BATCH_SIZE) },
        ...NOT_ALREADY_EXPIRED,
      },
      data: EXPIRED_STATS,
    });
    savedSearchResults += count;
  }

  const [savedItems, repurposeVideos] = await Promise.all([
    prisma.savedItem.updateMany({ where: staleByAge, data: EXPIRED_STATS }),
    prisma.repurposeVideo.updateMany({ where: staleByAge, data: EXPIRED_STATS }),
  ]);

  return {
    cutoff: cutoff.toISOString(),
    dryRun: false,
    expired: {
      savedSearchResults,
      savedItems: savedItems.count,
      repurposeVideos: repurposeVideos.count,
    },
  };
}
