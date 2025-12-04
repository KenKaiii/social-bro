import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getYouTubeTranscriptFast } from '@/lib/rapidapi';
import { repurposeTranscript, type ProgressUpdate } from '@/lib/repurpose';
import { requireValidUser } from '@/lib/auth-utils';
import { isApiError } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// Force dynamic rendering and disable buffering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * Extract YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
    /(?:m\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get YouTube video title using oEmbed (no API key required)
 */
async function getYouTubeTitle(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.title || null;
  } catch {
    return null;
  }
}

// POST - Extract transcript from URL and repurpose it with streaming progress
export async function POST(request: NextRequest) {
  // Check if client wants streaming
  const acceptHeader = request.headers.get('accept');
  const wantsStream = acceptHeader?.includes('text/event-stream');

  if (wantsStream) {
    return handleStreamingRequest(request);
  }

  return handleNonStreamingRequest(request);
}

// Streaming version with progress updates
async function handleStreamingRequest(request: NextRequest) {
  const encoder = new TextEncoder();

  // Use TransformStream for better streaming support
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Helper to write and flush immediately
  const writeEvent = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  // Process in background while streaming response
  (async () => {
    try {
      const userId = await requireValidUser();

      // Rate limit expensive operations
      const rateLimit = checkRateLimit(`repurpose:${userId}`, RATE_LIMITS.expensive);
      if (!rateLimit.success) {
        await writeEvent('error', { error: 'Rate limit exceeded. Please try again later.' });
        await writer.close();
        return;
      }

      let body;
      try {
        body = await request.json();
      } catch {
        await writeEvent('error', { error: 'Invalid JSON body' });
        await writer.close();
        return;
      }
      const { url, lang = 'en' } = body as { url: string; lang?: string };

      if (!url) {
        await writeEvent('error', { error: 'URL is required' });
        await writer.close();
        return;
      }

      const videoId = extractVideoId(url);
      if (!videoId) {
        await writeEvent('error', { error: 'Invalid YouTube URL' });
        await writer.close();
        return;
      }

      // Check for existing script
      const existingScript = await prisma.script.findFirst({
        where: { sourceUrl: url, userId },
      });

      if (existingScript?.repurposedScript) {
        await writeEvent('complete', {
          success: true,
          script: {
            id: existingScript.id,
            title: existingScript.title,
            script: existingScript.script,
            repurposedScript: existingScript.repurposedScript,
            hooks: existingScript.hooks,
            status: existingScript.status,
            createdAt: existingScript.createdAt.toISOString(),
            updatedAt: existingScript.updatedAt.toISOString(),
          },
          alreadyExists: true,
        });
        await writer.close();
        return;
      }

      // Send progress: extracting
      await writeEvent('progress', {
        step: 'extracting',
        message: 'Extracting transcript from YouTube',
      });

      // Get video title and transcript
      const [videoTitle, transcriptResult] = await Promise.all([
        getYouTubeTitle(url),
        getYouTubeTranscriptFast({ userId, videoUrl: url, lang }),
      ]);

      // Create script record
      let script;
      if (existingScript) {
        script = existingScript;
      } else {
        script = await prisma.script.create({
          data: {
            userId,
            title: videoTitle || `YouTube Video ${videoId}`,
            script: transcriptResult.transcript,
            sourceUrl: url,
            status: 'draft',
          },
        });
      }

      // Repurpose with progress callback
      const repurposeResult = await repurposeTranscript(
        userId,
        transcriptResult.transcript,
        async (update: ProgressUpdate) => {
          await writeEvent('progress', update);
        }
      );

      // Update script with repurposed content
      const updatedScript = await prisma.script.update({
        where: { id: script.id },
        data: {
          repurposedScript: repurposeResult.repurposedScript,
          hooks: repurposeResult.hooks,
          status: 'in_progress',
        },
      });

      // Send completion event
      await writeEvent('complete', {
        success: true,
        script: {
          id: updatedScript.id,
          title: updatedScript.title,
          script: updatedScript.script,
          repurposedScript: updatedScript.repurposedScript,
          hooks: updatedScript.hooks,
          status: updatedScript.status,
          createdAt: updatedScript.createdAt.toISOString(),
          updatedAt: updatedScript.updatedAt.toISOString(),
        },
        chunksProcessed: repurposeResult.chunksProcessed,
        alreadyExists: false,
      });

      await writer.close();
    } catch (error) {
      let errorMessage = 'Failed to repurpose';

      if (error instanceof Error) {
        if (error.message === 'Unauthorized' || error.message === 'InvalidSession') {
          errorMessage = error.message;
        } else if (error.message.includes('No LLM model selected')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }

      if (isApiError(error)) {
        errorMessage = error.message;
      }

      console.error('Error repurposing URL:', error);
      await writeEvent('error', { error: errorMessage });
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Non-streaming version for backwards compatibility
async function handleNonStreamingRequest(request: NextRequest) {
  try {
    const userId = await requireValidUser();

    const body = await request.json();
    const { url, lang = 'en' } = body as {
      url: string;
      lang?: string;
    };

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extract video ID for validation and title
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Check if a script already exists for this URL
    const existingScript = await prisma.script.findFirst({
      where: { sourceUrl: url, userId },
    });

    if (existingScript) {
      // If already repurposed, return it
      if (existingScript.repurposedScript) {
        return NextResponse.json({
          success: true,
          script: {
            id: existingScript.id,
            title: existingScript.title,
            script: existingScript.script,
            repurposedScript: existingScript.repurposedScript,
            hooks: existingScript.hooks,
            status: existingScript.status,
            createdAt: existingScript.createdAt.toISOString(),
            updatedAt: existingScript.updatedAt.toISOString(),
          },
          alreadyExists: true,
        });
      }
    }

    // Get video title and extract transcript in parallel
    const [videoTitle, transcriptResult] = await Promise.all([
      getYouTubeTitle(url),
      getYouTubeTranscriptFast({
        userId,
        videoUrl: url,
        lang,
      }),
    ]);

    // Create or update script with transcript
    let script;
    if (existingScript) {
      script = existingScript;
    } else {
      script = await prisma.script.create({
        data: {
          userId,
          title: videoTitle || `YouTube Video ${videoId}`,
          script: transcriptResult.transcript,
          sourceUrl: url,
          status: 'draft',
        },
      });
    }

    // Repurpose the transcript
    const repurposeResult = await repurposeTranscript(userId, transcriptResult.transcript);

    // Update script with repurposed content
    const updatedScript = await prisma.script.update({
      where: { id: script.id },
      data: {
        repurposedScript: repurposeResult.repurposedScript,
        hooks: repurposeResult.hooks,
        status: 'in_progress',
      },
    });

    return NextResponse.json({
      success: true,
      script: {
        id: updatedScript.id,
        title: updatedScript.title,
        script: updatedScript.script,
        repurposedScript: updatedScript.repurposedScript,
        hooks: updatedScript.hooks,
        status: updatedScript.status,
        createdAt: updatedScript.createdAt.toISOString(),
        updatedAt: updatedScript.updatedAt.toISOString(),
      },
      chunksProcessed: repurposeResult.chunksProcessed,
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
      if (error.message.includes('No LLM model selected')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    if (isApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error repurposing URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to repurpose' },
      { status: 500 }
    );
  }
}
