import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getYouTubeTranscriptFast } from '@/lib/rapidapi';
import { requireValidUser } from '@/lib/auth-utils';
import { isApiError } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// POST - Extract transcript from a repurpose video and save as script
export async function POST(request: NextRequest) {
  try {
    const userId = await requireValidUser();

    // Rate limit expensive operations
    const rateLimit = checkRateLimit(`transcript:${userId}`, RATE_LIMITS.expensive);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { repurposeVideoId, lang = 'en' } = body as {
      repurposeVideoId: string;
      lang?: string;
    };

    if (!repurposeVideoId) {
      return NextResponse.json({ error: 'repurposeVideoId is required' }, { status: 400 });
    }

    // Get the repurpose video
    const repurposeVideo = await prisma.repurposeVideo.findFirst({
      where: { id: repurposeVideoId, userId },
    });

    if (!repurposeVideo) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Only YouTube videos support transcript extraction
    if (repurposeVideo.platform !== 'youtube') {
      return NextResponse.json(
        { error: 'Transcript extraction is only available for YouTube videos' },
        { status: 400 }
      );
    }

    // Check if a script already exists for this video
    const existingScript = await prisma.script.findFirst({
      where: { repurposeVideoId, userId },
    });

    if (existingScript) {
      return NextResponse.json({
        success: true,
        script: {
          id: existingScript.id,
          title: existingScript.title,
          script: existingScript.script,
          status: existingScript.status,
          sourceUrl: existingScript.sourceUrl,
          createdAt: existingScript.createdAt.toISOString(),
          updatedAt: existingScript.updatedAt.toISOString(),
        },
        alreadyExists: true,
      });
    }

    // Extract transcript
    const result = await getYouTubeTranscriptFast({
      userId,
      videoUrl: repurposeVideo.url,
      lang,
    });

    // Create script with the transcript
    const script = await prisma.script.create({
      data: {
        userId,
        title: repurposeVideo.title,
        script: result.transcript,
        sourceUrl: repurposeVideo.url,
        repurposeVideoId: repurposeVideo.id,
        status: 'draft',
      },
    });

    return NextResponse.json({
      success: true,
      script: {
        id: script.id,
        title: script.title,
        script: script.script,
        status: script.status,
        sourceUrl: script.sourceUrl,
        createdAt: script.createdAt.toISOString(),
        updatedAt: script.updatedAt.toISOString(),
      },
      alreadyExists: false,
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
    if (isApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error extracting transcript:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract transcript' },
      { status: 500 }
    );
  }
}
