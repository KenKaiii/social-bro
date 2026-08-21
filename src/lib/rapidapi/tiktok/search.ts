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

/** Publish window in days the provider accepts; '0' means all time. */
export type TikTokPublishTime = '0' | '1' | '7' | '30' | '90' | '180';

/** Sort codes: relevance, like count, date posted. 2 is undefined by the API. */
export type TikTokSortType = '0' | '1' | '3';

export interface TikTokSearchOptions {
  userId: string;
  keyword: string;
  cursor?: number;
  count?: number;
  publishTime?: TikTokPublishTime;
  sortType?: TikTokSortType;
  region?: string;
}

type TikTokApiSearchResponse = TikTokApiEnvelope<{
  videos?: TikTokApiVideoItem[];
  cursor?: number;
  hasMore?: boolean;
}>;

/**
 * Search TikTok for videos worth repurposing.
 *
 * The defaults are the point: recent *and* performing. The provider's sort is
 * single-valued — you cannot sort by date and by likes at once — so recency is
 * the publish window and likes rank the results inside it.
 *
 * Measured on "claude code" (2026-08-22, 30 results):
 *   all-time + relevance -> median 27k views, floor 115, 11/30 rows under 10k
 *   30 days + likes      -> median 95k views, floor 33k,  0/30 rows under 10k
 *
 * Sorting by date posted is the trap — it ranks on recency alone, so it led
 * with an 18k-view post where sorting by likes led with 1.3M. 30 days rather
 * than 7 because niche queries go thin fast: the same search over 7 days drops
 * the median to 53k and the floor to 7k.
 *
 * `count` is the provider's per-call cap. Paging deeper is pointless anyway:
 * results are ranked globally, so page 2 of the same query fell from a 95k
 * median to 11k, and page 3 to 1.6k. Page one is the winners.
 */
export async function searchTikTok({
  userId,
  keyword,
  cursor = 0,
  count = 30,
  publishTime = '30',
  sortType = '1',
  region = 'us',
}: TikTokSearchOptions): Promise<TikTokSearchResult[]> {
  const response = await rapidApiFetch<TikTokApiSearchResponse>(userId, {
    host: TIKTOK_HOST,
    endpoint: '/feed/search',
    params: {
      keywords: keyword,
      region,
      count: count.toString(),
      cursor: cursor.toString(),
      publish_time: publishTime,
      sort_type: sortType,
    },
  });

  return (response.data?.videos || []).map(mapVideoItem);
}
