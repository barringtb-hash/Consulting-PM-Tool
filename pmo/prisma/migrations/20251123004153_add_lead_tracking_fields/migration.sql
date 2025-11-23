-- AlterTable
ALTER TABLE "InboundLead" ADD COLUMN     "page" TEXT,
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmTerm" TEXT;

-- CreateIndex
CREATE INDEX "InboundLead_source_createdAt_idx" ON "InboundLead"("source", "createdAt" DESC);
