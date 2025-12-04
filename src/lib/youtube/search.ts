import { youtubeApiFetch, YouTubeApiSearchResponse } from './client';
import { decodeHtmlEntities } from '../utils';

export interface YouTubeSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  videoUrl: string;
}

export interface YouTubeSearchOptions {
  userId: string;
  query: string;
  maxResults?: number;
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'viewCount';
  type?: 'video' | 'channel' | 'playlist';
  regionCode?: string;
  publishedAfter?: string;
  videoDuration?: 'any' | 'short' | 'medium' | 'long';
}

export async function searchYouTube({
  userId,
  query,
  maxResults = 25,
  order = 'relevance',
  type = 'video',
  regionCode,
  publishedAfter,
  videoDuration,
}: YouTubeSearchOptions): Promise<YouTubeSearchResult[]> {
  const response = await youtubeApiFetch<YouTubeApiSearchResponse>(userId, '/search', {
    part: 'snippet',
    q: query,
    maxResults,
    order,
    type,
    regionCode,
    publishedAfter,
    videoDuration: videoDuration !== 'any' ? videoDuration : undefined,
  });

  const items = response.items || [];

  return items.map((item) => ({
    id: item.id?.videoId || item.id?.channelId || item.id?.playlistId || '',
    title: decodeHtmlEntities(item.snippet?.title || ''),
    description: decodeHtmlEntities(item.snippet?.description || ''),
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      '',
    channelTitle: decodeHtmlEntities(item.snippet?.channelTitle || ''),
    publishedAt: item.snippet?.publishedAt || '',
    videoUrl: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : '',
  }));
}
