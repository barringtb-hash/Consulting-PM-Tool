-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PENDING', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'PARTIALLY_PUBLISHED');

-- CreateEnum
CREATE TYPE "ContentPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterEnum - Add new platforms
ALTER TYPE "PublishingPlatform" ADD VALUE IF NOT EXISTS 'TIKTOK';
ALTER TYPE "PublishingPlatform" ADD VALUE IF NOT EXISTS 'THREADS';
ALTER TYPE "PublishingPlatform" ADD VALUE IF NOT EXISTS 'PINTEREST';
ALTER TYPE "PublishingPlatform" ADD VALUE IF NOT EXISTS 'YOUTUBE';
ALTER TYPE "PublishingPlatform" ADD VALUE IF NOT EXISTS 'BLUESKY';

-- AlterTable - Add brand voice fields to ContentGeneratorConfig
ALTER TABLE "ContentGeneratorConfig" ADD COLUMN IF NOT EXISTS "brandVoiceProfile" JSONB;
ALTER TABLE "ContentGeneratorConfig" ADD COLUMN IF NOT EXISTS "lastVoiceAnalysis" TIMESTAMP(3);
ALTER TABLE "ContentGeneratorConfig" ADD COLUMN IF NOT EXISTS "voiceTrainingStatus" TEXT;

-- AlterTable - Add tenant and integration fields to PublishingConnection
ALTER TABLE "PublishingConnection" ADD COLUMN IF NOT EXISTS "integrationType" TEXT DEFAULT 'unified';
ALTER TABLE "PublishingConnection" ADD COLUMN IF NOT EXISTS "lastRefreshedAt" TIMESTAMP(3);
ALTER TABLE "PublishingConnection" ADD COLUMN IF NOT EXISTS "refreshError" TEXT;
ALTER TABLE "PublishingConnection" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PublishingConnection" ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SocialPublishingConfig" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ayrshare',
    "apiKey" TEXT NOT NULL,
    "profileKey" TEXT,
    "connectedPlatforms" JSONB NOT NULL DEFAULT '[]',
    "defaultTimezone" TEXT NOT NULL DEFAULT 'UTC',
    "autoHashtags" BOOLEAN NOT NULL DEFAULT false,
    "shortenUrls" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPublishingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SocialMediaPost" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "contentId" INTEGER,
    "text" TEXT NOT NULL,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkUrl" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetPlatforms" "PublishingPlatform"[],
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "platformResults" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "connectionId" INTEGER,

    CONSTRAINT "SocialMediaPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PublishingHistory" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "postId" INTEGER NOT NULL,
    "platform" "PublishingPlatform" NOT NULL,
    "externalPostId" TEXT,
    "postUrl" TEXT,
    "status" "PublishStatus" NOT NULL,
    "error" TEXT,
    "impressions" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "clicks" INTEGER,
    "lastMetricSync" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentScheduleQueue" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "contentId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "priority" "ContentPriority" NOT NULL DEFAULT 'NORMAL',
    "autoSchedule" BOOLEAN NOT NULL DEFAULT false,
    "targetDateStart" TIMESTAMP(3),
    "targetDateEnd" TIMESTAMP(3),
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentScheduleQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentScheduleHistory" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "contentId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "engagementScore" DOUBLE PRECISION,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "likes" INTEGER,
    "shares" INTEGER,
    "comments" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentScheduleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OptimalTimeConfiguration" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "platform" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimalTimeConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentIdea" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "configId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentType" TEXT NOT NULL,
    "suggestedPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ideaSource" TEXT NOT NULL,
    "sourceData" JSONB,
    "relevanceScore" DOUBLE PRECISION,
    "reasoning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "generatedContentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentFeedback" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "configId" INTEGER NOT NULL,
    "contentId" INTEGER NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "feedbackNotes" TEXT,
    "originalContent" TEXT,
    "editedContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SocialPublishingConfig_tenantId_key" ON "SocialPublishingConfig"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SocialMediaPost_tenantId_status_idx" ON "SocialMediaPost"("tenantId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SocialMediaPost_scheduledFor_idx" ON "SocialMediaPost"("scheduledFor");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SocialMediaPost_status_nextRetryAt_idx" ON "SocialMediaPost"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PublishingHistory_postId_idx" ON "PublishingHistory"("postId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PublishingHistory_tenantId_platform_idx" ON "PublishingHistory"("tenantId", "platform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PublishingHistory_publishedAt_idx" ON "PublishingHistory"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ContentScheduleQueue_contentId_key" ON "ContentScheduleQueue"("contentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PublishingConnection_tenantId_platform_idx" ON "PublishingConnection"("tenantId", "platform");

-- AddForeignKey - SocialPublishingConfig
ALTER TABLE "SocialPublishingConfig" ADD CONSTRAINT "SocialPublishingConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey - SocialMediaPost
ALTER TABLE "SocialMediaPost" ADD CONSTRAINT "SocialMediaPost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SocialMediaPost" ADD CONSTRAINT "SocialMediaPost_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketingContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SocialMediaPost" ADD CONSTRAINT "SocialMediaPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SocialMediaPost" ADD CONSTRAINT "SocialMediaPost_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PublishingConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey - PublishingHistory
ALTER TABLE "PublishingHistory" ADD CONSTRAINT "PublishingHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublishingHistory" ADD CONSTRAINT "PublishingHistory_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialMediaPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey - PublishingConnection tenant
ALTER TABLE "PublishingConnection" ADD CONSTRAINT "PublishingConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
