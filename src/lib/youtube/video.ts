import { getYouTubeClient } from './client';
import { decodeHtmlEntities } from '../utils';

export interface YouTubeVideoDetails {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  duration: string;
  tags: string[];
}

export async function getVideoDetails(
  userId: string,
  videoId: string
): Promise<YouTubeVideoDetails | null> {
  const youtube = await getYouTubeClient(userId);
  const response = await youtube.videos.list({
    part: ['snippet', 'statistics', 'contentDetails'],
    id: [videoId],
  });

  const item = response.data.items?.[0];
  if (!item) return null;

  return {
    id: item.id || '',
    title: decodeHtmlEntities(item.snippet?.title || ''),
    description: decodeHtmlEntities(item.snippet?.description || ''),
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      '',
    channelId: item.snippet?.channelId || '',
    channelTitle: decodeHtmlEntities(item.snippet?.channelTitle || ''),
    publishedAt: item.snippet?.publishedAt || '',
    viewCount: item.statistics?.viewCount || '0',
    likeCount: item.statistics?.likeCount || '0',
    commentCount: item.statistics?.commentCount || '0',
    duration: item.contentDetails?.duration || '',
    tags: item.snippet?.tags || [],
  };
}

export async function getMultipleVideoDetails(
  userId: string,
  videoIds: string[]
): Promise<YouTubeVideoDetails[]> {
  const youtube = await getYouTubeClient(userId);
  const response = await youtube.videos.list({
    part: ['snippet', 'statistics', 'contentDetails'],
    id: videoIds,
  });

  const items = response.data.items || [];

  return items.map((item) => ({
    id: item.id || '',
    title: decodeHtmlEntities(item.snippet?.title || ''),
    description: decodeHtmlEntities(item.snippet?.description || ''),
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      '',
    channelId: item.snippet?.channelId || '',
    channelTitle: decodeHtmlEntities(item.snippet?.channelTitle || ''),
    publishedAt: item.snippet?.publishedAt || '',
    viewCount: item.statistics?.viewCount || '0',
    likeCount: item.statistics?.likeCount || '0',
    commentCount: item.statistics?.commentCount || '0',
    duration: item.contentDetails?.duration || '',
    tags: item.snippet?.tags || [],
  }));
}
