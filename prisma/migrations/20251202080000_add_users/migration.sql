-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "inviteToken" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouTubeConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxResults" INTEGER NOT NULL DEFAULT 25,
    "dateRange" TEXT NOT NULL DEFAULT 'any',
    "region" TEXT NOT NULL DEFAULT 'US',
    "videoDuration" TEXT NOT NULL DEFAULT 'any',
    "order" TEXT NOT NULL DEFAULT 'relevance',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouTubeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_inviteToken_idx" ON "User"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeConfig_userId_key" ON "YouTubeConfig"("userId");

-- Add userId column to Search (NOT NULL since no existing data)
ALTER TABLE "Search" ADD COLUMN "userId" TEXT NOT NULL;

-- Add userId column to SavedSearch
ALTER TABLE "SavedSearch" ADD COLUMN "userId" TEXT NOT NULL;

-- Add userId column to SavedItem
ALTER TABLE "SavedItem" ADD COLUMN "userId" TEXT NOT NULL;

-- Add userId column to ApiKey
ALTER TABLE "ApiKey" ADD COLUMN "userId" TEXT NOT NULL;

-- Add indexes for userId columns
CREATE INDEX "Search_userId_idx" ON "Search"("userId");
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");
CREATE INDEX "SavedItem_userId_idx" ON "SavedItem"("userId");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- Drop existing unique constraints that need to be updated
DROP INDEX IF EXISTS "SavedSearch_query_platform_key";
DROP INDEX IF EXISTS "SavedItem_externalId_platform_key";
DROP INDEX IF EXISTS "ApiKey_service_key";

-- Add new unique constraints that include userId
CREATE UNIQUE INDEX "SavedSearch_userId_query_platform_key" ON "SavedSearch"("userId", "query", "platform");
CREATE UNIQUE INDEX "SavedItem_userId_externalId_platform_key" ON "SavedItem"("userId", "externalId", "platform");
CREATE UNIQUE INDEX "ApiKey_userId_service_key" ON "ApiKey"("userId", "service");

-- AddForeignKey
ALTER TABLE "YouTubeConfig" ADD CONSTRAINT "YouTubeConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
