import type { TikTokTableData } from '@/types';
import type { TikTokSearchResult } from './search';
import type { TikTokUserPost } from './user';
import { calculateEngagement } from '@/lib/utils';

/**
 * Transform TikTok search results to table data format
 */
export function transformSearchResultsToTableData(
  results: TikTokSearchResult[]
): TikTokTableData[] {
  return results.map((result) => ({
    id: result.id,
    username: result.author.username,
    title: result.description,
    views: result.stats.plays,
    likes: result.stats.likes,
    comments: result.stats.comments,
    engagementScore: calculateEngagement(
      result.stats.plays,
      result.stats.likes,
      result.stats.comments
    ),
    url: result.videoUrl,
    thumbnail: result.author.avatar || result.thumbnail,
  }));
}

/**
 * Transform TikTok user posts to table data format
 */
export function transformUserPostsToTableData(posts: TikTokUserPost[]): TikTokTableData[] {
  return posts.map((post) => ({
    id: post.id,
    username: post.author.username,
    title: post.description,
    views: post.stats.plays,
    likes: post.stats.likes,
    comments: post.stats.comments,
    engagementScore: calculateEngagement(post.stats.plays, post.stats.likes, post.stats.comments),
    url: post.videoUrl,
    thumbnail: post.author.avatar || post.thumbnail,
  }));
}
