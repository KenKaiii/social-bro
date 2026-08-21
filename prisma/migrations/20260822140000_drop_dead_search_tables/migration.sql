-- Drop the dead `Search` / `SearchResult` tables.
--
-- These were an earlier design for server-side search history. Nothing in the
-- application reads or writes them: recent searches are kept in localStorage
-- (components/search/PreviousSearches.tsx) and bookmarked searches live in
-- SavedSearch / SavedSearchResult. Verified by grep across src/ excluding the
-- generated Prisma client, which contains a model file for every model in the
-- schema whether or not it is used.
--
-- DROP TABLE is irreversible, and this migration will run against a production
-- database whose contents were not inspected. So it refuses to destroy data:
-- if either table still holds rows, it raises and the whole migration rolls
-- back, leaving the tables intact. In that case, export the rows, delete them
-- deliberately, and re-run.
DO $$
DECLARE
  search_rows bigint;
  result_rows bigint;
BEGIN
  SELECT count(*) INTO search_rows FROM "Search";
  SELECT count(*) INTO result_rows FROM "SearchResult";

  IF search_rows > 0 OR result_rows > 0 THEN
    RAISE EXCEPTION
      'Refusing to drop non-empty tables: "Search" has % row(s), "SearchResult" has % row(s). These tables were believed unused. Export anything you need, empty them, then re-run this migration.',
      search_rows, result_rows;
  END IF;
END $$;

-- Child first: SearchResult references Search.
DROP TABLE IF EXISTS "SearchResult";
DROP TABLE IF EXISTS "Search";
