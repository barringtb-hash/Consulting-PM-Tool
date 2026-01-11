-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BLOG_POST', 'CASE_STUDY', 'LINKEDIN_POST', 'TWITTER_POST', 'EMAIL_TEMPLATE', 'WHITEPAPER', 'SOCIAL_STORY', 'VIDEO_SCRIPT', 'NEWSLETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('IDEA', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'READY', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentChannel" AS ENUM ('WEB', 'LINKEDIN', 'INSTAGRAM', 'TWITTER', 'EMAIL', 'GENERIC');

-- CreateTable
CREATE TABLE "MarketingContent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "type" "ContentType" NOT NULL,
    "channel" "ContentChannel",
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB,
    "summary" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "sourceMeetingId" INTEGER,
    "createdById" INTEGER,
    "sourceContentId" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingContent_slug_key" ON "MarketingContent"("slug");

-- CreateIndex
CREATE INDEX "MarketingContent_clientId_type_idx" ON "MarketingContent"("clientId", "type");

-- CreateIndex
CREATE INDEX "MarketingContent_status_createdAt_idx" ON "MarketingContent"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MarketingContent_projectId_idx" ON "MarketingContent"("projectId");

-- CreateIndex
CREATE INDEX "MarketingContent_slug_idx" ON "MarketingContent"("slug");

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_sourceMeetingId_fkey" FOREIGN KEY ("sourceMeetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_sourceContentId_fkey" FOREIGN KEY ("sourceContentId") REFERENCES "MarketingContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
