import { NextRequest, NextResponse } from 'next/server';
import { searchYouTube } from '@/lib/youtube';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-utils';

// Helper to calculate publishedAfter date from dateRange
function getPublishedAfterDate(dateRange: string): string | undefined {
  if (dateRange === 'any') return undefined;

  const now = new Date();
  let date: Date;

  switch (dateRange) {
    case 'day':
      date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      return undefined;
  }

  return date.toISOString();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const type = searchParams.get('type') as 'video' | 'channel' | 'playlist' | null;

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    // Fetch user-specific config from database
    const defaultConfig = {
      maxResults: 25,
      dateRange: 'any',
      region: 'US',
      videoDuration: 'any',
      order: 'relevance',
    };

    let config = defaultConfig;

    try {
      const dbConfig = await prisma.youTubeConfig.findUnique({
        where: { userId },
      });
      if (dbConfig) {
        config = {
          maxResults: dbConfig.maxResults,
          dateRange: dbConfig.dateRange,
          region: dbConfig.region,
          videoDuration: dbConfig.videoDuration,
          order: dbConfig.order,
        };
      }
    } catch (dbError) {
      console.error('Failed to fetch YouTube config from database:', dbError);
      // Use defaults if config fetch fails
    }

    const results = await searchYouTube({
      userId,
      query,
      maxResults: config.maxResults,
      order: config.order as 'date' | 'rating' | 'relevance' | 'title' | 'viewCount',
      type: type || 'video',
      regionCode: config.region,
      publishedAfter: getPublishedAfterDate(config.dateRange),
      videoDuration: config.videoDuration as 'any' | 'short' | 'medium' | 'long',
    });

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('YouTube search error:', error);
    return NextResponse.json({ error: 'Failed to search YouTube' }, { status: 500 });
  }
}
