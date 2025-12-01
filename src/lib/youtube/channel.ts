import { getYouTubeClient } from './client';
import type { YouTubeSearchResult } from './search';
import { decodeHtmlEntities } from '../utils';

export interface YouTubeChannelDetails {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  publishedAt: string;
}

export async function getChannelDetails(
  userId: string,
  channelId: string
): Promise<YouTubeChannelDetails | null> {
  const youtube = await getYouTubeClient(userId);
  const response = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    id: [channelId],
  });

  const item = response.data.items?.[0];
  if (!item) return null;

  return {
    id: item.id || '',
    title: decodeHtmlEntities(item.snippet?.title || ''),
    description: decodeHtmlEntities(item.snippet?.description || ''),
    customUrl: item.snippet?.customUrl || '',
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      '',
    subscriberCount: item.statistics?.subscriberCount || '0',
    videoCount: item.statistics?.videoCount || '0',
    viewCount: item.statistics?.viewCount || '0',
    publishedAt: item.snippet?.publishedAt || '',
  };
}

export async function getChannelByUsername(
  userId: string,
  username: string
): Promise<YouTubeChannelDetails | null> {
  const youtube = await getYouTubeClient(userId);
  const response = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    forHandle: username,
  });

  const item = response.data.items?.[0];
  if (!item) return null;

  return {
    id: item.id || '',
    title: decodeHtmlEntities(item.snippet?.title || ''),
    description: decodeHtmlEntities(item.snippet?.description || ''),
    customUrl: item.snippet?.customUrl || '',
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      '',
    subscriberCount: item.statistics?.subscriberCount || '0',
    videoCount: item.statistics?.videoCount || '0',
    viewCount: item.statistics?.viewCount || '0',
    publishedAt: item.snippet?.publishedAt || '',
  };
}

export async function getChannelVideos(
  userId: string,
  channelId: string,
  maxResults: number = 25
): Promise<YouTubeSearchResult[]> {
  const youtube = await getYouTubeClient(userId);
  const response = await youtube.search.list({
    part: ['snippet'],
    channelId,
    maxResults,
    order: 'date',
    type: ['video'],
  });

  const items = response.data.items || [];

  return items.map((item) => ({
    id: item.id?.videoId || '',
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

export async function getChannelVideosByUsername(
  userId: string,
  username: string,
  maxResults: number = 25
): Promise<{ channel: YouTubeChannelDetails | null; videos: YouTubeSearchResult[] }> {
  const channel = await getChannelByUsername(userId, username);

  if (!channel) {
    return { channel: null, videos: [] };
  }

  const videos = await getChannelVideos(userId, channel.id, maxResults);

  return { channel, videos };
}
