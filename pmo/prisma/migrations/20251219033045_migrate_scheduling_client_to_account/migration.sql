-- Migrate SchedulingConfig from Client to Account as primary reference
-- This migration makes accountId the primary reference and clientId optional

-- Step 1: Make clientId nullable (was required before)
ALTER TABLE "SchedulingConfig" ALTER COLUMN "clientId" DROP NOT NULL;

-- Step 2: Add unique constraint on accountId where it's not null
-- (accountId already has an index, but we need a unique constraint)
-- Note: The @unique decorator in Prisma schema already handles this

-- Step 3: Drop the old index on clientId (if it exists with isActive)
DROP INDEX IF EXISTS "SchedulingConfig_clientId_isActive_idx";

-- Step 4: Create new index on accountId, isActive
CREATE INDEX IF NOT EXISTS "SchedulingConfig_accountId_isActive_idx" ON "SchedulingConfig"("accountId", "isActive");

-- Step 5: Recreate index on clientId, isActive (optional, for legacy compatibility)
CREATE INDEX IF NOT EXISTS "SchedulingConfig_clientId_isActive_idx" ON "SchedulingConfig"("clientId", "isActive");

-- Note: Data migration (linking existing SchedulingConfigs to Accounts via Client relationships)
-- should be done via a separate script after this schema migration.
-- Example:
-- UPDATE "SchedulingConfig" sc
-- SET "accountId" = a.id
-- FROM "Client" c
-- JOIN "Account" a ON a."customFields"->>'legacyClientId' = c.id::text
-- WHERE sc."clientId" = c.id AND sc."accountId" IS NULL;
