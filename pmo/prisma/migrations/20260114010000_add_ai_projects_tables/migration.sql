-- Migration: Add AI Projects Module Tables
-- Creates 11 missing tables for AI-powered project management features

-- ============================================================================
-- ENUMS
-- ============================================================================

-- TaskDependency enum
CREATE TYPE "DependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH');

-- ScopeChangeAlert enums
CREATE TYPE "ScopeChangeType" AS ENUM (
  'TASK_ADDITION', 'TASK_REMOVAL', 'MILESTONE_ADDITION',
  'MILESTONE_CHANGE', 'TIMELINE_EXTENSION', 'REQUIREMENT_CHANGE'
);
CREATE TYPE "ScopeSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- ProjectRisk enums
CREATE TYPE "RiskSourceType" AS ENUM ('MEETING', 'TASK', 'MILESTONE', 'MANUAL', 'AI_DETECTED');
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "RiskCategory" AS ENUM ('TIMELINE', 'BUDGET', 'SCOPE', 'RESOURCE', 'TECHNICAL', 'EXTERNAL', 'QUALITY');
CREATE TYPE "RiskStatus" AS ENUM ('IDENTIFIED', 'ANALYZING', 'MITIGATING', 'MONITORING', 'RESOLVED', 'ACCEPTED');

-- ProjectBudgetForecast enum
CREATE TYPE "BudgetRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- ProjectDigestConfig enums
CREATE TYPE "DigestRecipientType" AS ENUM ('OWNER', 'TEAM', 'STAKEHOLDER', 'CUSTOM');
CREATE TYPE "DigestFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');
CREATE TYPE "DigestDetailLevel" AS ENUM ('EXECUTIVE', 'STANDARD', 'DETAILED');

