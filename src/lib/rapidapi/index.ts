export { getRapidApiKey, rapidApiFetch, type RapidApiRequestOptions } from './client';

// TikTok
export {
  searchTikTok,
  getUserInfo,
  getUserPosts,
  transformSearchResultsToTableData,
  transformUserPostsToTableData,
  type TikTokSearchResult,
  type TikTokSearchOptions,
  type TikTokUserInfo,
  type TikTokUserPost,
  type TikTokUserPostsOptions,
} from './tiktok';

// Instagram
export {
  searchInstagram,
  getUserReels,
  transformReelsToTableData,
  type InstagramSearchUser,
  type InstagramSearchOptions,
  type InstagramUserInfo,
  type InstagramReel,
  type InstagramUserReelsOptions,
} from './instagram';
