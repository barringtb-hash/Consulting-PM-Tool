-- Fix SchedulingConfig table to ensure all columns exist
-- This migration repairs any issues from the previous migration (20251219033045)
-- All operations are idempotent and can be run multiple times safely

-- Step 1: Add tenantId column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'tenantId') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "tenantId" TEXT;
    END IF;
END $$;

-- Step 2: Add accountId column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'accountId') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "accountId" INTEGER;
    END IF;
END $$;

-- Step 3: Add booking settings columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'allowWalkIns') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "allowWalkIns" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'requirePhone') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "requirePhone" BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'autoConfirm') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "autoConfirm" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Step 4: Add booking page settings columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'showProviderSelection') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "showProviderSelection" BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'showAppointmentTypes') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "showAppointmentTypes" BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'requireIntakeForm') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "requireIntakeForm" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'cancellationPolicy') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "cancellationPolicy" TEXT;
    END IF;
END $$;

-- Step 5: Add industry template columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'industryTemplate') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "industryTemplate" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                   AND table_name = 'SchedulingConfig'
                   AND column_name = 'templateSettings') THEN
        ALTER TABLE "SchedulingConfig" ADD COLUMN "templateSettings" JSONB;
    END IF;
END $$;

-- Step 6: Make clientId nullable (wrap in exception handler)
DO $$
BEGIN
    ALTER TABLE "SchedulingConfig" ALTER COLUMN "clientId" DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Column might already be nullable or have other constraints
        NULL;
END $$;

-- Step 7: Create unique index on accountId if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "SchedulingConfig_accountId_key" ON "SchedulingConfig"("accountId") WHERE "accountId" IS NOT NULL;

-- Step 8: Add foreign key for accountId -> Account (with exception handling)
DO $$
BEGIN
    -- Drop existing constraint if it exists (to ensure clean state)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = current_schema()
        AND constraint_name = 'SchedulingConfig_accountId_fkey'
        AND table_name = 'SchedulingConfig'
    ) THEN
        ALTER TABLE "SchedulingConfig" DROP CONSTRAINT "SchedulingConfig_accountId_fkey";
    END IF;

    -- Add the foreign key constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema()
        AND table_name = 'Account'
    ) THEN
        ALTER TABLE "SchedulingConfig" ADD CONSTRAINT "SchedulingConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Account table doesn't exist yet
        NULL;
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add accountId FK: %', SQLERRM;
END $$;

-- Step 9: Add foreign key for tenantId -> Tenant (with exception handling)
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

    -- Add the foreign key constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema()
        AND table_name = 'Tenant'
    ) THEN
        ALTER TABLE "SchedulingConfig" ADD CONSTRAINT "SchedulingConfig_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Tenant table doesn't exist yet
        NULL;
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add tenantId FK: %', SQLERRM;
END $$;

-- Step 10: Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS "SchedulingConfig_accountId_isActive_idx" ON "SchedulingConfig"("accountId", "isActive");
CREATE INDEX IF NOT EXISTS "SchedulingConfig_clientId_isActive_idx" ON "SchedulingConfig"("clientId", "isActive");
CREATE INDEX IF NOT EXISTS "SchedulingConfig_tenantId_idx" ON "SchedulingConfig"("tenantId");

-- Step 11: Link existing configs to default tenant if needed
-- Uses ORDER BY createdAt, id for deterministic selection
UPDATE "SchedulingConfig" sc
SET "tenantId" = (
    SELECT t.id FROM "Tenant" t ORDER BY t."createdAt" ASC, t.id ASC LIMIT 1
)
WHERE "tenantId" IS NULL
AND EXISTS (SELECT 1 FROM "Tenant" LIMIT 1);

-- Step 12: Try to link accountId based on clientId via legacy mapping
-- Uses ORDER BY id for deterministic selection when multiple matches exist
UPDATE "SchedulingConfig" sc
SET "accountId" = (
    SELECT a.id FROM "Account" a
    WHERE a."customFields"->>'legacyClientId' = sc."clientId"::TEXT
    ORDER BY a.id ASC
    LIMIT 1
)
WHERE "clientId" IS NOT NULL AND "accountId" IS NULL;

-- For any remaining rows without accountId, try to match by client name to account name
-- Uses ORDER BY id for deterministic selection when multiple matches exist
UPDATE "SchedulingConfig" sc
SET "accountId" = (
    SELECT a.id FROM "Account" a
    INNER JOIN "Client" c ON c.id = sc."clientId"
    WHERE LOWER(a.name) = LOWER(c.name)
    ORDER BY a.id ASC
    LIMIT 1
)
WHERE "clientId" IS NOT NULL AND "accountId" IS NULL;
