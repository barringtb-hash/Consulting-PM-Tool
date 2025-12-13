-- Add tenant isolation to remaining legacy PMO models
-- This migration adds tenantId to Task, Milestone, Meeting, AIAsset,
-- MarketingContent, Campaign, and InboundLead tables

-- Add tenantId column to Task table
ALTER TABLE "Task" ADD COLUMN "tenantId" TEXT;

-- Add tenantId column to Milestone table
ALTER TABLE "Milestone" ADD COLUMN "tenantId" TEXT;

-- Add tenantId column to Meeting table
ALTER TABLE "Meeting" ADD COLUMN "tenantId" TEXT;

-- Add tenantId column to AIAsset table
ALTER TABLE "AIAsset" ADD COLUMN "tenantId" TEXT;

-- Add tenantId column to MarketingContent table
ALTER TABLE "MarketingContent" ADD COLUMN "tenantId" TEXT;

-- Add tenantId column to Campaign table
ALTER TABLE "Campaign" ADD COLUMN "tenantId" TEXT;

-- Add tenantId column to InboundLead table
ALTER TABLE "InboundLead" ADD COLUMN "tenantId" TEXT;

-- Create indexes for tenant-scoped queries
CREATE INDEX "Task_tenantId_idx" ON "Task"("tenantId");
CREATE INDEX "Milestone_tenantId_idx" ON "Milestone"("tenantId");
CREATE INDEX "Meeting_tenantId_idx" ON "Meeting"("tenantId");
CREATE INDEX "AIAsset_tenantId_idx" ON "AIAsset"("tenantId");
CREATE INDEX "MarketingContent_tenantId_idx" ON "MarketingContent"("tenantId");
CREATE INDEX "Campaign_tenantId_idx" ON "Campaign"("tenantId");
CREATE INDEX "InboundLead_tenantId_idx" ON "InboundLead"("tenantId");

-- Note: Foreign key constraints to Tenant table are not added here
-- because the Tenant table may be managed separately via db push.
-- The application layer enforces tenant isolation through middleware.
