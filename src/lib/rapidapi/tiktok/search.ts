import { rapidApiFetch } from '../client';
import {
  TIKTOK_HOST,
  mapVideoItem,
  type TikTokApiEnvelope,
  type TikTokApiVideoItem,
  type TikTokVideo,
} from './shared';

/** Search results share the common video shape. */
export type TikTokSearchResult = TikTokVideo;

export interface TikTokSearchOptions {
  userId: string;
  keyword: string;
  cursor?: number;
  count?: number;
}

type TikTokApiSearchResponse = TikTokApiEnvelope<{
  videos?: TikTokApiVideoItem[];
  cursor?: number;
  hasMore?: boolean;
}>;

export async function searchTikTok({
  userId,
  keyword,
  cursor = 0,
  count = 30,
}: TikTokSearchOptions): Promise<TikTokSearchResult[]> {
  const response = await rapidApiFetch<TikTokApiSearchResponse>(userId, {
    host: TIKTOK_HOST,
    endpoint: '/feed/search',
    params: {
      keywords: keyword,
      region: 'us',
      count: count.toString(),
      cursor: cursor.toString(),
      // 0 = all time, 0 = relevance. Matches the provider's defaults.
      publish_time: '0',
      sort_type: '0',
    },
  });

  return (response.data?.videos || []).map(mapVideoItem);
}
