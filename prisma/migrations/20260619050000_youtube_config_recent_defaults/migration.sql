-- Default YouTube search to recent content (last month, newest first)
-- so searches surface fresh uploads instead of all-time relevance results.
ALTER TABLE "YouTubeConfig" ALTER COLUMN "dateRange" SET DEFAULT 'month';
ALTER TABLE "YouTubeConfig" ALTER COLUMN "order" SET DEFAULT 'date';
