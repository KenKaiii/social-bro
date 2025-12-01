import { NextRequest, NextResponse } from 'next/server';
import { getChannelVideosByUsername } from '@/lib/youtube';
import { getMultipleVideoDetails } from '@/lib/youtube';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    // Fetch config from database
    let maxResults = 25;
    try {
      const dbConfig = await prisma.youTubeConfig.findUnique({
        where: { userId },
      });
      if (dbConfig) {
        maxResults = dbConfig.maxResults;
      }
    } catch (dbError) {
      console.error('Failed to fetch YouTube config:', dbError);
      // Use default if config fetch fails
    }

    const { channel, videos } = await getChannelVideosByUsername(userId, username, maxResults);

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Get video IDs to fetch detailed stats
    const videoIds = videos.map((v) => v.id).filter(Boolean);

    // Fetch video details with stats
    const videoDetails =
      videoIds.length > 0 ? await getMultipleVideoDetails(userId, videoIds) : [];

    return NextResponse.json({
      channel,
      videos,
      videoDetails,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching channel videos:', error);
    return NextResponse.json({ error: 'Failed to fetch channel videos' }, { status: 500 });
  }
}
