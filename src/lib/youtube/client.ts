import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { ApiError, parseYouTubeError } from '@/lib/errors';
import { getCachedApiKey, setCachedApiKey } from '@/lib/cache';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export async function getYouTubeApiKey(userId: string): Promise<string> {
  // Check cache first
  const cached = getCachedApiKey(userId, 'youtube');
  if (cached) {
    return cached;
  }

  // Try to get from database for this user
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { userId_service: { userId, service: 'youtube' } },
  });

  if (apiKeyRecord) {
    try {
      const decrypted = decrypt(apiKeyRecord.key);
      setCachedApiKey(userId, 'youtube', decrypted);
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt YouTube API key:', error);
      throw new ApiError(
        'Invalid YouTube API key. Please re-enter it in Settings.',
        'YOUTUBE_KEY_INVALID',
        400
      );
    }
  }

  // Fallback to environment variable
  const envKey = process.env.YOUTUBE_API_KEY;
  if (envKey) {
    return envKey;
  }

  throw new ApiError('Add YouTube API key in Settings', 'YOUTUBE_NOT_CONFIGURED', 400);
}

// YouTube API response types
export interface YouTubeApiSearchResponse {
  items?: Array<{
    id?: {
      videoId?: string;
      channelId?: string;
      playlistId?: string;
    };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
    };
  }>;
  pageInfo?: {
    totalResults?: number;
    resultsPerPage?: number;
  };
}

export interface YouTubeApiVideosResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
      tags?: string[];
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    contentDetails?: {
      duration?: string;
    };
  }>;
}

export interface YouTubeApiChannelsResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      customUrl?: string;
      publishedAt?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
    };
    statistics?: {
      subscriberCount?: string;
      videoCount?: string;
      viewCount?: string;
    };
  }>;
}

// Generic YouTube API fetch function
export async function youtubeApiFetch<T>(
  userId: string,
  endpoint: string,
  params: Record<string, string | string[] | number | undefined>
): Promise<T> {
  const apiKey = await getYouTubeApiKey(userId);

  const url = new URL(`${YOUTUBE_API_BASE}${endpoint}`);
  url.searchParams.append('key', apiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        url.searchParams.append(key, value.join(','));
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  });

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw parseYouTubeError({
      response: {
        status: response.status,
        data: errorData,
      },
    });
  }

  return response.json() as Promise<T>;
}
