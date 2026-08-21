-- Baseline the four tables that were created with `prisma db push` and never
-- had a migration: RepurposeVideo, Script, LlmModel and UserSettings, plus two
-- indexes added the same way.
--
-- Without this, `prisma migrate deploy` against a fresh database produces a
-- schema that is missing a third of the app. Every statement is IF NOT EXISTS
-- so it is a no-op on the existing production database, where these objects
-- already exist.
-- CreateTable
CREATE TABLE IF NOT EXISTS "RepurposeVideo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "url" TEXT NOT NULL,
    "creatorId" TEXT,
    "creatorName" TEXT,
    "viewCount" BIGINT,
    "likeCount" BIGINT,
    "commentCount" BIGINT,
    "publishedAt" TIMESTAMP(3),
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepurposeVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LlmModel" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "promptPrice" DOUBLE PRECISION NOT NULL,
    "completionPrice" DOUBLE PRECISION NOT NULL,
    "contextLength" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectedModelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Script" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "script" TEXT NOT NULL,
    "repurposedScript" TEXT,
    "hooks" JSONB,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceUrl" TEXT,
    "repurposeVideoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RepurposeVideo_userId_idx" ON "RepurposeVideo"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RepurposeVideo_platform_idx" ON "RepurposeVideo"("platform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RepurposeVideo_savedAt_idx" ON "RepurposeVideo"("savedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RepurposeVideo_userId_externalId_platform_key" ON "RepurposeVideo"("userId", "externalId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LlmModel_modelId_key" ON "LlmModel"("modelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LlmModel_provider_idx" ON "LlmModel"("provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LlmModel_modelId_idx" ON "LlmModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Script_userId_idx" ON "Script"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Script_status_idx" ON "Script"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Script_createdAt_idx" ON "Script"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Script_repurposeVideoId_idx" ON "Script"("repurposeVideoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Script_sourceUrl_userId_idx" ON "Script"("sourceUrl", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SavedSearchResult_externalId_idx" ON "SavedSearchResult"("externalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SearchResult_searchId_idx" ON "SearchResult"("searchId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "RepurposeVideo" ADD CONSTRAINT "RepurposeVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Script" ADD CONSTRAINT "Script_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Script" ADD CONSTRAINT "Script_repurposeVideoId_fkey" FOREIGN KEY ("repurposeVideoId") REFERENCES "RepurposeVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

