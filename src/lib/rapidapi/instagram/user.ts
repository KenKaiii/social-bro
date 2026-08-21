import { rapidApiFetch } from '../client';

const INSTAGRAM_HOST = 'instagram-looter2.p.rapidapi.com';

export interface InstagramUserInfo {
  pk: string;
  username: string;
  fullName: string;
  isVerified: boolean;
  profilePicUrl: string;
}

export interface InstagramReel {
  id: string;
  code: string;
  caption: string;
  thumbnail: string;
  playCount: number;
  likeCount: number;
  commentCount: number;
  videoDuration: number;
  videoUrl: string;
  username: string;
  /** Publish time, ISO 8601. Empty when the provider omits it. */
  createdAt: string;
}

interface InstagramApiReelMedia {
  pk: string;
  id: string;
  code: string;
  play_count?: number;
  ig_play_count?: number;
  like_count?: number;
  comment_count?: number;
  video_duration?: number;
  /** Epoch seconds. */
  taken_at?: number;
  caption?: {
    text?: string;
  };
  image_versions2?: {
    candidates?: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  user?: {
    username: string;
    full_name: string;
    pk: string;
  };
}

interface InstagramApiReelsItem {
  media: InstagramApiReelMedia;
}

interface InstagramApiReelsResponse {
  items?: InstagramApiReelsItem[];
  paging_info?: {
    max_id?: string;
    more_available?: boolean;
  };
}

export interface InstagramUserReelsOptions {
  userId: string;
  userPk: string;
  count?: number;
}

export async function getUserReels({
  userId,
  userPk,
  count = 12,
}: InstagramUserReelsOptions): Promise<InstagramReel[]> {
  const response = await rapidApiFetch<InstagramApiReelsResponse>(userId, {
    host: INSTAGRAM_HOST,
    endpoint: '/reels',
    params: {
      id: userPk,
      count: count.toString(),
    },
  });

  const items = response.items || [];

  return items.map((item) => {
    const media = item.media;
    const thumbnail = media.image_versions2?.candidates?.[0]?.url || '';

    return {
      id: media.pk || media.id,
      code: media.code,
      caption: media.caption?.text || '',
      thumbnail,
      playCount: media.play_count || media.ig_play_count || 0,
      likeCount: media.like_count || 0,
      commentCount: media.comment_count || 0,
      videoDuration: media.video_duration || 0,
      videoUrl: `https://www.instagram.com/reel/${media.code}/`,
      username: media.user?.username || '',
      // Epoch *seconds*; a missing or zero value would map to 1970.
      createdAt: media.taken_at ? new Date(media.taken_at * 1000).toISOString() : '',
    };
  });
}
