import { rapidApiFetch } from '../client';
import {
  TIKTOK_HOST,
  mapVideoItem,
  type TikTokApiEnvelope,
  type TikTokApiVideoItem,
  type TikTokVideo,
} from './shared';

export interface TikTokUserInfo {
  /** The provider's numeric user id. */
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  followers: number;
  following: number;
  likes: number;
  videos: number;
}

type TikTokApiUserInfoResponse = TikTokApiEnvelope<{
  user?: {
    id?: string;
    uniqueId?: string;
    nickname?: string;
    avatarThumb?: string;
  };
  stats?: {
    followerCount?: number;
    followingCount?: number;
    heartCount?: number;
    videoCount?: number;
  };
}>;

/**
 * Look up a user by their `@handle`.
 *
 * Returns null when the account does not exist, which the caller surfaces as
 * a 404 rather than an empty result set.
 */
export async function getUserInfo(
  userId: string,
  username: string
): Promise<TikTokUserInfo | null> {
  const response = await rapidApiFetch<TikTokApiUserInfoResponse>(userId, {
    host: TIKTOK_HOST,
    endpoint: '/user/info',
    params: {
      // The provider tolerates a leading '@', but strip it so the cache key
      // and the value we echo back are consistent.
      unique_id: username.replace(/^@/, ''),
    },
  });

  const user = response.data?.user;
  if (response.code !== 0 || !user?.uniqueId) {
    return null;
  }

  const stats = response.data?.stats;

  return {
    id: user.id || '',
    username: user.uniqueId,
    nickname: user.nickname || '',
    avatar: user.avatarThumb || '',
    followers: stats?.followerCount || 0,
    following: stats?.followingCount || 0,
    likes: stats?.heartCount || 0,
    videos: stats?.videoCount || 0,
  };
}

/** User posts share the common video shape. */
export type TikTokUserPost = TikTokVideo;

export interface TikTokUserPostsOptions {
  userId: string;
  username: string;
  count?: number;
  cursor?: number;
}

type TikTokApiUserPostsResponse = TikTokApiEnvelope<{
  videos?: TikTokApiVideoItem[];
  cursor?: number;
  hasMore?: boolean;
}>;

export async function getUserPosts({
  userId,
  username,
  count = 30,
  cursor = 0,
}: TikTokUserPostsOptions): Promise<TikTokUserPost[]> {
  const response = await rapidApiFetch<TikTokApiUserPostsResponse>(userId, {
    host: TIKTOK_HOST,
    endpoint: '/user/posts',
    params: {
      unique_id: username.replace(/^@/, ''),
      count: count.toString(),
      cursor: cursor.toString(),
      // 1 = most popular. The provider returns these roughly, but not strictly,
      // ordered, so they are sorted below for a stable ranking.
      sort_type: '1',
    },
  });

  return (response.data?.videos || [])
    .map(mapVideoItem)
    .sort((a, b) => b.stats.plays - a.stats.plays);
}
