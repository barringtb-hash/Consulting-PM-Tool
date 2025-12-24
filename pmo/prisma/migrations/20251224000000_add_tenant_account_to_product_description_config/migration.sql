-- Add tenantId and accountId columns to ProductDescriptionConfig
-- This migration adds multi-tenant support to the product description generator
-- All operations are idempotent and can be run multiple times safely

-- Step 0: Create enums if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplianceMode') THEN
        CREATE TYPE "ComplianceMode" AS ENUM ('NONE', 'FOOD', 'SUPPLEMENTS', 'COSMETICS', 'AUTOMOTIVE', 'MEDICAL');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplianceStatus') THEN
        CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'REQUIRES_REVIEW');
    END IF;
END $$;

-- Step 1: Add tenantId column (nullable first to allow migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescriptionConfig'
                   AND column_name = 'tenantId') THEN
        ALTER TABLE "ProductDescriptionConfig" ADD COLUMN "tenantId" TEXT;
    END IF;
END $$;

-- Step 2: Add accountId column (nullable first to allow migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescriptionConfig'
                   AND column_name = 'accountId') THEN
        ALTER TABLE "ProductDescriptionConfig" ADD COLUMN "accountId" INTEGER;
    END IF;
END $$;

-- Step 3: Make clientId nullable (schema change) - wrap in exception handler
DO $$
BEGIN
    ALTER TABLE "ProductDescriptionConfig" ALTER COLUMN "clientId" DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Column might already be nullable
        NULL;
END $$;

-- Step 4: Add compliance and language columns that are in the schema but missing from database
DO $$
BEGIN
    -- Add complianceMode column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescriptionConfig'
                   AND column_name = 'complianceMode') THEN
        ALTER TABLE "ProductDescriptionConfig" ADD COLUMN "complianceMode" "ComplianceMode" NOT NULL DEFAULT 'NONE';
    END IF;

    -- Add defaultLanguage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescriptionConfig'
                   AND column_name = 'defaultLanguage') THEN
        ALTER TABLE "ProductDescriptionConfig" ADD COLUMN "defaultLanguage" TEXT NOT NULL DEFAULT 'en';
    END IF;

    -- Add supportedLanguages column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescriptionConfig'
                   AND column_name = 'supportedLanguages') THEN
        ALTER TABLE "ProductDescriptionConfig" ADD COLUMN "supportedLanguages" TEXT[] DEFAULT ARRAY['en']::TEXT[];
    END IF;
END $$;

-- Step 5: Update existing rows - link to default tenant and derive accountId from clientId
-- First, get the default tenant for orphaned records
UPDATE "ProductDescriptionConfig" pdc
SET "tenantId" = (
    SELECT t.id FROM "Tenant" t ORDER BY t."createdAt" ASC LIMIT 1
)
WHERE "tenantId" IS NULL
AND EXISTS (SELECT 1 FROM "Tenant" LIMIT 1);

-- Link accountId based on clientId if an Account with matching legacyClientId exists
UPDATE "ProductDescriptionConfig" pdc
SET "accountId" = (
    SELECT a.id FROM "Account" a
    WHERE a."customFields"->>'legacyClientId' = pdc."clientId"::TEXT
    LIMIT 1
)
WHERE "clientId" IS NOT NULL AND "accountId" IS NULL;

-- For any remaining rows without accountId, try to match by client name to account name
UPDATE "ProductDescriptionConfig" pdc
SET "accountId" = (
    SELECT a.id FROM "Account" a
    INNER JOIN "Client" c ON c.id = pdc."clientId"
    WHERE LOWER(a.name) = LOWER(c.name)
    LIMIT 1
)
WHERE "clientId" IS NOT NULL AND "accountId" IS NULL;

-- Step 5b: Add missing columns to ProductDescription table
DO $$
BEGIN
    -- Add language column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescription'
                   AND column_name = 'language') THEN
        ALTER TABLE "ProductDescription" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
    END IF;

    -- Add seoScore column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescription'
                   AND column_name = 'seoScore') THEN
        ALTER TABLE "ProductDescription" ADD COLUMN "seoScore" INTEGER;
    END IF;

    -- Add readabilityScore column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescription'
                   AND column_name = 'readabilityScore') THEN
        ALTER TABLE "ProductDescription" ADD COLUMN "readabilityScore" DOUBLE PRECISION;
    END IF;

    -- Add complianceStatus column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescription'
                   AND column_name = 'complianceStatus') THEN
        ALTER TABLE "ProductDescription" ADD COLUMN "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'PENDING';
    END IF;

    -- Add complianceNotes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescription'
                   AND column_name = 'complianceNotes') THEN
        ALTER TABLE "ProductDescription" ADD COLUMN "complianceNotes" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- Add templateId column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ProductDescription'
                   AND column_name = 'templateId') THEN
        ALTER TABLE "ProductDescription" ADD COLUMN "templateId" INTEGER;
    END IF;
END $$;

-- Step 5c: Add missing columns to Product table
DO $$
BEGIN
    -- Add isActive column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'Product'
                   AND column_name = 'isActive') THEN
        ALTER TABLE "Product" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Step 5d: Add missing columns to BulkGenerationJob table
DO $$
BEGIN
    -- Add targetLanguages column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'BulkGenerationJob'
                   AND column_name = 'targetLanguages') THEN
        ALTER TABLE "BulkGenerationJob" ADD COLUMN "targetLanguages" TEXT[] DEFAULT ARRAY['en']::TEXT[];
    END IF;

    -- Add lastProcessedId column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'BulkGenerationJob'
                   AND column_name = 'lastProcessedId') THEN
        ALTER TABLE "BulkGenerationJob" ADD COLUMN "lastProcessedId" INTEGER;
    END IF;
END $$;

-- Step 6: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "ProductDescriptionConfig_tenantId_idx" ON "ProductDescriptionConfig"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductDescriptionConfig_accountId_isActive_idx" ON "ProductDescriptionConfig"("accountId", "isActive");
CREATE INDEX IF NOT EXISTS "ProductDescription_productId_language_idx" ON "ProductDescription"("productId", "language");

-- Step 7: Add unique constraint on accountId (only for non-null values during migration)
-- Note: The schema expects accountId to be unique, but we'll add this after migration is complete
-- CREATE UNIQUE INDEX IF NOT EXISTS "ProductDescriptionConfig_accountId_key" ON "ProductDescriptionConfig"("accountId") WHERE "accountId" IS NOT NULL;

-- Step 8: Add foreign key constraints (if Tenant and Account tables exist)
DO $$
BEGIN
    -- Add foreign key to Tenant if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ProductDescriptionConfig_tenantId_fkey'
        AND table_name = 'ProductDescriptionConfig'
    ) THEN
        -- Check if Tenant table exists first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Tenant') THEN
            ALTER TABLE "ProductDescriptionConfig"
            ADD CONSTRAINT "ProductDescriptionConfig_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Tenant table doesn't exist yet, skip FK
        NULL;
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add tenant FK: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Add foreign key to Account if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ProductDescriptionConfig_accountId_fkey'
        AND table_name = 'ProductDescriptionConfig'
    ) THEN
        -- Check if Account table exists first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Account') THEN
            ALTER TABLE "ProductDescriptionConfig"
            ADD CONSTRAINT "ProductDescriptionConfig_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Account table doesn't exist yet, skip FK
        NULL;
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add account FK: %', SQLERRM;
END $$;
