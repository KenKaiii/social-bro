import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId, requireValidUser } from '@/lib/auth-utils';

export interface YouTubeConfigData {
  maxResults: number;
  dateRange: string;
  region: string;
  videoDuration: string;
  order: string;
}

const DEFAULT_CONFIG: YouTubeConfigData = {
  maxResults: 25,
  dateRange: 'any',
  region: 'US',
  videoDuration: 'any',
  order: 'relevance',
};

// GET - Fetch YouTube config for current user
export async function GET() {
  try {
    const userId = await requireUserId();

    const config = await prisma.youTubeConfig.findUnique({
      where: { userId },
    });

    if (!config) {
      return NextResponse.json(DEFAULT_CONFIG);
    }

    return NextResponse.json({
      maxResults: config.maxResults,
      dateRange: config.dateRange,
      region: config.region,
      videoDuration: config.videoDuration,
      order: config.order,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch YouTube config:', error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

// POST - Save YouTube config for current user
export async function POST(request: NextRequest) {
  try {
    const userId = await requireValidUser();

    const body = await request.json();
    const { maxResults, dateRange, region, videoDuration, order } = body;

    // Validate inputs
    const validMaxResults = Math.min(Math.max(Number(maxResults) || 25, 1), 50);
    const validDateRange = ['any', 'day', 'week', 'month'].includes(dateRange) ? dateRange : 'any';
    // Validate region code (ISO 3166-1 alpha-2)
    const validRegionCodes = [
      'US',
      'GB',
      'CA',
      'AU',
      'DE',
      'FR',
      'JP',
      'KR',
      'IN',
      'BR',
      'MX',
      'ES',
      'IT',
      'NL',
      'RU',
      'PL',
      'SE',
      'NO',
      'DK',
      'FI',
      'AT',
      'CH',
      'BE',
      'PT',
      'IE',
      'NZ',
      'SG',
      'HK',
      'TW',
      'PH',
      'ID',
      'MY',
      'TH',
      'VN',
      'ZA',
      'AR',
      'CL',
      'CO',
      'PE',
      'EG',
      'SA',
      'AE',
      'IL',
      'TR',
      'UA',
    ];
    const validRegion =
      typeof region === 'string' && validRegionCodes.includes(region.toUpperCase())
        ? region.toUpperCase()
        : 'US';
    const validDuration = ['any', 'short', 'medium', 'long'].includes(videoDuration)
      ? videoDuration
      : 'any';
    const validOrder = ['date', 'rating', 'relevance', 'title', 'viewCount'].includes(order)
      ? order
      : 'relevance';

    // Upsert config for this user
    const config = await prisma.youTubeConfig.upsert({
      where: { userId },
      update: {
        maxResults: validMaxResults,
        dateRange: validDateRange,
        region: validRegion,
        videoDuration: validDuration,
        order: validOrder,
      },
      create: {
        userId,
        maxResults: validMaxResults,
        dateRange: validDateRange,
        region: validRegion,
        videoDuration: validDuration,
        order: validOrder,
      },
    });

    return NextResponse.json({
      maxResults: config.maxResults,
      dateRange: config.dateRange,
      region: config.region,
      videoDuration: config.videoDuration,
      order: config.order,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'InvalidSession') {
        return NextResponse.json(
          { error: 'Session invalid. Please log out and log in again.' },
          { status: 401 }
        );
      }
    }
    console.error('Failed to save YouTube config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
