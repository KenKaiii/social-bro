import { NextRequest, NextResponse } from 'next/server';
import { searchTikTok, transformSearchResultsToTableData } from '@/lib/rapidapi';
import { requireUserId } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('q');

  if (!keyword) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    // Rate limit search requests
    const rateLimit = checkRateLimit(`tiktok-search:${userId}`, RATE_LIMITS.search);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const results = await searchTikTok({
      userId,
      keyword,
    });

    const tableData = transformSearchResultsToTableData(results);

    return NextResponse.json({ results: tableData });
  } catch (error) {
    return handleApiError(error, 'Failed to search TikTok');
  }
}
