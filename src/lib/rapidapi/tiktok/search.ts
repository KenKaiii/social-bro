import { rapidApiFetch } from '../client';

const TIKTOK_HOST = 'tiktok-api23.p.rapidapi.com';

export interface TikTokSearchResult {
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

export interface TikTokSearchOptions {
  userId: string;
  keyword: string;
  cursor?: number;
}

interface TikTokApiVideoItem {
  id: string;
  desc: string;
  createTime: number;
  author?: {
    uniqueId: string;
    nickname: string;
    avatarThumb: string;
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
    playAddr: string;
  };
}

interface TikTokApiSearchResponse {
  status_code?: number;
  item_list?: TikTokApiVideoItem[];
  cursor?: number;
  has_more?: boolean;
  search_id?: string;
}

export async function searchTikTok({
  userId,
  keyword,
  cursor = 0,
}: TikTokSearchOptions): Promise<TikTokSearchResult[]> {
  const response = await rapidApiFetch<TikTokApiSearchResponse>(userId, {
    host: TIKTOK_HOST,
    endpoint: '/api/search/video',
    params: {
      keyword,
      cursor: cursor.toString(),
      search_id: '0',
    },
  });

  if (!response.item_list?.length) {
    return [];
  }

  return response.item_list.map((video) => ({
    id: video.id,
    description: video.desc || '',
    thumbnail: video.video?.cover || '',
    duration: video.video?.duration || 0,
    videoUrl: `https://www.tiktok.com/@${video.author?.uniqueId || ''}/video/${video.id}`,
    author: {
      username: video.author?.uniqueId || '',
      nickname: video.author?.nickname || '',
      avatar: video.author?.avatarThumb || '',
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
