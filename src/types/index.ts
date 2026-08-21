export type Platform = 'youtube' | 'instagram' | 'tiktok';

export interface PlatformConfig {
  id: Platform;
  name: string;
  description: string;
  gradient: string;
  icon: string;
}

export interface YouTubeTableData {
  id: string;
  username: string;
  title: string;
  /**
   * `null` means the cached statistic expired under the 30-day retention rule
   * (see `lib/retention.ts`), not that the video has zero views. `formatNumber`
   * renders it as an em dash.
   */
  views: number | null;
  likes: number | null;
  comments: number | null;
  engagementScore: number | null;
  url: string;
  thumbnail?: string;
}

export interface TikTokTableData {
  id: string;
  username: string;
  title: string;
  /** `null` = expired cached statistic, not zero. See `YouTubeTableData`. */
  views: number | null;
  likes: number | null;
  comments: number | null;
  engagementScore: number | null;
  url: string;
  thumbnail?: string;
  /** Publish time, ISO 8601. Absent when the provider omits it. */
  publishedAt?: string;
}

export interface InstagramTableData {
  id: string;
  username: string;
  title: string;
  /** `null` = expired cached statistic, not zero. See `YouTubeTableData`. */
  views: number | null;
  likes: number | null;
  comments: number | null;
  engagementScore: number | null;
  url: string;
  thumbnail?: string;
  /** Publish time, ISO 8601. Absent when the provider omits it. */
  publishedAt?: string;
}

export interface SavedSearchWithResults {
  id: string;
  query: string;
  platform: Platform;
  createdAt: string;
  results: YouTubeTableData[];
}

export interface RepurposeVideo {
  id: string;
  externalId: string;
  platform: Platform;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  url: string;
  creatorId?: string | null;
  creatorName?: string | null;
  viewCount?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  savedAt: string;
  hasTranscript?: boolean;
}

export type ScriptStatus = 'draft' | 'in_progress' | 'completed';

export interface Script {
  id: string;
  title: string;
  caption?: string | null;
  script: string;
  repurposedScript?: string | null;
  hooks?: string[] | null;
  notes?: string | null;
  status: ScriptStatus;
  sourceUrl?: string | null;
  repurposeVideoId?: string | null;
  createdAt: string;
  updatedAt: string;
}
