-- RAID Module Tables Migration
-- Creates ActionItem, Decision, and ProjectIssue tables with all required enums

-- Create RAIDSourceType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "RAIDSourceType" AS ENUM ('MANUAL', 'MEETING', 'AI_EXTRACTED', 'IMPORTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ActionItemStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "ActionItemStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'CONVERTED_TO_TASK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create DecisionImpact enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "DecisionImpact" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create DecisionCategory enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "DecisionCategory" AS ENUM ('TECHNICAL', 'SCOPE', 'TIMELINE', 'BUDGET', 'RESOURCE', 'PROCESS', 'PROJECT', 'STAKEHOLDER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create DecisionStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "DecisionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUPERSEDED', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ProjectIssueSeverity enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "ProjectIssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ProjectIssueStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "ProjectIssueStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CLOSED', 'WONT_FIX');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ActionItem table
CREATE TABLE IF NOT EXISTS "ActionItem" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "sourceType" "RAIDSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceMeetingId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" INTEGER,
    "assigneeName" TEXT,
    "ownerId" INTEGER,
    "status" "ActionItemStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "Priority" NOT NULL DEFAULT 'P1',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sourceText" TEXT,
    "confidence" DOUBLE PRECISION,
    "linkedTaskId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- Create Decision table
CREATE TABLE IF NOT EXISTS "Decision" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "sourceType" "RAIDSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceMeetingId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT,
    "madeById" INTEGER,
    "madeByName" TEXT,
    "stakeholders" TEXT[],
    "impact" "DecisionImpact" NOT NULL DEFAULT 'MEDIUM',
    "category" "DecisionCategory" NOT NULL DEFAULT 'PROJECT',
    "status" "DecisionStatus" NOT NULL DEFAULT 'ACTIVE',
    "supersededById" INTEGER,
    "decisionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "sourceText" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- Create ProjectIssue table
CREATE TABLE IF NOT EXISTS "ProjectIssue" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "sourceType" "RAIDSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceMeetingId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedAreas" TEXT[],
    "severity" "ProjectIssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "impact" TEXT,
    "reportedById" INTEGER,
    "reportedByName" TEXT,
    "ownerId" INTEGER,
    "resolvedById" INTEGER,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "status" "ProjectIssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "identifiedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetResolutionDate" TIMESTAMP(3),
    "relatedRiskId" INTEGER,
    "sourceText" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectIssue_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "ActionItem_projectId_status_idx" ON "ActionItem"("projectId", "status");
CREATE INDEX IF NOT EXISTS "ActionItem_tenantId_idx" ON "ActionItem"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "ActionItem_linkedTaskId_key" ON "ActionItem"("linkedTaskId");

CREATE INDEX IF NOT EXISTS "Decision_projectId_status_idx" ON "Decision"("projectId", "status");
CREATE INDEX IF NOT EXISTS "Decision_tenantId_idx" ON "Decision"("tenantId");

CREATE INDEX IF NOT EXISTS "ProjectIssue_projectId_status_idx" ON "ProjectIssue"("projectId", "status");
CREATE INDEX IF NOT EXISTS "ProjectIssue_tenantId_idx" ON "ProjectIssue"("tenantId");

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_sourceMeetingId_fkey" FOREIGN KEY ("sourceMeetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_linkedTaskId_fkey" FOREIGN KEY ("linkedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Decision" ADD CONSTRAINT "Decision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Decision" ADD CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Decision" ADD CONSTRAINT "Decision_sourceMeetingId_fkey" FOREIGN KEY ("sourceMeetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Decision" ADD CONSTRAINT "Decision_madeById_fkey" FOREIGN KEY ("madeById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_sourceMeetingId_fkey" FOREIGN KEY ("sourceMeetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_relatedRiskId_fkey" FOREIGN KEY ("relatedRiskId") REFERENCES "ProjectRisk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
