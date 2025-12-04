import { rapidApiFetch } from '../client';

const YOUTUBE_TRANSCRIPT_FAST_HOST =
  'youtube-transcribe-fastest-youtube-transcriber.p.rapidapi.com';

export interface TranscriptFastOptions {
  userId: string;
  videoUrl: string;
  lang?: string;
}

export interface TranscriptFastResult {
  transcript: string;
  videoId: string;
  lang: string;
  availableLangs: string[];
}

interface TranscriptChunk {
  text: string;
  timestamp: [number, number];
}

interface TranscriptFastApiResponse {
  status: string;
  data?: {
    text: string;
    lang: string;
    available_langs: string[];
    chunks: TranscriptChunk[];
  };
  error?: string;
  message?: string;
}

/**
 * Extract transcript from a YouTube video URL using the fast transcriber API
 */
export async function getYouTubeTranscriptFast({
  userId,
  videoUrl,
  lang = 'en',
}: TranscriptFastOptions): Promise<TranscriptFastResult> {
  const videoId = extractVideoId(videoUrl);

  const response = await rapidApiFetch<TranscriptFastApiResponse>(userId, {
    host: YOUTUBE_TRANSCRIPT_FAST_HOST,
    endpoint: '/transcript',
    params: {
      url: videoUrl,
      video_id: videoId,
      lang,
    },
  });

  if (response.status !== 'success' || !response.data) {
    throw new Error(response.error || response.message || 'Failed to extract transcript');
  }

  if (!response.data.text) {
    throw new Error('No transcript available for this video');
  }

  return {
    transcript: response.data.text,
    videoId,
    lang: response.data.lang,
    availableLangs: response.data.available_langs,
  };
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID itself
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return url; // Return as-is if no pattern matches
}
