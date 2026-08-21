/**
 * Guard drill for the 30-day statistics retention rule.
 *
 * Seeds one row that must survive and one that must expire, runs the purge,
 * and asserts both outcomes. Point DATABASE_URL at a scratch database — this
 * writes and then deletes its own rows.
 *
 *   npx tsx scripts/verify-retention.ts
 */
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/db';
import { purgeStaleStats, STATS_MAX_AGE_DAYS } from '../src/lib/retention';

const DAY_MS = 24 * 60 * 60 * 1000;
const marker = `retention-drill-${randomUUID()}`;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`  ok — ${message}`);
}

async function main() {
  const stale = new Date(Date.now() - (STATS_MAX_AGE_DAYS + 1) * DAY_MS);
  const fresh = new Date();

  const user = await prisma.user.create({
    data: { email: `${marker}@example.invalid`, name: marker },
  });

  const stats = { viewCount: BigInt(1234), likeCount: BigInt(56), commentCount: BigInt(7) };
  const result = { externalId: 'vid-1', title: 't', creatorName: 'c', url: 'u', ...stats };

  const staleSearch = await prisma.savedSearch.create({
    data: {
      userId: user.id,
      query: `${marker}-stale`,
      platform: 'youtube',
      createdAt: stale,
      results: { create: result },
    },
    include: { results: true },
  });
  const freshSearch = await prisma.savedSearch.create({
    data: {
      userId: user.id,
      query: `${marker}-fresh`,
      platform: 'youtube',
      createdAt: fresh,
      results: { create: result },
    },
    include: { results: true },
  });
  const staleItem = await prisma.savedItem.create({
    data: {
      userId: user.id,
      externalId: 'i-1',
      platform: 'youtube',
      title: 't',
      url: 'u',
      savedAt: stale,
      ...stats,
    },
  });
  const freshItem = await prisma.savedItem.create({
    data: {
      userId: user.id,
      externalId: 'i-2',
      platform: 'youtube',
      title: 't',
      url: 'u',
      savedAt: fresh,
      ...stats,
    },
  });

  try {
    console.log('\ndry run must not write:');
    const preview = await purgeStaleStats({ dryRun: true });
    console.log(' ', preview);
    assert(
      (
        await prisma.savedSearchResult.findUniqueOrThrow({
          where: { id: staleSearch.results[0].id },
        })
      ).viewCount === BigInt(1234),
      'dry run left the stale row untouched'
    );

    console.log('\npurge:');
    const report = await purgeStaleStats();
    console.log(' ', report);

    const staleResult = await prisma.savedSearchResult.findUniqueOrThrow({
      where: { id: staleSearch.results[0].id },
    });
    const freshResult = await prisma.savedSearchResult.findUniqueOrThrow({
      where: { id: freshSearch.results[0].id },
    });

    assert(staleResult.viewCount === null, 'stale saved-search stats expired');
    assert(staleResult.title === 't' && staleResult.url === 'u', 'stale row itself survived');
    assert(freshResult.viewCount === BigInt(1234), 'fresh saved-search stats untouched');
    assert(
      (await prisma.savedItem.findUniqueOrThrow({ where: { id: staleItem.id } })).likeCount ===
        null,
      'stale saved item expired'
    );
    assert(
      (await prisma.savedItem.findUniqueOrThrow({ where: { id: freshItem.id } })).likeCount ===
        BigInt(56),
      'fresh saved item untouched'
    );

    const rerun = await purgeStaleStats();
    assert(
      rerun.expired.savedSearchResults === 0 && rerun.expired.savedItems === 0,
      'second run is a no-op (already-expired rows are skipped)'
    );

    assert(
      (await prisma.savedSearch.count({ where: { userId: user.id } })) === 2,
      'nothing was deleted'
    );

    console.log('\nAll retention guards passed.');
  } finally {
    // Cascades to searches, results and items.
    await prisma.user.delete({ where: { id: user.id } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
