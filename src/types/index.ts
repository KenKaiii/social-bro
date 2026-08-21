export type Platform = 'youtube' | 'instagram' | 'tiktok';

export interface PlatformConfig {
  id: Platform;
  name: string;
  description: string;
  gradient: string;
  icon: string;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  channelName?: string;
  viewCount?: number;
  publishedAt?: string;
  platform: Platform;
  url: string;
}

export interface YouTubeTableData {
  id: string;
  username: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  engagementScore: number;
  url: string;
  thumbnail?: string;
}

export interface TikTokTableData {
  id: string;
  username: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  engagementScore: number;
  url: string;
  thumbnail?: string;
  /** Publish time, ISO 8601. Absent when the provider omits it. */
  publishedAt?: string;
}

export interface InstagramTableData {
  id: string;
  username: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  engagementScore: number;
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
