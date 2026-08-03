/**
 * Shared shapes for the tiktok-scraper7 provider.
 *
 * Its `/feed/search` and `/user/posts` endpoints return video items in an
 * identical shape, so both map through {@link mapVideoItem}.
 */
export const TIKTOK_HOST = 'tiktok-scraper7.p.rapidapi.com';

/** Provider envelope. `code` is 0 on success, -1 on a handled failure. */
export interface TikTokApiEnvelope<T> {
  code?: number;
  msg?: string;
  data?: T;
}

export interface TikTokApiAuthor {
  id?: string;
  unique_id?: string;
  nickname?: string;
  avatar?: string;
}

export interface TikTokApiVideoItem {
  video_id?: string;
  aweme_id?: string;
  title?: string;
  cover?: string;
  origin_cover?: string;
  duration?: number;
  create_time?: number;
  play_count?: number;
  digg_count?: number;
  comment_count?: number;
  share_count?: number;
  collect_count?: number;
  author?: TikTokApiAuthor;
}

export interface TikTokVideo {
  id: string;
  description: string;
  thumbnail: string;
  duration: number;
  videoUrl: string;
  author: {
    username: string;
    nickname: string;
    avatar: string;
  };
  stats: {
    plays: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  createdAt: string;
}

/**
 * Normalise a provider video item.
 *
 * `create_time` is epoch *seconds*; a missing or zero value would otherwise
 * map to 1970, so it falls back to an empty string.
 */
export function mapVideoItem(item: TikTokApiVideoItem): TikTokVideo {
  const username = item.author?.unique_id || '';
  const id = item.video_id || item.aweme_id || '';

  return {
    id,
    description: item.title || '',
    thumbnail: item.cover || item.origin_cover || '',
    duration: item.duration || 0,
    videoUrl: username && id ? `https://www.tiktok.com/@${username}/video/${id}` : '',
    author: {
      username,
      nickname: item.author?.nickname || '',
      avatar: item.author?.avatar || '',
    },
    stats: {
      plays: item.play_count || 0,
      likes: item.digg_count || 0,
      comments: item.comment_count || 0,
      shares: item.share_count || 0,
      saves: item.collect_count || 0,
    },
    createdAt: item.create_time ? new Date(item.create_time * 1000).toISOString() : '',
  };
}
