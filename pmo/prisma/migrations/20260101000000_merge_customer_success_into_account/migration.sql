-- Merge Customer Success Module into Account
-- This migration adds Account relations to existing CS models and creates AccountHealthScoreHistory

-- Step 1: Update CTA table
-- Add accountId column (nullable for backwards compatibility)
ALTER TABLE "CTA" ADD COLUMN "accountId" INTEGER;

-- Make clientId nullable (was required before)
ALTER TABLE "CTA" ALTER COLUMN "clientId" DROP NOT NULL;

-- Add foreign key constraint for accountId
ALTER TABLE "CTA" ADD CONSTRAINT "CTA_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for accountId + status
CREATE INDEX "CTA_accountId_status_idx" ON "CTA"("accountId", "status");

-- Step 2: Update SuccessPlan table
-- Add accountId column (nullable for backwards compatibility)
ALTER TABLE "SuccessPlan" ADD COLUMN "accountId" INTEGER;

-- Make clientId nullable (was required before)
ALTER TABLE "SuccessPlan" ALTER COLUMN "clientId" DROP NOT NULL;

-- Add foreign key constraint for accountId
ALTER TABLE "SuccessPlan" ADD CONSTRAINT "SuccessPlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for accountId + status
CREATE INDEX "SuccessPlan_accountId_status_idx" ON "SuccessPlan"("accountId", "status");

-- Step 3: Create AccountHealthScoreHistory table
CREATE TABLE "AccountHealthScoreHistory" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "category" "HealthScoreCategory" NOT NULL DEFAULT 'AT_RISK',
    "usageScore" INTEGER,
    "supportScore" INTEGER,
    "engagementScore" INTEGER,
    "sentimentScore" INTEGER,
    "financialScore" INTEGER,
    "usageWeight" INTEGER NOT NULL DEFAULT 40,
    "supportWeight" INTEGER NOT NULL DEFAULT 25,
    "engagementWeight" INTEGER NOT NULL DEFAULT 20,
    "sentimentWeight" INTEGER NOT NULL DEFAULT 15,
    "financialWeight" INTEGER NOT NULL DEFAULT 0,
    "previousScore" INTEGER,
    "scoreTrend" TEXT,
    "trendPercentage" DOUBLE PRECISION,
    "churnRisk" DOUBLE PRECISION,
    "expansionPotential" DOUBLE PRECISION,
    "calculationNotes" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountHealthScoreHistory_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "AccountHealthScoreHistory" ADD CONSTRAINT "AccountHealthScoreHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountHealthScoreHistory" ADD CONSTRAINT "AccountHealthScoreHistory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "AccountHealthScoreHistory_tenantId_idx" ON "AccountHealthScoreHistory"("tenantId");
CREATE INDEX "AccountHealthScoreHistory_accountId_calculatedAt_idx" ON "AccountHealthScoreHistory"("accountId", "calculatedAt" DESC);
CREATE INDEX "AccountHealthScoreHistory_category_calculatedAt_idx" ON "AccountHealthScoreHistory"("category", "calculatedAt");
