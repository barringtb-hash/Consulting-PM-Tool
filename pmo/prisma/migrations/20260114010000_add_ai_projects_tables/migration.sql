-- Migration: Add AI Projects Module Tables
-- Creates 11 missing tables for AI-powered project management features

-- ============================================================================
-- ENUMS (using DO blocks to handle existing types)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "DependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ScopeChangeType" AS ENUM ('TASK_ADDITION', 'TASK_REMOVAL', 'MILESTONE_ADDITION', 'MILESTONE_CHANGE', 'TIMELINE_EXTENSION', 'REQUIREMENT_CHANGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ScopeSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RiskSourceType" AS ENUM ('MEETING', 'TASK', 'MILESTONE', 'MANUAL', 'AI_DETECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RiskCategory" AS ENUM ('TIMELINE', 'BUDGET', 'SCOPE', 'RESOURCE', 'TECHNICAL', 'EXTERNAL', 'QUALITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RiskStatus" AS ENUM ('IDENTIFIED', 'ANALYZING', 'MITIGATING', 'MONITORING', 'RESOLVED', 'ACCEPTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BudgetRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DigestRecipientType" AS ENUM ('OWNER', 'TEAM', 'STAKEHOLDER', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DigestFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DigestDetailLevel" AS ENUM ('EXECUTIVE', 'STANDARD', 'DETAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SmartReminderType" AS ENUM ('TASK_OVERDUE', 'TASK_DUE_SOON', 'MILESTONE_APPROACHING', 'STALE_PROJECT', 'NO_RECENT_ACTIVITY', 'HEALTH_DECLINING', 'MEETING_FOLLOWUP', 'STATUS_UPDATE_DUE', 'BUDGET_ALERT', 'SCOPE_CREEP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SmartReminderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SmartReminderStatus" AS ENUM ('PENDING', 'SENT', 'DISMISSED', 'ACTION_TAKEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLES (using IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "TaskDependency" (
  "id" SERIAL NOT NULL,
  "dependentTaskId" INTEGER NOT NULL,
  "blockingTaskId" INTEGER NOT NULL,
  "dependencyType" "DependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
  "lagDays" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TaskDurationLearning" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "taskType" TEXT,
  "complexity" TEXT,
  "hasSubtasks" BOOLEAN NOT NULL,
  "teamSize" INTEGER NOT NULL,
  "estimatedHours" DOUBLE PRECISION NOT NULL,
  "actualHours" DOUBLE PRECISION NOT NULL,
  "accuracy" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskDurationLearning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamAvailability" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "date" DATE NOT NULL,
  "availableHours" DOUBLE PRECISION NOT NULL,
  "allocatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "TeamAvailability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectHealthPrediction" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" INTEGER NOT NULL,
  "predictedHealth" "ProjectHealthStatus" NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "predictedDate" TIMESTAMP(3) NOT NULL,
  "factors" JSONB NOT NULL,
  "actualHealth" "ProjectHealthStatus",
  "wasAccurate" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectHealthPrediction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectScopeBaseline" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" INTEGER NOT NULL,
  "baselineDate" TIMESTAMP(3) NOT NULL,
  "originalTaskCount" INTEGER NOT NULL,
  "originalMilestoneCount" INTEGER NOT NULL,
  "originalScope" JSONB NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectScopeBaseline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScopeChangeAlert" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" INTEGER NOT NULL,
  "changeType" "ScopeChangeType" NOT NULL,
  "severity" "ScopeSeverity" NOT NULL,
  "description" TEXT NOT NULL,
  "affectedItems" JSONB NOT NULL,
  "impactAnalysis" TEXT,
  "recommendation" TEXT,
  "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedBy" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScopeChangeAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectBudgetForecast" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" INTEGER NOT NULL,
  "forecastDate" TIMESTAMP(3) NOT NULL,
  "forecastPeriod" TEXT NOT NULL,
  "currentSpend" DECIMAL(12,2) NOT NULL,
  "forecastedSpend" DECIMAL(12,2) NOT NULL,
  "budgetAmount" DECIMAL(12,2) NOT NULL,
  "variance" DECIMAL(12,2) NOT NULL,
  "variancePercent" DOUBLE PRECISION NOT NULL,
  "riskLevel" "BudgetRiskLevel" NOT NULL,
  "recommendations" JSONB NOT NULL,
  "factors" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectBudgetForecast_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectRisk" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" INTEGER NOT NULL,
  "sourceType" "RiskSourceType" NOT NULL,
  "sourceId" INTEGER,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "RiskSeverity" NOT NULL,
  "category" "RiskCategory" NOT NULL,
  "suggestedMitigation" TEXT,
  "relatedQuote" TEXT,
  "status" "RiskStatus" NOT NULL DEFAULT 'IDENTIFIED',
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectRisk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectDigestConfig" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" INTEGER NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "recipientName" TEXT NOT NULL,
  "recipientRole" TEXT NOT NULL,
  "frequency" "DigestFrequency" NOT NULL,
  "preferredDay" INTEGER,
  "preferredTime" TEXT,
  "includeMetrics" BOOLEAN NOT NULL DEFAULT true,
  "includeRisks" BOOLEAN NOT NULL DEFAULT true,
  "includeActionItems" BOOLEAN NOT NULL DEFAULT true,
  "customSections" TEXT[],
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectDigestConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SmartReminder" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "reminderType" "SmartReminderType" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" INTEGER NOT NULL,
  "projectId" INTEGER,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "suggestedAction" TEXT,
  "actionUrl" TEXT,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "priority" "SmartReminderPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "SmartReminderStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "snoozedUntil" TIMESTAMP(3),
  "actionTakenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SmartReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamPerformanceMetrics" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "periodType" TEXT NOT NULL,
  "tasksCompleted" INTEGER NOT NULL,
  "tasksOnTime" INTEGER NOT NULL,
  "tasksOverdue" INTEGER NOT NULL,
  "avgCompletionTime" DOUBLE PRECISION NOT NULL,
  "estimateAccuracy" DOUBLE PRECISION NOT NULL,
  "metricsByType" JSONB NOT NULL,
  "collaborationScore" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamPerformanceMetrics_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INDEXES (using IF NOT EXISTS)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "TaskDependency_dependentTaskId_blockingTaskId_key" ON "TaskDependency"("dependentTaskId", "blockingTaskId");
CREATE INDEX IF NOT EXISTS "TaskDependency_blockingTaskId_idx" ON "TaskDependency"("blockingTaskId");

CREATE INDEX IF NOT EXISTS "TaskDurationLearning_tenantId_taskType_idx" ON "TaskDurationLearning"("tenantId", "taskType");

CREATE UNIQUE INDEX IF NOT EXISTS "TeamAvailability_userId_date_key" ON "TeamAvailability"("userId", "date");
CREATE INDEX IF NOT EXISTS "TeamAvailability_tenantId_date_idx" ON "TeamAvailability"("tenantId", "date");

CREATE INDEX IF NOT EXISTS "ProjectHealthPrediction_projectId_predictedDate_idx" ON "ProjectHealthPrediction"("projectId", "predictedDate");
CREATE INDEX IF NOT EXISTS "ProjectHealthPrediction_tenantId_idx" ON "ProjectHealthPrediction"("tenantId");

CREATE INDEX IF NOT EXISTS "ProjectScopeBaseline_projectId_idx" ON "ProjectScopeBaseline"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectScopeBaseline_tenantId_idx" ON "ProjectScopeBaseline"("tenantId");

CREATE INDEX IF NOT EXISTS "ScopeChangeAlert_projectId_status_idx" ON "ScopeChangeAlert"("projectId", "status");
CREATE INDEX IF NOT EXISTS "ScopeChangeAlert_tenantId_idx" ON "ScopeChangeAlert"("tenantId");

CREATE INDEX IF NOT EXISTS "ProjectBudgetForecast_projectId_forecastDate_idx" ON "ProjectBudgetForecast"("projectId", "forecastDate");
CREATE INDEX IF NOT EXISTS "ProjectBudgetForecast_tenantId_idx" ON "ProjectBudgetForecast"("tenantId");

CREATE INDEX IF NOT EXISTS "ProjectRisk_projectId_status_idx" ON "ProjectRisk"("projectId", "status");
CREATE INDEX IF NOT EXISTS "ProjectRisk_tenantId_idx" ON "ProjectRisk"("tenantId");

CREATE INDEX IF NOT EXISTS "ProjectDigestConfig_projectId_idx" ON "ProjectDigestConfig"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectDigestConfig_tenantId_idx" ON "ProjectDigestConfig"("tenantId");

CREATE INDEX IF NOT EXISTS "SmartReminder_userId_status_scheduledFor_idx" ON "SmartReminder"("userId", "status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "SmartReminder_tenantId_idx" ON "SmartReminder"("tenantId");
CREATE INDEX IF NOT EXISTS "SmartReminder_projectId_idx" ON "SmartReminder"("projectId");

CREATE UNIQUE INDEX IF NOT EXISTS "TeamPerformanceMetrics_userId_periodStart_periodType_key" ON "TeamPerformanceMetrics"("userId", "periodStart", "periodType");
CREATE INDEX IF NOT EXISTS "TeamPerformanceMetrics_tenantId_periodType_idx" ON "TeamPerformanceMetrics"("tenantId", "periodType");

-- ============================================================================
-- FOREIGN KEYS (with existence checks)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependentTaskId_fkey" FOREIGN KEY ("dependentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockingTaskId_fkey" FOREIGN KEY ("blockingTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TaskDurationLearning" ADD CONSTRAINT "TaskDurationLearning_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeamAvailability" ADD CONSTRAINT "TeamAvailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeamAvailability" ADD CONSTRAINT "TeamAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectHealthPrediction" ADD CONSTRAINT "ProjectHealthPrediction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectHealthPrediction" ADD CONSTRAINT "ProjectHealthPrediction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectScopeBaseline" ADD CONSTRAINT "ProjectScopeBaseline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectScopeBaseline" ADD CONSTRAINT "ProjectScopeBaseline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ScopeChangeAlert" ADD CONSTRAINT "ScopeChangeAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ScopeChangeAlert" ADD CONSTRAINT "ScopeChangeAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ScopeChangeAlert" ADD CONSTRAINT "ScopeChangeAlert_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectBudgetForecast" ADD CONSTRAINT "ProjectBudgetForecast_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectBudgetForecast" ADD CONSTRAINT "ProjectBudgetForecast_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectDigestConfig" ADD CONSTRAINT "ProjectDigestConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectDigestConfig" ADD CONSTRAINT "ProjectDigestConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SmartReminder" ADD CONSTRAINT "SmartReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SmartReminder" ADD CONSTRAINT "SmartReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SmartReminder" ADD CONSTRAINT "SmartReminder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeamPerformanceMetrics" ADD CONSTRAINT "TeamPerformanceMetrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeamPerformanceMetrics" ADD CONSTRAINT "TeamPerformanceMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
