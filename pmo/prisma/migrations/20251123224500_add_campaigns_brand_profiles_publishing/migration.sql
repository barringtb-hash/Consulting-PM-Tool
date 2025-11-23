-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BrandAssetType" AS ENUM ('LOGO', 'IMAGE', 'TEMPLATE', 'DOCUMENT', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "PublishingPlatform" AS ENUM ('LINKEDIN', 'TWITTER', 'INSTAGRAM', 'FACEBOOK');

-- AlterTable
ALTER TABLE "MarketingContent" ADD COLUMN     "campaignId" INTEGER,
ADD COLUMN     "publishingConnectionId" INTEGER,
ADD COLUMN     "publishedUrl" TEXT,
ADD COLUMN     "publishError" TEXT,
ADD COLUMN     "lastPublishAttempt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goals" JSONB,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "clientId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "fonts" JSONB,
    "toneVoiceGuidelines" TEXT,
    "valueProposition" TEXT,
    "targetAudience" TEXT,
    "keyMessages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" SERIAL NOT NULL,
    "brandProfileId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BrandAssetType" NOT NULL DEFAULT 'OTHER',
    "url" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishingConnection" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "platform" "PublishingPlatform" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishingConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_clientId_status_idx" ON "Campaign"("clientId", "status");

-- CreateIndex
CREATE INDEX "Campaign_status_startDate_idx" ON "Campaign"("status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_clientId_key" ON "BrandProfile"("clientId");

-- CreateIndex
CREATE INDEX "BrandAsset_brandProfileId_type_idx" ON "BrandAsset"("brandProfileId", "type");

-- CreateIndex
CREATE INDEX "PublishingConnection_clientId_platform_idx" ON "PublishingConnection"("clientId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "PublishingConnection_clientId_platform_accountName_key" ON "PublishingConnection"("clientId", "platform", "accountName");

-- CreateIndex
CREATE INDEX "MarketingContent_campaignId_idx" ON "MarketingContent"("campaignId");

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_publishingConnectionId_fkey" FOREIGN KEY ("publishingConnectionId") REFERENCES "PublishingConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishingConnection" ADD CONSTRAINT "PublishingConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
