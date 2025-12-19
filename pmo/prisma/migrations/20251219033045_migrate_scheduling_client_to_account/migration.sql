-- Migrate SchedulingConfig from Client to Account as primary reference
-- This migration adds accountId, tenantId, and other missing columns,
-- makes accountId the primary reference and clientId optional for backward compatibility

-- Step 1: Add tenantId column (for multi-tenant support)
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Step 2: Add accountId column (new primary reference)
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Step 3: Add missing booking settings columns
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "allowWalkIns" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "requirePhone" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "autoConfirm" BOOLEAN NOT NULL DEFAULT false;

-- Step 4: Add missing booking page settings columns
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "showProviderSelection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "showAppointmentTypes" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "requireIntakeForm" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT;

-- Step 5: Add missing industry template columns
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "industryTemplate" TEXT;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "templateSettings" JSONB;

-- Step 6: Make clientId nullable (was required before)
ALTER TABLE "SchedulingConfig" ALTER COLUMN "clientId" DROP NOT NULL;

-- Step 7: Add unique constraint on accountId
CREATE UNIQUE INDEX IF NOT EXISTS "SchedulingConfig_accountId_key" ON "SchedulingConfig"("accountId") WHERE "accountId" IS NOT NULL;

-- Step 8: Add foreign key constraint for accountId -> Account
ALTER TABLE "SchedulingConfig" DROP CONSTRAINT IF EXISTS "SchedulingConfig_accountId_fkey";
ALTER TABLE "SchedulingConfig" ADD CONSTRAINT "SchedulingConfig_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Add foreign key constraint for tenantId -> Tenant
ALTER TABLE "SchedulingConfig" DROP CONSTRAINT IF EXISTS "SchedulingConfig_tenantId_fkey";
ALTER TABLE "SchedulingConfig" ADD CONSTRAINT "SchedulingConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Drop old indexes and create new ones
DROP INDEX IF EXISTS "SchedulingConfig_clientId_isActive_idx";
DROP INDEX IF EXISTS "SchedulingConfig_accountId_idx";

-- Step 11: Create new indexes
CREATE INDEX IF NOT EXISTS "SchedulingConfig_accountId_isActive_idx" ON "SchedulingConfig"("accountId", "isActive");
CREATE INDEX IF NOT EXISTS "SchedulingConfig_clientId_isActive_idx" ON "SchedulingConfig"("clientId", "isActive");
CREATE INDEX IF NOT EXISTS "SchedulingConfig_tenantId_idx" ON "SchedulingConfig"("tenantId");

-- Note: Data migration (linking existing SchedulingConfigs to Accounts via Client relationships)
-- should be done via a separate script after this schema migration.
