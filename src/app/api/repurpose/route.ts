import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Platform as PlatformType } from '@/types';
import { Platform } from '@/generated/prisma/client';
import { requireUserId, requireValidUser } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/api-error';

// GET - Fetch all repurpose videos for current user
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const offset = Number(searchParams.get('offset')) || 0;

    const videos = await prisma.repurposeVideo.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        scripts: {
          select: { id: true },
          take: 1,
        },
      },
    });

    // Transform to match frontend types
    const transformed = videos.map((video) => ({
      id: video.id,
      externalId: video.externalId,
      platform: video.platform as PlatformType,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail,
      url: video.url,
      creatorId: video.creatorId,
      creatorName: video.creatorName,
      viewCount: video.viewCount ? Number(video.viewCount) : null,
      likeCount: video.likeCount ? Number(video.likeCount) : null,
      commentCount: video.commentCount ? Number(video.commentCount) : null,
      savedAt: video.savedAt.toISOString(),
      hasTranscript: video.scripts.length > 0,
    }));

    return NextResponse.json({ videos: transformed });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch repurpose videos');
  }
}

// POST - Add a video to repurpose list
export async function POST(request: NextRequest) {
  try {
    const userId = await requireValidUser();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const {
      externalId,
      platform,
      title,
      description,
      thumbnail,
      url,
      creatorId,
      creatorName,
      viewCount,
      likeCount,
      commentCount,
    } = body as {
      externalId: string;
      platform: PlatformType;
      title: string;
      description?: string;
      thumbnail?: string;
      url: string;
      creatorId?: string;
      creatorName?: string;
      viewCount?: number;
      likeCount?: number;
      commentCount?: number;
    };

    if (!externalId || !platform || !title || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prismaPlatform = platform as Platform;

    // Upsert the video (update if exists, create if not)
    const video = await prisma.repurposeVideo.upsert({
      where: {
        userId_externalId_platform: {
          userId,
          externalId,
          platform: prismaPlatform,
        },
      },
      update: {
        title,
        description: description || null,
        thumbnail: thumbnail || null,
        url,
        creatorId: creatorId || null,
        creatorName: creatorName || null,
        viewCount: viewCount !== undefined ? BigInt(viewCount) : null,
        likeCount: likeCount !== undefined ? BigInt(likeCount) : null,
        commentCount: commentCount !== undefined ? BigInt(commentCount) : null,
        savedAt: new Date(),
      },
      create: {
        userId,
        externalId,
        platform: prismaPlatform,
        title,
        description: description || null,
        thumbnail: thumbnail || null,
        url,
        creatorId: creatorId || null,
        creatorName: creatorName || null,
        viewCount: viewCount !== undefined ? BigInt(viewCount) : null,
        likeCount: likeCount !== undefined ? BigInt(likeCount) : null,
        commentCount: commentCount !== undefined ? BigInt(commentCount) : null,
      },
    });

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        externalId: video.externalId,
        title: video.title,
        savedAt: video.savedAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to save video');
  }
}

// DELETE - Remove a video from repurpose list
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
    }

    // Make sure the video belongs to this user
    const existing = await prisma.repurposeVideo.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    await prisma.repurposeVideo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to delete video');
  }
}
