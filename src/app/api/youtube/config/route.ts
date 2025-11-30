import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

// GET - Fetch YouTube config
export async function GET() {
  try {
    const config = await prisma.youTubeConfig.findFirst();

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
    console.error('Failed to fetch YouTube config:', error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

// POST - Save YouTube config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { maxResults, dateRange, region, videoDuration, order } = body;

    // Validate inputs
    const validMaxResults = Math.min(Math.max(Number(maxResults) || 25, 1), 50);
    const validDateRange = ['any', 'day', 'week', 'month'].includes(dateRange)
      ? dateRange
      : 'any';
    const validRegion = typeof region === 'string' && region.length === 2 ? region : 'US';
    const validDuration = ['any', 'short', 'medium', 'long'].includes(videoDuration)
      ? videoDuration
      : 'any';
    const validOrder = ['date', 'rating', 'relevance', 'title', 'viewCount'].includes(order)
      ? order
      : 'relevance';

    // Upsert config (update if exists, create if not)
    const existingConfig = await prisma.youTubeConfig.findFirst();

    let config;
    if (existingConfig) {
      config = await prisma.youTubeConfig.update({
        where: { id: existingConfig.id },
        data: {
          maxResults: validMaxResults,
          dateRange: validDateRange,
          region: validRegion,
          videoDuration: validDuration,
          order: validOrder,
        },
      });
    } else {
      config = await prisma.youTubeConfig.create({
        data: {
          maxResults: validMaxResults,
          dateRange: validDateRange,
          region: validRegion,
          videoDuration: validDuration,
          order: validOrder,
        },
      });
    }

    return NextResponse.json({
      maxResults: config.maxResults,
      dateRange: config.dateRange,
      region: config.region,
      videoDuration: config.videoDuration,
      order: config.order,
    });
  } catch (error) {
    console.error('Failed to save YouTube config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
