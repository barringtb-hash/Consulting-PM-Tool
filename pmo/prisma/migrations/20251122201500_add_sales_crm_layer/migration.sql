-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE_CONTACT', 'WEBSITE_DOWNLOAD', 'REFERRAL', 'LINKEDIN', 'OUTBOUND', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "ServiceInterest" AS ENUM ('STRATEGY', 'POC', 'IMPLEMENTATION', 'TRAINING', 'PMO_ADVISORY', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('NEW_LEAD', 'DISCOVERY', 'SHAPING_SOLUTION', 'PROPOSAL_SENT', 'NEGOTIATION', 'VERBAL_YES', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "MeetingCategory" AS ENUM ('SALES', 'DELIVERY', 'INTERNAL');

-- CreateTable
CREATE TABLE "InboundLead" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "website" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'OTHER',
    "serviceInterest" "ServiceInterest" NOT NULL DEFAULT 'NOT_SURE',
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "ownerUserId" INTEGER,
    "clientId" INTEGER,
    "primaryContactId" INTEGER,
    "firstResponseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundLead_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "pipelineStage" "PipelineStage",
ADD COLUMN     "pipelineValue" DECIMAL(12,2),
ADD COLUMN     "currency" TEXT DEFAULT 'USD',
ADD COLUMN     "probability" INTEGER,
ADD COLUMN     "expectedCloseDate" TIMESTAMP(3),
ADD COLUMN     "leadSource" "LeadSource",
ADD COLUMN     "lostReason" TEXT;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "category" "MeetingCategory" NOT NULL DEFAULT 'DELIVERY';

-- CreateIndex
CREATE INDEX "InboundLead_status_createdAt_idx" ON "InboundLead"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "InboundLead_ownerUserId_status_idx" ON "InboundLead"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "Project_status_pipelineStage_idx" ON "Project"("status", "pipelineStage");

-- CreateIndex
CREATE INDEX "Meeting_category_date_idx" ON "Meeting"("category", "date" DESC);

-- AddForeignKey
ALTER TABLE "InboundLead" ADD CONSTRAINT "InboundLead_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundLead" ADD CONSTRAINT "InboundLead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundLead" ADD CONSTRAINT "InboundLead_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
