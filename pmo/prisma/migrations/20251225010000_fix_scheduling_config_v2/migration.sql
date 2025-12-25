-- Fix SchedulingConfig table - ensure all required columns exist
-- This migration adds any missing columns that should have been added by previous migrations
-- Uses ADD COLUMN IF NOT EXISTS for idempotency (PostgreSQL 9.6+)

-- Core columns for CRM integration
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "accountId" INTEGER;

-- Booking settings
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "allowWalkIns" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "requirePhone" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "autoConfirm" BOOLEAN NOT NULL DEFAULT false;

-- Booking page settings
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "showProviderSelection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "showAppointmentTypes" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "requireIntakeForm" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT;

-- Industry template settings
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "industryTemplate" TEXT;
ALTER TABLE "SchedulingConfig" ADD COLUMN IF NOT EXISTS "templateSettings" JSONB;

-- Make clientId nullable (it was required before CRM migration)
-- Exception handler ignores errors if column is already nullable
DO $$
BEGIN
    ALTER TABLE "SchedulingConfig" ALTER COLUMN "clientId" DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create unique index on accountId if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "SchedulingConfig_accountId_key"
ON "SchedulingConfig"("accountId") WHERE "accountId" IS NOT NULL;

-- Add foreign key for accountId -> Account (drop first to ensure clean state)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = current_schema()
        AND constraint_name = 'SchedulingConfig_accountId_fkey'
        AND table_name = 'SchedulingConfig'
    ) THEN
        ALTER TABLE "SchedulingConfig" DROP CONSTRAINT "SchedulingConfig_accountId_fkey";
    END IF;

    -- Add the foreign key constraint if Account table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema()
        AND table_name = 'Account'
    ) THEN
        ALTER TABLE "SchedulingConfig" ADD CONSTRAINT "SchedulingConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN OTHERS THEN RAISE NOTICE 'Could not add accountId FK: %', SQLERRM;
END $$;

-- Add foreign key for tenantId -> Tenant (drop first to ensure clean state)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = current_schema()
        AND constraint_name = 'SchedulingConfig_tenantId_fkey'
        AND table_name = 'SchedulingConfig'
    ) THEN
        ALTER TABLE "SchedulingConfig" DROP CONSTRAINT "SchedulingConfig_tenantId_fkey";
    END IF;

    -- Add the foreign key constraint if Tenant table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema()
        AND table_name = 'Tenant'
    ) THEN
        ALTER TABLE "SchedulingConfig" ADD CONSTRAINT "SchedulingConfig_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN OTHERS THEN RAISE NOTICE 'Could not add tenantId FK: %', SQLERRM;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "SchedulingConfig_accountId_isActive_idx" ON "SchedulingConfig"("accountId", "isActive");
CREATE INDEX IF NOT EXISTS "SchedulingConfig_clientId_isActive_idx" ON "SchedulingConfig"("clientId", "isActive");
CREATE INDEX IF NOT EXISTS "SchedulingConfig_tenantId_idx" ON "SchedulingConfig"("tenantId");

-- Data migration: Link existing configs to default tenant if needed
UPDATE "SchedulingConfig" sc
SET "tenantId" = (
    SELECT t.id FROM "Tenant" t ORDER BY t."createdAt" ASC, t.id ASC LIMIT 1
)
WHERE "tenantId" IS NULL
AND EXISTS (SELECT 1 FROM "Tenant" LIMIT 1);

-- Data migration: Link accountId based on clientId via legacy mapping
UPDATE "SchedulingConfig" sc
SET "accountId" = (
    SELECT a.id FROM "Account" a
    WHERE a."customFields"->>'legacyClientId' = sc."clientId"::TEXT
    ORDER BY a.id ASC
    LIMIT 1
)
WHERE "clientId" IS NOT NULL AND "accountId" IS NULL;

-- Data migration: Match remaining rows by client name to account name
UPDATE "SchedulingConfig" sc
SET "accountId" = (
    SELECT a.id FROM "Account" a
    INNER JOIN "Client" c ON c.id = sc."clientId"
    WHERE LOWER(a.name) = LOWER(c.name)
    ORDER BY a.id ASC
    LIMIT 1
)
WHERE "clientId" IS NOT NULL AND "accountId" IS NULL;
