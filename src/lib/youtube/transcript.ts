import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptInvalidVideoIdError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from 'youtube-transcript-plus';
import { ApiError } from '@/lib/errors';

export interface YouTubeTranscriptOptions {
  videoUrl: string;
  lang?: string;
}

export interface YouTubeTranscriptResult {
  transcript: string;
  videoId: string;
  lang: string;
}

/**
 * Extract a YouTube video transcript directly from YouTube's Innertube API.
 *
 * No API key required — this hits YouTube's own endpoints. Note that cloud
 * provider IPs (Vercel, AWS) are sometimes rate-limited by YouTube; if you see
 * `YouTubeTranscriptRateLimited` in production, route through a proxy.
 */
export async function getYouTubeTranscript({
  videoUrl,
  lang = 'en',
}: YouTubeTranscriptOptions): Promise<YouTubeTranscriptResult> {
  const videoId = extractVideoId(videoUrl);

  try {
    const segments = await fetchTranscript(videoId, {
      lang,
      retries: 2,
      retryDelay: 1000,
    });

    if (!segments.length) {
      throw new ApiError(
        'No transcript available for this video',
        'YOUTUBE_TRANSCRIPT_EMPTY',
        404
      );
    }

    const transcript = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      transcript,
      videoId,
      lang: segments[0]?.lang ?? lang,
    };
  } catch (error) {
    throw mapTranscriptError(error);
  }
}

function mapTranscriptError(error: unknown): Error {
  if (error instanceof ApiError) return error;

  if (error instanceof YoutubeTranscriptInvalidVideoIdError) {
    return new ApiError('Invalid YouTube video URL', 'YOUTUBE_TRANSCRIPT_INVALID_ID', 400);
  }
  if (error instanceof YoutubeTranscriptVideoUnavailableError) {
    return new ApiError('Video is unavailable', 'YOUTUBE_TRANSCRIPT_UNAVAILABLE', 404);
  }
  if (error instanceof YoutubeTranscriptDisabledError) {
    return new ApiError(
      'Transcripts are disabled for this video',
      'YOUTUBE_TRANSCRIPT_DISABLED',
      404
    );
  }
  if (error instanceof YoutubeTranscriptNotAvailableError) {
    return new ApiError(
      'No transcript available for this video',
      'YOUTUBE_TRANSCRIPT_NOT_AVAILABLE',
      404
    );
  }
  if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return new ApiError(
      'Transcript not available in the requested language',
      'YOUTUBE_TRANSCRIPT_LANG_UNAVAILABLE',
      404
    );
  }
  if (error instanceof YoutubeTranscriptTooManyRequestError) {
    return new ApiError(
      'YouTube rate limit exceeded — please try again later',
      'YOUTUBE_TRANSCRIPT_RATE_LIMIT',
      429
    );
  }

  if (error instanceof Error) return error;
  return new Error('Failed to extract transcript');
}

/**
 * Extract a YouTube video ID from various URL formats. Returns the input
 * unchanged if it already looks like a bare 11-character video ID.
 */
function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return url;
}
