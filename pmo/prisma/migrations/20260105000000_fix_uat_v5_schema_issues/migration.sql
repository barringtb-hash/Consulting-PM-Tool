-- UAT v5.0 Schema Fixes Migration
-- This migration addresses critical issues identified during UAT testing:
-- 1. TaskStatus enum missing NOT_STARTED value
-- 2. ChatbotConfig clientId should be nullable, missing accountId FK and indexes
-- 3. Phase 2/3 AI tool configs missing accountId support

-- ============================================================================
-- FIX 1: Add NOT_STARTED to TaskStatus enum
-- ============================================================================
-- The TaskStatus enum was created without NOT_STARTED, but the schema expects it
-- This was causing task creation to fail with "invalid input value for enum"

ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'NOT_STARTED' BEFORE 'BACKLOG';

-- ============================================================================
-- FIX 2: ChatbotConfig schema fixes
-- ============================================================================
-- Make clientId nullable (schema has Int? but DB has NOT NULL)
ALTER TABLE "ChatbotConfig" ALTER COLUMN "clientId" DROP NOT NULL;

-- Add foreign key for accountId (was intentionally skipped in earlier migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ChatbotConfig_accountId_fkey'
    ) THEN
        ALTER TABLE "ChatbotConfig" ADD CONSTRAINT "ChatbotConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add composite index for accountId + isActive
CREATE INDEX IF NOT EXISTS "ChatbotConfig_accountId_isActive_idx" ON "ChatbotConfig"("accountId", "isActive");

-- ============================================================================
-- FIX 3: IntakeConfig schema fixes
-- ============================================================================
-- Add accountId column if not exists
ALTER TABLE "IntakeConfig" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Make clientId nullable
ALTER TABLE "IntakeConfig" ALTER COLUMN "clientId" DROP NOT NULL;

-- Add unique constraint on accountId
CREATE UNIQUE INDEX IF NOT EXISTS "IntakeConfig_accountId_key" ON "IntakeConfig"("accountId");

-- Add foreign key for accountId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IntakeConfig_accountId_fkey'
    ) THEN
        ALTER TABLE "IntakeConfig" ADD CONSTRAINT "IntakeConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add tenantId foreign key if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IntakeConfig_tenantId_fkey'
    ) THEN
        ALTER TABLE "IntakeConfig" ADD CONSTRAINT "IntakeConfig_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- FIX 4: InventoryForecastConfig schema fixes (Phase 3)
-- ============================================================================
ALTER TABLE "InventoryForecastConfig" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;
ALTER TABLE "InventoryForecastConfig" ALTER COLUMN "clientId" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryForecastConfig_accountId_key" ON "InventoryForecastConfig"("accountId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InventoryForecastConfig_accountId_fkey'
    ) THEN
        ALTER TABLE "InventoryForecastConfig" ADD CONSTRAINT "InventoryForecastConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InventoryForecastConfig_tenantId_fkey'
    ) THEN
        ALTER TABLE "InventoryForecastConfig" ADD CONSTRAINT "InventoryForecastConfig_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- FIX 5: ComplianceMonitorConfig schema fixes (Phase 3)
-- ============================================================================
ALTER TABLE "ComplianceMonitorConfig" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;
ALTER TABLE "ComplianceMonitorConfig" ALTER COLUMN "clientId" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ComplianceMonitorConfig_accountId_key" ON "ComplianceMonitorConfig"("accountId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ComplianceMonitorConfig_accountId_fkey'
    ) THEN
        ALTER TABLE "ComplianceMonitorConfig" ADD CONSTRAINT "ComplianceMonitorConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ComplianceMonitorConfig_tenantId_fkey'
    ) THEN
        ALTER TABLE "ComplianceMonitorConfig" ADD CONSTRAINT "ComplianceMonitorConfig_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- FIX 6: PredictiveMaintenanceConfig schema fixes (Phase 3)
-- ============================================================================
ALTER TABLE "PredictiveMaintenanceConfig" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;
ALTER TABLE "PredictiveMaintenanceConfig" ALTER COLUMN "clientId" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PredictiveMaintenanceConfig_accountId_key" ON "PredictiveMaintenanceConfig"("accountId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PredictiveMaintenanceConfig_accountId_fkey'
    ) THEN
        ALTER TABLE "PredictiveMaintenanceConfig" ADD CONSTRAINT "PredictiveMaintenanceConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PredictiveMaintenanceConfig_tenantId_fkey'
    ) THEN
        ALTER TABLE "PredictiveMaintenanceConfig" ADD CONSTRAINT "PredictiveMaintenanceConfig_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- FIX 7: RevenueManagementConfig schema fixes (Phase 3)
-- ============================================================================
ALTER TABLE "RevenueManagementConfig" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;
ALTER TABLE "RevenueManagementConfig" ALTER COLUMN "clientId" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "RevenueManagementConfig_accountId_key" ON "RevenueManagementConfig"("accountId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'RevenueManagementConfig_accountId_fkey'
    ) THEN
        ALTER TABLE "RevenueManagementConfig" ADD CONSTRAINT "RevenueManagementConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'RevenueManagementConfig_tenantId_fkey'
    ) THEN
        ALTER TABLE "RevenueManagementConfig" ADD CONSTRAINT "RevenueManagementConfig_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- FIX 8: SafetyMonitorConfig schema fixes (Phase 3)
-- ============================================================================
ALTER TABLE "SafetyMonitorConfig" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;
ALTER TABLE "SafetyMonitorConfig" ALTER COLUMN "clientId" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SafetyMonitorConfig_accountId_key" ON "SafetyMonitorConfig"("accountId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SafetyMonitorConfig_accountId_fkey'
    ) THEN
        ALTER TABLE "SafetyMonitorConfig" ADD CONSTRAINT "SafetyMonitorConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SafetyMonitorConfig_tenantId_fkey'
    ) THEN
        ALTER TABLE "SafetyMonitorConfig" ADD CONSTRAINT "SafetyMonitorConfig_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- FIX 9: DocumentAnalyzerConfig - ensure accountId FK exists
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DocumentAnalyzerConfig_accountId_fkey'
    ) THEN
        ALTER TABLE "DocumentAnalyzerConfig" ADD CONSTRAINT "DocumentAnalyzerConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add composite index for accountId + isActive
CREATE INDEX IF NOT EXISTS "DocumentAnalyzerConfig_accountId_isActive_idx" ON "DocumentAnalyzerConfig"("accountId", "isActive");
