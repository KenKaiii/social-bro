import { rapidApiFetch } from '../client';

const TIKTOK_HOST = 'tiktok-api23.p.rapidapi.com';

// User Info types
export interface TikTokUserInfo {
  secUid: string;
  username: string;
  nickname: string;
  avatar: string;
  followers: number;
  following: number;
  likes: number;
  videos: number;
}

interface TikTokApiUserInfoResponse {
  status_code?: number;
  userInfo?: {
    user?: {
      secUid: string;
      uniqueId: string;
      nickname: string;
      avatarThumb: string;
    };
    stats?: {
      followerCount: number;
      followingCount: number;
      heartCount: number;
      videoCount: number;
    };
  };
}

export async function getUserInfo(
  userId: string,
  username: string
): Promise<TikTokUserInfo | null> {
  const response = await rapidApiFetch<TikTokApiUserInfoResponse>(userId, {
    host: TIKTOK_HOST,
    endpoint: '/api/user/info',
    params: {
      uniqueId: username,
    },
  });

  if (!response.userInfo?.user) {
    return null;
  }

  const { user, stats } = response.userInfo;

  return {
    secUid: user.secUid,
    username: user.uniqueId,
    nickname: user.nickname,
    avatar: user.avatarThumb,
    followers: stats?.followerCount || 0,
    following: stats?.followingCount || 0,
    likes: stats?.heartCount || 0,
    videos: stats?.videoCount || 0,
  };
}

export interface TikTokUserPost {
  id: string;
  description: string;
  thumbnail: string;
  duration: number;
  videoUrl: string;
  author: {
    username: string;
    nickname: string;
    secUid: string;
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

export interface TikTokUserPostsOptions {
  userId: string;
  secUid: string;
  count?: number;
  cursor?: number;
}

interface TikTokApiUserPost {
  id: string;
  desc: string;
  createTime: number;
  author?: {
    uniqueId: string;
    nickname: string;
    secUid: string;
  };
  stats?: {
    playCount: number;
    diggCount: number;
    commentCount: number;
    shareCount: number;
    collectCount: number;
  };
  video?: {
    cover: string;
    duration: number;
  };
}

interface TikTokApiUserPostsResponse {
  data?: {
    itemList?: TikTokApiUserPost[];
    cursor?: number;
    hasMore?: boolean;
  };
  status_code?: number;
}

export async function getUserPosts({
  userId,
  secUid,
  count = 35,
  cursor = 0,
}: TikTokUserPostsOptions): Promise<TikTokUserPost[]> {
  // NOTE: the provider's /api/user/popular-posts endpoint returns 204 No Content
  // as of Aug 2026, so we fetch the user's posts and rank them by play count here.
  const response = await rapidApiFetch<TikTokApiUserPostsResponse>(userId, {
    host: TIKTOK_HOST,
    endpoint: '/api/user/posts',
    params: {
      secUid,
      count: count.toString(),
      cursor: cursor.toString(),
    },
  });

  const items = (response.data?.itemList || [])
    .slice()
    .sort((a, b) => (b.stats?.playCount || 0) - (a.stats?.playCount || 0))
    .slice(0, count);

  return items.map((video) => ({
    id: video.id,
    description: video.desc || '',
    thumbnail: video.video?.cover || '',
    duration: video.video?.duration || 0,
    videoUrl: `https://www.tiktok.com/@${video.author?.uniqueId || ''}/video/${video.id}`,
    author: {
      username: video.author?.uniqueId || '',
      nickname: video.author?.nickname || '',
      secUid: video.author?.secUid || '',
    },
    stats: {
      plays: video.stats?.playCount || 0,
      likes: video.stats?.diggCount || 0,
      comments: video.stats?.commentCount || 0,
      shares: video.stats?.shareCount || 0,
      saves: video.stats?.collectCount || 0,
    },
    createdAt: new Date(video.createTime * 1000).toISOString(),
  }));
}