-- SmartReminder enums
CREATE TYPE "SmartReminderType" AS ENUM (
  'TASK_OVERDUE', 'TASK_DUE_SOON', 'MILESTONE_APPROACHING', 'STALE_PROJECT',
  'NO_RECENT_ACTIVITY', 'HEALTH_DECLINING', 'MEETING_FOLLOWUP',
  'STATUS_UPDATE_DUE', 'BUDGET_ALERT', 'SCOPE_CREEP'
);
CREATE TYPE "SmartReminderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "SmartReminderStatus" AS ENUM ('PENDING', 'SENT', 'DISMISSED', 'ACTION_TAKEN');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. TaskDependency - Defines dependencies between tasks for auto-scheduling
CREATE TABLE "TaskDependency" (
  "id" SERIAL NOT NULL,
  "dependentTaskId" INTEGER NOT NULL,
  "blockingTaskId" INTEGER NOT NULL,
  "dependencyType" "DependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
  "lagDays" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- 2. TaskDurationLearning - Historical data for AI duration estimation
CREATE TABLE "TaskDurationLearning" (
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

-- 3. TeamAvailability - Tracks team member capacity for scheduling
CREATE TABLE "TeamAvailability" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "date" DATE NOT NULL,
  "availableHours" DOUBLE PRECISION NOT NULL,
  "allocatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "TeamAvailability_pkey" PRIMARY KEY ("id")
);

-- 4. ProjectHealthPrediction - AI-powered health predictions
CREATE TABLE "ProjectHealthPrediction" (
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

-- 5. ProjectScopeBaseline - Snapshot of original project scope
CREATE TABLE "ProjectScopeBaseline" (
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

-- 6. ScopeChangeAlert - Alerts for detected scope changes
CREATE TABLE "ScopeChangeAlert" (
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

-- 7. ProjectBudgetForecast - AI-powered budget predictions
CREATE TABLE "ProjectBudgetForecast" (
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

-- 8. ProjectRisk - Risks extracted from meetings and project data
CREATE TABLE "ProjectRisk" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectRisk_pkey" PRIMARY KEY ("id")
);

-- 9. ProjectDigestConfig - Configuration for automated status digest emails
CREATE TABLE "ProjectDigestConfig" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectDigestConfig_pkey" PRIMARY KEY ("id")
);

-- 10. SmartReminder - Contextual reminders for project activities
CREATE TABLE "SmartReminder" (
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

-- 11. TeamPerformanceMetrics - Aggregated team performance data
CREATE TABLE "TeamPerformanceMetrics" (
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
-- INDEXES
-- ============================================================================

-- TaskDependency indexes
CREATE UNIQUE INDEX "TaskDependency_dependentTaskId_blockingTaskId_key" ON "TaskDependency"("dependentTaskId", "blockingTaskId");
CREATE INDEX "TaskDependency_blockingTaskId_idx" ON "TaskDependency"("blockingTaskId");

-- TaskDurationLearning indexes
CREATE INDEX "TaskDurationLearning_tenantId_taskType_idx" ON "TaskDurationLearning"("tenantId", "taskType");

-- TeamAvailability indexes
CREATE UNIQUE INDEX "TeamAvailability_userId_date_key" ON "TeamAvailability"("userId", "date");
CREATE INDEX "TeamAvailability_tenantId_date_idx" ON "TeamAvailability"("tenantId", "date");

-- ProjectHealthPrediction indexes
CREATE INDEX "ProjectHealthPrediction_projectId_predictedDate_idx" ON "ProjectHealthPrediction"("projectId", "predictedDate");
CREATE INDEX "ProjectHealthPrediction_tenantId_idx" ON "ProjectHealthPrediction"("tenantId");

-- ProjectScopeBaseline indexes
CREATE INDEX "ProjectScopeBaseline_projectId_idx" ON "ProjectScopeBaseline"("projectId");
CREATE INDEX "ProjectScopeBaseline_tenantId_idx" ON "ProjectScopeBaseline"("tenantId");

-- ScopeChangeAlert indexes
CREATE INDEX "ScopeChangeAlert_projectId_status_idx" ON "ScopeChangeAlert"("projectId", "status");
CREATE INDEX "ScopeChangeAlert_tenantId_idx" ON "ScopeChangeAlert"("tenantId");

-- ProjectBudgetForecast indexes
CREATE INDEX "ProjectBudgetForecast_projectId_forecastDate_idx" ON "ProjectBudgetForecast"("projectId", "forecastDate");
CREATE INDEX "ProjectBudgetForecast_tenantId_idx" ON "ProjectBudgetForecast"("tenantId");

-- ProjectRisk indexes
CREATE INDEX "ProjectRisk_projectId_status_idx" ON "ProjectRisk"("projectId", "status");
CREATE INDEX "ProjectRisk_tenantId_idx" ON "ProjectRisk"("tenantId");

-- ProjectDigestConfig indexes
CREATE INDEX "ProjectDigestConfig_projectId_idx" ON "ProjectDigestConfig"("projectId");
CREATE INDEX "ProjectDigestConfig_tenantId_idx" ON "ProjectDigestConfig"("tenantId");

-- SmartReminder indexes
CREATE INDEX "SmartReminder_userId_status_scheduledFor_idx" ON "SmartReminder"("userId", "status", "scheduledFor");
CREATE INDEX "SmartReminder_tenantId_idx" ON "SmartReminder"("tenantId");
CREATE INDEX "SmartReminder_projectId_idx" ON "SmartReminder"("projectId");

-- TeamPerformanceMetrics indexes
CREATE UNIQUE INDEX "TeamPerformanceMetrics_userId_periodStart_periodType_key" ON "TeamPerformanceMetrics"("userId", "periodStart", "periodType");
CREATE INDEX "TeamPerformanceMetrics_tenantId_periodType_idx" ON "TeamPerformanceMetrics"("tenantId", "periodType");

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

-- TaskDependency foreign keys
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependentTaskId_fkey" FOREIGN KEY ("dependentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockingTaskId_fkey" FOREIGN KEY ("blockingTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TaskDurationLearning foreign keys
ALTER TABLE "TaskDurationLearning" ADD CONSTRAINT "TaskDurationLearning_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TeamAvailability foreign keys
ALTER TABLE "TeamAvailability" ADD CONSTRAINT "TeamAvailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamAvailability" ADD CONSTRAINT "TeamAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProjectHealthPrediction foreign keys
ALTER TABLE "ProjectHealthPrediction" ADD CONSTRAINT "ProjectHealthPrediction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectHealthPrediction" ADD CONSTRAINT "ProjectHealthPrediction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProjectScopeBaseline foreign keys
ALTER TABLE "ProjectScopeBaseline" ADD CONSTRAINT "ProjectScopeBaseline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectScopeBaseline" ADD CONSTRAINT "ProjectScopeBaseline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ScopeChangeAlert foreign keys
ALTER TABLE "ScopeChangeAlert" ADD CONSTRAINT "ScopeChangeAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScopeChangeAlert" ADD CONSTRAINT "ScopeChangeAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScopeChangeAlert" ADD CONSTRAINT "ScopeChangeAlert_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ProjectBudgetForecast foreign keys
ALTER TABLE "ProjectBudgetForecast" ADD CONSTRAINT "ProjectBudgetForecast_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBudgetForecast" ADD CONSTRAINT "ProjectBudgetForecast_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProjectRisk foreign keys
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ProjectDigestConfig foreign keys
ALTER TABLE "ProjectDigestConfig" ADD CONSTRAINT "ProjectDigestConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDigestConfig" ADD CONSTRAINT "ProjectDigestConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SmartReminder foreign keys
ALTER TABLE "SmartReminder" ADD CONSTRAINT "SmartReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SmartReminder" ADD CONSTRAINT "SmartReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SmartReminder" ADD CONSTRAINT "SmartReminder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TeamPerformanceMetrics foreign keys
ALTER TABLE "TeamPerformanceMetrics" ADD CONSTRAINT "TeamPerformanceMetrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamPerformanceMetrics" ADD CONSTRAINT "TeamPerformanceMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
