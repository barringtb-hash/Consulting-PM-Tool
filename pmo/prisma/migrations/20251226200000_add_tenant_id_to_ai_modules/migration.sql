-- Add tenantId to AI Module Config models for multi-tenant support
-- This migration adds tenant isolation to all AI tool configurations

-- Phase 1 AI Tool Configs
-- ChatbotConfig already has tenantId from previous migration

-- SchedulingConfig
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SchedulingConfig" DROP CONSTRAINT IF EXISTS "SchedulingConfig_tenantId_fkey";
ALTER TABLE "SchedulingConfig" ADD CONSTRAINT "SchedulingConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "SchedulingConfig_tenantId_idx" ON "SchedulingConfig"("tenantId");

-- IntakeConfig
ALTER TABLE "IntakeConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "IntakeConfig" DROP CONSTRAINT IF EXISTS "IntakeConfig_tenantId_fkey";
ALTER TABLE "IntakeConfig" ADD CONSTRAINT "IntakeConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "IntakeConfig_tenantId_idx" ON "IntakeConfig"("tenantId");

-- ProductDescriptionConfig
ALTER TABLE "ProductDescriptionConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProductDescriptionConfig" DROP CONSTRAINT IF EXISTS "ProductDescriptionConfig_tenantId_fkey";
ALTER TABLE "ProductDescriptionConfig" ADD CONSTRAINT "ProductDescriptionConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "ProductDescriptionConfig_tenantId_idx" ON "ProductDescriptionConfig"("tenantId");

-- Phase 2 AI Tool Configs

-- DocumentAnalyzerConfig
ALTER TABLE "DocumentAnalyzerConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "DocumentAnalyzerConfig" DROP CONSTRAINT IF EXISTS "DocumentAnalyzerConfig_tenantId_fkey";
ALTER TABLE "DocumentAnalyzerConfig" ADD CONSTRAINT "DocumentAnalyzerConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "DocumentAnalyzerConfig_tenantId_idx" ON "DocumentAnalyzerConfig"("tenantId");

-- ContentGeneratorConfig
ALTER TABLE "ContentGeneratorConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ContentGeneratorConfig" DROP CONSTRAINT IF EXISTS "ContentGeneratorConfig_tenantId_fkey";
ALTER TABLE "ContentGeneratorConfig" ADD CONSTRAINT "ContentGeneratorConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "ContentGeneratorConfig_tenantId_idx" ON "ContentGeneratorConfig"("tenantId");

-- LeadScoringConfig
ALTER TABLE "LeadScoringConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LeadScoringConfig" DROP CONSTRAINT IF EXISTS "LeadScoringConfig_tenantId_fkey";
ALTER TABLE "LeadScoringConfig" ADD CONSTRAINT "LeadScoringConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "LeadScoringConfig_tenantId_idx" ON "LeadScoringConfig"("tenantId");

-- PriorAuthConfig
ALTER TABLE "PriorAuthConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PriorAuthConfig" DROP CONSTRAINT IF EXISTS "PriorAuthConfig_tenantId_fkey";
ALTER TABLE "PriorAuthConfig" ADD CONSTRAINT "PriorAuthConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "PriorAuthConfig_tenantId_idx" ON "PriorAuthConfig"("tenantId");

-- Phase 3 AI Tool Configs

-- InventoryForecastConfig
ALTER TABLE "InventoryForecastConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "InventoryForecastConfig" DROP CONSTRAINT IF EXISTS "InventoryForecastConfig_tenantId_fkey";
ALTER TABLE "InventoryForecastConfig" ADD CONSTRAINT "InventoryForecastConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "InventoryForecastConfig_tenantId_idx" ON "InventoryForecastConfig"("tenantId");

-- ComplianceMonitorConfig
ALTER TABLE "ComplianceMonitorConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ComplianceMonitorConfig" DROP CONSTRAINT IF EXISTS "ComplianceMonitorConfig_tenantId_fkey";
ALTER TABLE "ComplianceMonitorConfig" ADD CONSTRAINT "ComplianceMonitorConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "ComplianceMonitorConfig_tenantId_idx" ON "ComplianceMonitorConfig"("tenantId");

-- PredictiveMaintenanceConfig
ALTER TABLE "PredictiveMaintenanceConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PredictiveMaintenanceConfig" DROP CONSTRAINT IF EXISTS "PredictiveMaintenanceConfig_tenantId_fkey";
ALTER TABLE "PredictiveMaintenanceConfig" ADD CONSTRAINT "PredictiveMaintenanceConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "PredictiveMaintenanceConfig_tenantId_idx" ON "PredictiveMaintenanceConfig"("tenantId");

-- RevenueManagementConfig
ALTER TABLE "RevenueManagementConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "RevenueManagementConfig" DROP CONSTRAINT IF EXISTS "RevenueManagementConfig_tenantId_fkey";
ALTER TABLE "RevenueManagementConfig" ADD CONSTRAINT "RevenueManagementConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "RevenueManagementConfig_tenantId_idx" ON "RevenueManagementConfig"("tenantId");

-- SafetyMonitorConfig
ALTER TABLE "SafetyMonitorConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SafetyMonitorConfig" DROP CONSTRAINT IF EXISTS "SafetyMonitorConfig_tenantId_fkey";
ALTER TABLE "SafetyMonitorConfig" ADD CONSTRAINT "SafetyMonitorConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "SafetyMonitorConfig_tenantId_idx" ON "SafetyMonitorConfig"("tenantId");

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
