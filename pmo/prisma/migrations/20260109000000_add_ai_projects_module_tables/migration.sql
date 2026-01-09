-- CreateEnum
CREATE TYPE "ProjectDocumentType" AS ENUM ('PROJECT_PLAN', 'STATUS_REPORT', 'RISK_REGISTER', 'ISSUE_LOG', 'MEETING_NOTES', 'LESSONS_LEARNED', 'COMMUNICATION_PLAN', 'KICKOFF_AGENDA', 'CHANGE_REQUEST', 'PROJECT_CLOSURE', 'KNOWLEDGE_TRANSFER', 'DATA_GOVERNANCE', 'MODEL_CARD', 'AI_ETHICS_REVIEW');

-- CreateEnum
CREATE TYPE "ProjectDocumentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectDocumentCategory" AS ENUM ('CORE', 'LIFECYCLE', 'AI_SPECIFIC');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH');

-- CreateEnum
CREATE TYPE "ScopeChangeType" AS ENUM ('TASK_ADDITION', 'TASK_REMOVAL', 'MILESTONE_ADDITION', 'MILESTONE_CHANGE', 'TIMELINE_EXTENSION', 'REQUIREMENT_CHANGE');

-- CreateEnum
CREATE TYPE "ScopeSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskSourceType" AS ENUM ('MEETING', 'TASK', 'MILESTONE', 'MANUAL', 'AI_DETECTED');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('TIMELINE', 'BUDGET', 'SCOPE', 'RESOURCE', 'TECHNICAL', 'EXTERNAL', 'QUALITY');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('IDENTIFIED', 'ANALYZING', 'MITIGATING', 'MONITORING', 'RESOLVED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "DigestRecipientType" AS ENUM ('OWNER', 'TEAM', 'STAKEHOLDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DigestFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "DigestDetailLevel" AS ENUM ('EXECUTIVE', 'STANDARD', 'DETAILED');

-- CreateEnum
CREATE TYPE "SmartReminderType" AS ENUM ('TASK_DUE', 'MILESTONE_APPROACHING', 'MEETING_FOLLOWUP', 'STATUS_UPDATE', 'RISK_REVIEW', 'BLOCKED_TASK');

-- CreateEnum
CREATE TYPE "SmartReminderStatus" AS ENUM ('PENDING', 'SENT', 'DISMISSED', 'SNOOZED', 'COMPLETED');

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" SERIAL NOT NULL,
    "dependentTaskId" INTEGER NOT NULL,
    "blockingTaskId" INTEGER NOT NULL,
    "dependencyType" "DependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskDurationLearning" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskType" TEXT,
    "complexity" TEXT,
    "projectType" TEXT,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "actualHours" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDurationLearning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAvailability" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "availableHours" DOUBLE PRECISION NOT NULL,
    "allocatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "TeamAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "ProjectScopeBaseline" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "baselineDate" TIMESTAMP(3) NOT NULL,
    "originalTaskCount" INTEGER NOT NULL,
    "originalMilestoneCount" INTEGER NOT NULL,
    "originalScope" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectScopeBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeChangeAlert" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "changeType" "ScopeChangeType" NOT NULL,
    "severity" "ScopeSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedBy" INTEGER,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScopeChangeAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBudgetForecast" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "predictedTotal" DOUBLE PRECISION NOT NULL,
    "confidenceLevel" DOUBLE PRECISION NOT NULL,
    "factors" JSONB NOT NULL,
    "actualTotal" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectBudgetForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "ProjectDigestConfig" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "recipientType" "DigestRecipientType" NOT NULL,
    "customEmails" TEXT[],
    "frequency" "DigestFrequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "timeOfDay" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "detailLevel" "DigestDetailLevel" NOT NULL,
    "includeSections" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDigestConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartReminder" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "reminderType" "SmartReminderType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "SmartReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmartReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "templateType" "ProjectDocumentType" NOT NULL,
    "category" "ProjectDocumentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastEditedBy" INTEGER,
    "lastEditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocumentVersion" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "status" "ProjectDocumentStatus" NOT NULL,
    "editedBy" INTEGER,
    "editedAt" TIMESTAMP(3) NOT NULL,
    "changeLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_dependentTaskId_blockingTaskId_key" ON "TaskDependency"("dependentTaskId", "blockingTaskId");

-- CreateIndex
CREATE INDEX "TaskDependency_blockingTaskId_idx" ON "TaskDependency"("blockingTaskId");

-- CreateIndex
CREATE INDEX "TaskDurationLearning_tenantId_idx" ON "TaskDurationLearning"("tenantId");

-- CreateIndex
CREATE INDEX "TaskDurationLearning_taskType_complexity_idx" ON "TaskDurationLearning"("taskType", "complexity");

-- CreateIndex
CREATE UNIQUE INDEX "TeamAvailability_userId_date_key" ON "TeamAvailability"("userId", "date");

-- CreateIndex
CREATE INDEX "TeamAvailability_tenantId_date_idx" ON "TeamAvailability"("tenantId", "date");

-- CreateIndex
CREATE INDEX "ProjectHealthPrediction_projectId_predictedDate_idx" ON "ProjectHealthPrediction"("projectId", "predictedDate");

-- CreateIndex
CREATE INDEX "ProjectHealthPrediction_tenantId_idx" ON "ProjectHealthPrediction"("tenantId");

-- CreateIndex
CREATE INDEX "ProjectScopeBaseline_projectId_idx" ON "ProjectScopeBaseline"("projectId");

-- CreateIndex
CREATE INDEX "ProjectScopeBaseline_tenantId_idx" ON "ProjectScopeBaseline"("tenantId");

-- CreateIndex
CREATE INDEX "ScopeChangeAlert_projectId_status_idx" ON "ScopeChangeAlert"("projectId", "status");

-- CreateIndex
CREATE INDEX "ScopeChangeAlert_tenantId_idx" ON "ScopeChangeAlert"("tenantId");

-- CreateIndex
CREATE INDEX "ProjectBudgetForecast_projectId_idx" ON "ProjectBudgetForecast"("projectId");

-- CreateIndex
CREATE INDEX "ProjectBudgetForecast_tenantId_idx" ON "ProjectBudgetForecast"("tenantId");

-- CreateIndex
CREATE INDEX "ProjectRisk_projectId_status_idx" ON "ProjectRisk"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectRisk_tenantId_idx" ON "ProjectRisk"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDigestConfig_projectId_recipientType_key" ON "ProjectDigestConfig"("projectId", "recipientType");

-- CreateIndex
CREATE INDEX "ProjectDigestConfig_tenantId_idx" ON "ProjectDigestConfig"("tenantId");

-- CreateIndex
CREATE INDEX "SmartReminder_userId_status_scheduledFor_idx" ON "SmartReminder"("userId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "SmartReminder_tenantId_idx" ON "SmartReminder"("tenantId");

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependentTaskId_fkey" FOREIGN KEY ("dependentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockingTaskId_fkey" FOREIGN KEY ("blockingTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDurationLearning" ADD CONSTRAINT "TaskDurationLearning_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAvailability" ADD CONSTRAINT "TeamAvailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAvailability" ADD CONSTRAINT "TeamAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHealthPrediction" ADD CONSTRAINT "ProjectHealthPrediction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHealthPrediction" ADD CONSTRAINT "ProjectHealthPrediction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectScopeBaseline" ADD CONSTRAINT "ProjectScopeBaseline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectScopeBaseline" ADD CONSTRAINT "ProjectScopeBaseline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeChangeAlert" ADD CONSTRAINT "ScopeChangeAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeChangeAlert" ADD CONSTRAINT "ScopeChangeAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeChangeAlert" ADD CONSTRAINT "ScopeChangeAlert_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetForecast" ADD CONSTRAINT "ProjectBudgetForecast_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetForecast" ADD CONSTRAINT "ProjectBudgetForecast_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDigestConfig" ADD CONSTRAINT "ProjectDigestConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDigestConfig" ADD CONSTRAINT "ProjectDigestConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartReminder" ADD CONSTRAINT "SmartReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartReminder" ADD CONSTRAINT "SmartReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocument_projectId_templateType_name_key" ON "ProjectDocument"("projectId", "templateType", "name");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocumentVersion_documentId_version_key" ON "ProjectDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "ProjectDocumentVersion_documentId_idx" ON "ProjectDocumentVersion"("documentId");

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_lastEditedBy_fkey" FOREIGN KEY ("lastEditedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocumentVersion" ADD CONSTRAINT "ProjectDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProjectDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocumentVersion" ADD CONSTRAINT "ProjectDocumentVersion_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
