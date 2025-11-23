-- AlterEnum
ALTER TYPE "ContentStatus" ADD VALUE 'IDEA';
ALTER TYPE "ContentStatus" ADD VALUE 'READY';

-- CreateEnum
CREATE TYPE "ContentChannel" AS ENUM ('WEB', 'LINKEDIN', 'INSTAGRAM', 'TWITTER', 'EMAIL', 'GENERIC');

-- AlterTable
ALTER TABLE "MarketingContent" ADD COLUMN "slug" TEXT,
ADD COLUMN "channel" "ContentChannel",
ADD COLUMN "sourceContentId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "MarketingContent_slug_key" ON "MarketingContent"("slug");

-- CreateIndex
CREATE INDEX "MarketingContent_slug_idx" ON "MarketingContent"("slug");

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_sourceContentId_fkey" FOREIGN KEY ("sourceContentId") REFERENCES "MarketingContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
