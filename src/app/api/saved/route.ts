import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Platform as PlatformType } from '@/types';
import { Platform } from '@/generated/prisma/client';
import { decodeHtmlEntities } from '@/lib/utils';
import { requireUserId, requireValidUser } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/api-error';

/** Caps on user-supplied input, to bound how much a single request can persist. */
const MAX_QUERY_LENGTH = 200;
const MAX_RESULTS = 100;
const MAX_TEXT_LENGTH = 500;
const MAX_URL_LENGTH = 2048;

function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && Object.values(Platform).includes(value as Platform);
}

function boundedString(value: unknown, max: number, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
  if (value.length > max) {
    throw new Error(`${field} must be at most ${max} characters`);
  }
  return value;
}

/** Coerce a count to a non-negative BigInt, rejecting NaN/Infinity/negatives. */
function boundedCount(value: unknown, field: string): bigint {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return BigInt(Math.floor(num));
}

function toResultRow(item: unknown) {
  if (typeof item !== 'object' || item === null) {
    throw new Error('Each result must be an object');
  }
  const raw = item as Record<string, unknown>;
  return {
    externalId: boundedString(raw.id, MAX_TEXT_LENGTH, 'id'),
    title: boundedString(raw.title ?? '', MAX_TEXT_LENGTH, 'title'),
    creatorName: boundedString(raw.username ?? '', MAX_TEXT_LENGTH, 'username'),
    thumbnail: raw.thumbnail ? boundedString(raw.thumbnail, MAX_URL_LENGTH, 'thumbnail') : null,
    url: boundedString(raw.url ?? '', MAX_URL_LENGTH, 'url'),
    viewCount: boundedCount(raw.views ?? 0, 'views'),
    likeCount: boundedCount(raw.likes ?? 0, 'likes'),
    commentCount: boundedCount(raw.comments ?? 0, 'comments'),
  };
}

// GET - Fetch all saved searches for current user with pagination
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);
    const offset = Number(searchParams.get('offset')) || 0;

    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId },
      include: {
        results: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Transform to match frontend types
    const transformed = savedSearches.map((search: (typeof savedSearches)[number]) => ({
      id: search.id,
      query: search.query,
      platform: search.platform as PlatformType,
      createdAt: search.createdAt.toISOString(),
      results: search.results.map((r: (typeof search.results)[number]) => ({
        id: r.externalId,
        username: decodeHtmlEntities(r.creatorName),
        title: decodeHtmlEntities(r.title),
        views: Number(r.viewCount),
        likes: Number(r.likeCount),
        comments: Number(r.commentCount),
        engagementScore:
          Number(r.viewCount) > 0
            ? ((Number(r.likeCount) + Number(r.commentCount)) / Number(r.viewCount)) * 100
            : 0,
        url: r.url,
        thumbnail: r.thumbnail,
      })),
    }));

    return NextResponse.json({ savedSearches: transformed });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch saved searches');
  }
}

// POST - Save a new search with data for current user
export async function POST(request: NextRequest) {
  try {
    const userId = await requireValidUser();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { query, platform, data } = body as {
      query: string;
      platform: PlatformType;
      data: Array<{
        id: string;
        username: string;
        title: string;
        views: number;
        likes: number;
        comments: number;
        url: string;
        thumbnail?: string;
      }>;
    };

    if (!query || !platform || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // `as Platform` is erased at runtime, so validate against the real enum
    // before it reaches Prisma — an unknown value throws a validation error
    // that would otherwise surface as a 500.
    if (!isPlatform(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }
    const prismaPlatform: Platform = platform;

    if (typeof query !== 'string' || query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `query must be a string of at most ${MAX_QUERY_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (!Array.isArray(data) || data.length > MAX_RESULTS) {
      return NextResponse.json(
        { error: `data must be an array of at most ${MAX_RESULTS} items` },
        { status: 400 }
      );
    }

    let results;
    try {
      results = data.map(toResultRow);
    } catch (validationError) {
      return NextResponse.json(
        {
          error: validationError instanceof Error ? validationError.message : 'Invalid result item',
        },
        { status: 400 }
      );
    }

    // Upsert the saved search (update if exists, create if not)
    const savedSearch = await prisma.savedSearch.upsert({
      where: {
        userId_query_platform: {
          userId,
          query,
          platform: prismaPlatform,
        },
      },
      update: {
        createdAt: new Date(), // Update timestamp
        results: {
          deleteMany: {}, // Clear old results
          create: results,
        },
      },
      create: {
        userId,
        query,
        platform: prismaPlatform,
        results: {
          create: results,
        },
      },
      include: {
        results: true,
      },
    });

    return NextResponse.json({
      success: true,
      savedSearch: {
        id: savedSearch.id,
        query: savedSearch.query,
        platform: savedSearch.platform,
        createdAt: savedSearch.createdAt.toISOString(),
        resultCount: savedSearch.results.length,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to save search');
  }
}

// DELETE - Remove a saved search for current user
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing search ID' }, { status: 400 });
    }

    // Make sure the search belongs to this user
    const existing = await prisma.savedSearch.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 });
    }

    await prisma.savedSearch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to delete saved search');
  }
}
