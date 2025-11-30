import type { Platform, YouTubeTableData } from '@/types';
import type {
  YouTubeSearchResult,
  YouTubeVideoDetails,
  YouTubeChannelDetails,
} from './youtube';
import { calculateEngagement } from './utils';

export interface ChannelVideosResponse {
  channel: YouTubeChannelDetails;
  videos: YouTubeSearchResult[];
  videoDetails: YouTubeVideoDetails[];
}

export interface SearchResponse {
  results: YouTubeSearchResult[];
}

export async function searchPlatform(
  platform: Platform,
  query: string
): Promise<SearchResponse> {
  switch (platform) {
    case 'youtube': {
      const response = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(query)}&type=video`
      );
      if (!response.ok) {
        throw new Error('Failed to search YouTube');
      }
      return response.json();
    }
    case 'instagram':
    case 'tiktok':
      // TODO: Implement Instagram and TikTok search
      return { results: [] };
    default:
      return { results: [] };
  }
}

export async function getVideoDetails(
  videoIds: string[]
): Promise<YouTubeVideoDetails[]> {
  const response = await fetch(
    `/api/youtube/videos?ids=${videoIds.join(',')}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch video details');
  }
  const data = await response.json();
  return data.videos;
}

/**
 * Check if query is a @username pattern
 */
export function isUsernameQuery(query: string): boolean {
  return query.trim().startsWith('@');
}

/**
 * Extract username from @username query
 */
export function extractUsername(query: string): string {
  return query.trim().replace(/^@/, '');
}

/**
 * Fetch videos from a specific YouTube channel by username
 */
export async function getChannelVideosWithDetails(
  username: string
): Promise<YouTubeTableData[]> {
  const response = await fetch(
    `/api/youtube/channel?username=${encodeURIComponent(username)}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error('Failed to fetch channel videos');
  }

  const { channel, videos, videoDetails } =
    (await response.json()) as ChannelVideosResponse;

  // Create a map for quick lookup
  const detailsMap = new Map(videoDetails.map((d) => [d.id, d]));

  // Combine video results with details
  return videos.map((video: YouTubeSearchResult) => {
    const detail = detailsMap.get(video.id);
    const views = parseInt(detail?.viewCount || '0', 10);
    const likes = parseInt(detail?.likeCount || '0', 10);
    const comments = parseInt(detail?.commentCount || '0', 10);

    return {
      id: video.id,
      username: channel.title,
      title: video.title,
      views,
      likes,
      comments,
      engagementScore: calculateEngagement(views, likes, comments),
      url: video.videoUrl,
      thumbnail: channel.thumbnail,
    };
  });
}

export async function searchYouTubeWithDetails(
  query: string
): Promise<YouTubeTableData[]> {
  // Check if this is a @username query
  if (isUsernameQuery(query)) {
    const username = extractUsername(query);
    return getChannelVideosWithDetails(username);
  }

  // First, search for videos
  const searchResponse = await fetch(
    `/api/youtube/search?q=${encodeURIComponent(query)}&type=video`
  );
  if (!searchResponse.ok) {
    throw new Error('Failed to search YouTube');
  }
  const { results } = await searchResponse.json();

  if (results.length === 0) return [];

  // Then, fetch video details for stats
  const videoIds = results.map((r: YouTubeSearchResult) => r.id);
  const details = await getVideoDetails(videoIds);

  // Create a map for quick lookup
  const detailsMap = new Map(details.map((d) => [d.id, d]));

  // Combine search results with details
  return results.map((result: YouTubeSearchResult) => {
    const detail = detailsMap.get(result.id);
    const views = parseInt(detail?.viewCount || '0', 10);
    const likes = parseInt(detail?.likeCount || '0', 10);
    const comments = parseInt(detail?.commentCount || '0', 10);

    return {
      id: result.id,
      username: result.channelTitle,
      title: result.title,
      views,
      likes,
      comments,
      engagementScore: calculateEngagement(views, likes, comments),
      url: result.videoUrl,
      thumbnail: result.thumbnail,
    };
  });
}
