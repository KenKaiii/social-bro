-- Allow cached platform statistics to expire.
--
-- YouTube API Services Developer Policies III.E.4 require non-authorized
-- statistics to be deleted or refreshed within 30 calendar days. Nulling the
-- counts lets us drop the stale numbers while keeping the row the user
-- deliberately saved. NULL therefore means "expired", distinct from a real 0.
--
-- Widening NOT NULL -> NULL takes a brief ACCESS EXCLUSIVE lock but rewrites
-- no rows, so it is safe to run on a live table. Existing rows keep their
-- current values; nothing is deleted by this migration.
ALTER TABLE "SavedSearchResult"
  ALTER COLUMN "viewCount" DROP NOT NULL,
  ALTER COLUMN "viewCount" DROP DEFAULT,
  ALTER COLUMN "likeCount" DROP NOT NULL,
  ALTER COLUMN "likeCount" DROP DEFAULT,
  ALTER COLUMN "commentCount" DROP NOT NULL,
  ALTER COLUMN "commentCount" DROP DEFAULT;
