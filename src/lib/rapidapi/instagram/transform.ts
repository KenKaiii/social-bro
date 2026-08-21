import type { InstagramTableData } from '@/types';
import type { InstagramReel } from './user';
import { calculateEngagement } from '@/lib/utils';

/**
 * Transform Instagram reels to table data format
 */
export function transformReelsToTableData(reels: InstagramReel[]): InstagramTableData[] {
  return reels.map((reel) => ({
    id: reel.id,
    username: reel.username,
    title: reel.caption || 'Instagram Reel',
    views: reel.playCount,
    likes: reel.likeCount,
    comments: reel.commentCount,
    engagementScore: calculateEngagement(reel.playCount, reel.likeCount, reel.commentCount),
    url: reel.videoUrl,
    thumbnail: reel.thumbnail,
    publishedAt: reel.createdAt || undefined,
  }));
}
