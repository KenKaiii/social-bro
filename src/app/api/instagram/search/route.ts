import { NextRequest, NextResponse } from 'next/server';
import { searchInstagram, getUserReels, transformReelsToTableData } from '@/lib/rapidapi';
import { requireUserId } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    // Rate limit search requests
    const rateLimit = checkRateLimit(`instagram-search:${userId}`, RATE_LIMITS.search);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Search for users
    const users = await searchInstagram({
      userId,
      query,
    });

    if (users.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Get reels from the first (most relevant) user
    const topUser = users[0];
    const reels = await getUserReels({
      userId,
      userPk: topUser.pk,
      count: 12,
    });

    // Add username to reels if missing
    const reelsWithUser = reels.map((reel) => ({
      ...reel,
      username: reel.username || topUser.username,
    }));

    const tableData = transformReelsToTableData(reelsWithUser);

    return NextResponse.json({
      user: topUser,
      results: tableData,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to search Instagram');
  }
}
