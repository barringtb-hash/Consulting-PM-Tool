-- Add tenantId to AI Module Config models for multi-tenant support
-- This migration adds tenant isolation to existing AI tool configurations
-- Note: Some Phase 2/3 AI modules are not yet migrated to DB; they will get tenantId when created

-- Phase 1 AI Tool Configs

-- ChatbotConfig (composite index [tenantId, isActive] per schema)
ALTER TABLE "ChatbotConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ChatbotConfig" DROP CONSTRAINT IF EXISTS "ChatbotConfig_tenantId_fkey";
ALTER TABLE "ChatbotConfig" ADD CONSTRAINT "ChatbotConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "ChatbotConfig_tenantId_isActive_idx";
CREATE INDEX IF NOT EXISTS "ChatbotConfig_tenantId_isActive_idx" ON "ChatbotConfig"("tenantId", "isActive");

-- SchedulingConfig (single-column index per schema)
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SchedulingConfig" DROP CONSTRAINT IF EXISTS "SchedulingConfig_tenantId_fkey";
ALTER TABLE "SchedulingConfig" ADD CONSTRAINT "SchedulingConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "SchedulingConfig_tenantId_idx" ON "SchedulingConfig"("tenantId");

-- IntakeConfig (composite index [tenantId, isActive] per schema)
ALTER TABLE "IntakeConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "IntakeConfig" DROP CONSTRAINT IF EXISTS "IntakeConfig_tenantId_fkey";
ALTER TABLE "IntakeConfig" ADD CONSTRAINT "IntakeConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "IntakeConfig_tenantId_isActive_idx" ON "IntakeConfig"("tenantId", "isActive");

-- ProductDescriptionConfig (single-column index per schema)
ALTER TABLE "ProductDescriptionConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProductDescriptionConfig" DROP CONSTRAINT IF EXISTS "ProductDescriptionConfig_tenantId_fkey";
ALTER TABLE "ProductDescriptionConfig" ADD CONSTRAINT "ProductDescriptionConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "ProductDescriptionConfig_tenantId_idx" ON "ProductDescriptionConfig"("tenantId");

-- Phase 2 AI Tool Configs (that exist in DB)

-- DocumentAnalyzerConfig (composite index [tenantId, isActive] per schema)
ALTER TABLE "DocumentAnalyzerConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "DocumentAnalyzerConfig" DROP CONSTRAINT IF EXISTS "DocumentAnalyzerConfig_tenantId_fkey";
ALTER TABLE "DocumentAnalyzerConfig" ADD CONSTRAINT "DocumentAnalyzerConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "DocumentAnalyzerConfig_tenantId_isActive_idx" ON "DocumentAnalyzerConfig"("tenantId", "isActive");

-- ContentGeneratorConfig (composite index [tenantId, isActive] per schema)
ALTER TABLE "ContentGeneratorConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ContentGeneratorConfig" DROP CONSTRAINT IF EXISTS "ContentGeneratorConfig_tenantId_fkey";
ALTER TABLE "ContentGeneratorConfig" ADD CONSTRAINT "ContentGeneratorConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "ContentGeneratorConfig_tenantId_isActive_idx" ON "ContentGeneratorConfig"("tenantId", "isActive");

-- Customer Success Models

-- CustomerHealthScore
ALTER TABLE "CustomerHealthScore" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerHealthScore" DROP CONSTRAINT IF EXISTS "CustomerHealthScore_tenantId_fkey";
ALTER TABLE "CustomerHealthScore" ADD CONSTRAINT "CustomerHealthScore_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "CustomerHealthScore_tenantId_idx" ON "CustomerHealthScore"("tenantId");

-- SuccessPlan
ALTER TABLE "SuccessPlan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SuccessPlan" DROP CONSTRAINT IF EXISTS "SuccessPlan_tenantId_fkey";
ALTER TABLE "SuccessPlan" ADD CONSTRAINT "SuccessPlan_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "SuccessPlan_tenantId_idx" ON "SuccessPlan"("tenantId");

-- CTA
ALTER TABLE "CTA" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CTA" DROP CONSTRAINT IF EXISTS "CTA_tenantId_fkey";
ALTER TABLE "CTA" ADD CONSTRAINT "CTA_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "CTA_tenantId_idx" ON "CTA"("tenantId");

-- Playbook
ALTER TABLE "Playbook" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Playbook" DROP CONSTRAINT IF EXISTS "Playbook_tenantId_fkey";
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Playbook_tenantId_idx" ON "Playbook"("tenantId");

-- Note: The following tables are defined in schema but not yet migrated to DB:
-- LeadScoringConfig, PriorAuthConfig, InventoryForecastConfig, ComplianceMonitorConfig,
-- PredictiveMaintenanceConfig, RevenueManagementConfig, SafetyMonitorConfig
-- They will get tenantId column when their migrations are created.
