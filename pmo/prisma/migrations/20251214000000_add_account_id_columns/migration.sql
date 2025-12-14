-- Add accountId columns to legacy PMO models for CRM Account integration
-- This migration adds accountId as the preferred field, while keeping clientId for backward compatibility

-- Add accountId column to Project table
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Add accountId column to Document table
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Add accountId column to Meeting table
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Add accountId column to AIAsset table
ALTER TABLE "AIAsset" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Add accountId column to MarketingContent table
ALTER TABLE "MarketingContent" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Add accountId column to Campaign table
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Add accountId column to ChatbotConfig table
ALTER TABLE "ChatbotConfig" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Add unique index on ChatbotConfig.accountId
CREATE UNIQUE INDEX IF NOT EXISTS "ChatbotConfig_accountId_key" ON "ChatbotConfig"("accountId");

-- Add accountId column to DocumentAnalyzerConfig table
ALTER TABLE "DocumentAnalyzerConfig" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Add unique index on DocumentAnalyzerConfig.accountId
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentAnalyzerConfig_accountId_key" ON "DocumentAnalyzerConfig"("accountId");

-- Create indexes for account-scoped queries
CREATE INDEX IF NOT EXISTS "Project_accountId_idx" ON "Project"("accountId");
CREATE INDEX IF NOT EXISTS "Document_accountId_idx" ON "Document"("accountId");
CREATE INDEX IF NOT EXISTS "Meeting_accountId_idx" ON "Meeting"("accountId");
CREATE INDEX IF NOT EXISTS "AIAsset_accountId_idx" ON "AIAsset"("accountId");
CREATE INDEX IF NOT EXISTS "MarketingContent_accountId_idx" ON "MarketingContent"("accountId");
CREATE INDEX IF NOT EXISTS "Campaign_accountId_idx" ON "Campaign"("accountId");

-- Add foreign key constraints to Account table
ALTER TABLE "Project" ADD CONSTRAINT "Project_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIAsset" ADD CONSTRAINT "AIAsset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatbotConfig" ADD CONSTRAINT "ChatbotConfig_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentAnalyzerConfig" ADD CONSTRAINT "DocumentAnalyzerConfig_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
