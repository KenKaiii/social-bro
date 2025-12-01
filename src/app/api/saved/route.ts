import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Platform as PlatformType } from '@/types';
import { Platform } from '@prisma/client';
import { decodeHtmlEntities } from '@/lib/utils';
import { requireUserId, requireValidUser } from '@/lib/auth-utils';

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
    const transformed = savedSearches.map((search) => ({
      id: search.id,
      query: search.query,
      platform: search.platform as PlatformType,
      createdAt: search.createdAt.toISOString(),
      results: search.results.map((r) => ({
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching saved searches:', error);
    return NextResponse.json({ error: 'Failed to fetch saved searches' }, { status: 500 });
  }
}

// POST - Save a new search with data for current user
export async function POST(request: NextRequest) {
  try {
    const userId = await requireValidUser();

    const body = await request.json();
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

    // Map string platform to Prisma enum
    const prismaPlatform = platform as Platform;

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
          create: data.map((item) => ({
            externalId: item.id,
            title: item.title,
            creatorName: item.username,
            thumbnail: item.thumbnail || null,
            url: item.url,
            viewCount: BigInt(item.views),
            likeCount: BigInt(item.likes),
            commentCount: BigInt(item.comments),
          })),
        },
      },
      create: {
        userId,
        query,
        platform: prismaPlatform,
        results: {
          create: data.map((item) => ({
            externalId: item.id,
            title: item.title,
            creatorName: item.username,
            thumbnail: item.thumbnail || null,
            url: item.url,
            viewCount: BigInt(item.views),
            likeCount: BigInt(item.likes),
            commentCount: BigInt(item.comments),
          })),
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
    console.error('Error saving search:', error);
    return NextResponse.json({ error: 'Failed to save search' }, { status: 500 });
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting saved search:', error);
    return NextResponse.json({ error: 'Failed to delete saved search' }, { status: 500 });
  }
}
