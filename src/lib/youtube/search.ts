import { getYouTubeClient } from './client';
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
  const youtube = await getYouTubeClient(userId);

  // Build request params
  const params: {
    part: string[];
    q: string;
    maxResults: number;
    order: string;
    type: string[];
    regionCode?: string;
    publishedAfter?: string;
    videoDuration?: string;
  } = {
    part: ['snippet'],
    q: query,
    maxResults,
    order,
    type: [type],
  };

  // Add optional parameters
  if (regionCode) {
    params.regionCode = regionCode;
  }
  if (publishedAfter) {
    params.publishedAfter = publishedAfter;
  }
  if (videoDuration && videoDuration !== 'any') {
    params.videoDuration = videoDuration;
  }

  const response = await youtube.search.list(params);

  const items = response.data.items || [];

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
