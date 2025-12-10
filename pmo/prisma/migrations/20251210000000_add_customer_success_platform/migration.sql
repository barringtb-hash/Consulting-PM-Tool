-- Customer Success Platform Migration
-- Adds health scoring, CTAs, success plans, engagement tracking, and analytics

-- Create enums
CREATE TYPE "HealthScoreCategory" AS ENUM ('HEALTHY', 'AT_RISK', 'CRITICAL');
CREATE TYPE "CTAType" AS ENUM ('RISK', 'OPPORTUNITY', 'LIFECYCLE', 'ACTIVITY', 'OBJECTIVE');
CREATE TYPE "CTAStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'SNOOZED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CTAPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "SuccessPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');
CREATE TYPE "ObjectiveStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');
CREATE TYPE "PlaybookStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "EngagementLevel" AS ENUM ('CHAMPION', 'ENGAGED', 'NEUTRAL', 'DISENGAGED', 'AT_RISK');
CREATE TYPE "CSActivityType" AS ENUM ('MEETING', 'EMAIL_SENT', 'EMAIL_RECEIVED', 'CALL', 'SUPPORT_TICKET', 'PRODUCT_USAGE', 'NPS_RESPONSE', 'CSAT_RESPONSE', 'MILESTONE_COMPLETED', 'DOCUMENT_SHARED', 'NOTE', 'CTA_CREATED', 'CTA_COMPLETED', 'RENEWAL', 'EXPANSION', 'CONTRACTION');

-- Add Customer Success fields to Project table
ALTER TABLE "Project" ADD COLUMN "renewalDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "contractValue" DECIMAL(12,2);
ALTER TABLE "Project" ADD COLUMN "licenseCount" INTEGER;
ALTER TABLE "Project" ADD COLUMN "licenseUtilization" DOUBLE PRECISION;
ALTER TABLE "Project" ADD COLUMN "lastContactDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "nextCheckInDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "npsScore" INTEGER;
ALTER TABLE "Project" ADD COLUMN "csatScore" DOUBLE PRECISION;
ALTER TABLE "Project" ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Create index on Project for Customer Success queries
CREATE INDEX "Project_renewalDate_idx" ON "Project"("renewalDate");
CREATE INDEX "Project_healthStatus_renewalDate_idx" ON "Project"("healthStatus", "renewalDate");

-- CustomerHealthScore table
CREATE TABLE "CustomerHealthScore" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "overallScore" INTEGER NOT NULL DEFAULT 50,
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
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerHealthScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerHealthScore_clientId_projectId_key" ON "CustomerHealthScore"("clientId", "projectId");
CREATE INDEX "CustomerHealthScore_clientId_overallScore_idx" ON "CustomerHealthScore"("clientId", "overallScore");
CREATE INDEX "CustomerHealthScore_category_lastCalculatedAt_idx" ON "CustomerHealthScore"("category", "lastCalculatedAt");

-- HealthScoreHistory table
CREATE TABLE "HealthScoreHistory" (
    "id" SERIAL NOT NULL,
    "customerHealthScoreId" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "category" "HealthScoreCategory" NOT NULL,
    "usageScore" INTEGER,
    "supportScore" INTEGER,
    "engagementScore" INTEGER,
    "sentimentScore" INTEGER,
    "financialScore" INTEGER,
    "churnRisk" DOUBLE PRECISION,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthScoreHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HealthScoreHistory_customerHealthScoreId_snapshotDate_idx" ON "HealthScoreHistory"("customerHealthScoreId", "snapshotDate" DESC);

-- SuccessPlan table
CREATE TABLE "SuccessPlan" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SuccessPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "customerGoals" JSONB,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "isCustomerVisible" BOOLEAN NOT NULL DEFAULT false,
    "customerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SuccessPlan_clientId_status_idx" ON "SuccessPlan"("clientId", "status");
CREATE INDEX "SuccessPlan_ownerId_status_idx" ON "SuccessPlan"("ownerId", "status");

-- SuccessObjective table
CREATE TABLE "SuccessObjective" (
    "id" SERIAL NOT NULL,
    "successPlanId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "successCriteria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessObjective_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SuccessObjective_successPlanId_status_idx" ON "SuccessObjective"("successPlanId", "status");

-- SuccessTask table
CREATE TABLE "SuccessTask" (
    "id" SERIAL NOT NULL,
    "objectiveId" INTEGER NOT NULL,
    "ownerId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "priority" "Priority" NOT NULL DEFAULT 'P1',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SuccessTask_objectiveId_status_idx" ON "SuccessTask"("objectiveId", "status");

-- Playbook table
CREATE TABLE "Playbook" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlaybookStatus" NOT NULL DEFAULT 'DRAFT',
    "ctaType" "CTAType",
    "category" TEXT,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Playbook_status_ctaType_idx" ON "Playbook"("status", "ctaType");

-- PlaybookTask table
CREATE TABLE "PlaybookTask" (
    "id" SERIAL NOT NULL,
    "playbookId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "daysFromStart" INTEGER NOT NULL DEFAULT 0,
    "assignToOwner" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlaybookTask_playbookId_idx" ON "PlaybookTask"("playbookId");

-- CTA table
CREATE TABLE "CTA" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "ownerId" INTEGER NOT NULL,
    "type" "CTAType" NOT NULL,
    "status" "CTAStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CTAPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reason" TEXT,
    "dueDate" TIMESTAMP(3),
    "snoozeUntil" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "playbookId" INTEGER,
    "successPlanId" INTEGER,
    "linkedMeetingId" INTEGER,
    "resolutionNotes" TEXT,
    "outcome" TEXT,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "triggerRule" TEXT,
    "triggerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CTA_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CTA_clientId_status_idx" ON "CTA"("clientId", "status");
CREATE INDEX "CTA_ownerId_status_priority_idx" ON "CTA"("ownerId", "status", "priority");
CREATE INDEX "CTA_type_status_idx" ON "CTA"("type", "status");
CREATE INDEX "CTA_dueDate_status_idx" ON "CTA"("dueDate", "status");

-- CTATask table
CREATE TABLE "CTATask" (
    "id" SERIAL NOT NULL,
    "ctaId" INTEGER NOT NULL,
    "ownerId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isFromPlaybook" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CTATask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CTATask_ctaId_status_idx" ON "CTATask"("ctaId", "status");

-- CSActivityLog table
CREATE TABLE "CSActivityLog" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "contactId" INTEGER,
    "userId" INTEGER,
    "activityType" "CSActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "sentiment" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "sourceMeetingId" INTEGER,
    "sourceTicketId" TEXT,
    "sourceEmailId" TEXT,
    "activityDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CSActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CSActivityLog_clientId_activityDate_idx" ON "CSActivityLog"("clientId", "activityDate" DESC);
CREATE INDEX "CSActivityLog_projectId_activityDate_idx" ON "CSActivityLog"("projectId", "activityDate" DESC);
CREATE INDEX "CSActivityLog_activityType_activityDate_idx" ON "CSActivityLog"("activityType", "activityDate" DESC);

-- CSMetricSnapshot table
CREATE TABLE "CSMetricSnapshot" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER,
    "projectId" INTEGER,
    "snapshotDate" DATE NOT NULL,
    "healthScore" INTEGER,
    "healthCategory" "HealthScoreCategory",
    "churnRisk" DOUBLE PRECISION,
    "meetingsCount" INTEGER NOT NULL DEFAULT 0,
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "emailsReceived" INTEGER NOT NULL DEFAULT 0,
    "supportTickets" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER,
    "loginCount" INTEGER,
    "featureAdoption" DOUBLE PRECISION,
    "arr" DECIMAL(12,2),
    "mrr" DECIMAL(12,2),
    "npsScore" INTEGER,
    "csatScore" DOUBLE PRECISION,
    "openCTAs" INTEGER NOT NULL DEFAULT 0,
    "completedCTAs" INTEGER NOT NULL DEFAULT 0,
    "overdueCTAs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CSMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CSMetricSnapshot_clientId_projectId_snapshotDate_key" ON "CSMetricSnapshot"("clientId", "projectId", "snapshotDate");
CREATE INDEX "CSMetricSnapshot_snapshotDate_idx" ON "CSMetricSnapshot"("snapshotDate" DESC);
CREATE INDEX "CSMetricSnapshot_clientId_snapshotDate_idx" ON "CSMetricSnapshot"("clientId", "snapshotDate" DESC);

-- ContactEngagement table
CREATE TABLE "ContactEngagement" (
    "id" SERIAL NOT NULL,
    "contactId" INTEGER NOT NULL,
    "engagementLevel" "EngagementLevel" NOT NULL DEFAULT 'NEUTRAL',
    "isChampion" BOOLEAN NOT NULL DEFAULT false,
    "isDecisionMaker" BOOLEAN NOT NULL DEFAULT false,
    "isEconomicBuyer" BOOLEAN NOT NULL DEFAULT false,
    "influence" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "contactFrequency" TEXT,
    "responseTime" INTEGER,
    "meetingAttendance" DOUBLE PRECISION,
    "lastSentiment" TEXT,
    "npsScore" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactEngagement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContactEngagement_contactId_key" ON "ContactEngagement"("contactId");

-- CSRule table
CREATE TABLE "CSRule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ruleType" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "runFrequency" TEXT NOT NULL DEFAULT 'DAILY',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "timesTriggered" INTEGER NOT NULL DEFAULT 0,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CSRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CSRule_isActive_ruleType_idx" ON "CSRule"("isActive", "ruleType");
CREATE INDEX "CSRule_nextRunAt_isActive_idx" ON "CSRule"("nextRunAt", "isActive");

-- CSSurvey table
CREATE TABLE "CSSurvey" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER,
    "name" TEXT NOT NULL,
    "surveyType" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "triggerEvent" TEXT,
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CSSurvey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CSSurvey_clientId_isActive_idx" ON "CSSurvey"("clientId", "isActive");
CREATE INDEX "CSSurvey_surveyType_isTemplate_idx" ON "CSSurvey"("surveyType", "isTemplate");

-- CSSurveyResponse table
CREATE TABLE "CSSurveyResponse" (
    "id" SERIAL NOT NULL,
    "surveyId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "contactId" INTEGER,
    "projectId" INTEGER,
    "score" INTEGER NOT NULL,
    "category" TEXT,
    "comment" TEXT,
    "sentiment" TEXT,
    "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CSSurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CSSurveyResponse_surveyId_respondedAt_idx" ON "CSSurveyResponse"("surveyId", "respondedAt" DESC);
CREATE INDEX "CSSurveyResponse_clientId_respondedAt_idx" ON "CSSurveyResponse"("clientId", "respondedAt" DESC);

-- Add foreign key constraints
ALTER TABLE "CustomerHealthScore" ADD CONSTRAINT "CustomerHealthScore_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerHealthScore" ADD CONSTRAINT "CustomerHealthScore_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HealthScoreHistory" ADD CONSTRAINT "HealthScoreHistory_customerHealthScoreId_fkey" FOREIGN KEY ("customerHealthScoreId") REFERENCES "CustomerHealthScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SuccessPlan" ADD CONSTRAINT "SuccessPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SuccessPlan" ADD CONSTRAINT "SuccessPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SuccessPlan" ADD CONSTRAINT "SuccessPlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SuccessObjective" ADD CONSTRAINT "SuccessObjective_successPlanId_fkey" FOREIGN KEY ("successPlanId") REFERENCES "SuccessPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SuccessTask" ADD CONSTRAINT "SuccessTask_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "SuccessObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SuccessTask" ADD CONSTRAINT "SuccessTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlaybookTask" ADD CONSTRAINT "PlaybookTask_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CTA" ADD CONSTRAINT "CTA_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CTA" ADD CONSTRAINT "CTA_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CTA" ADD CONSTRAINT "CTA_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CTA" ADD CONSTRAINT "CTA_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CTATask" ADD CONSTRAINT "CTATask_ctaId_fkey" FOREIGN KEY ("ctaId") REFERENCES "CTA"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CTATask" ADD CONSTRAINT "CTATask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CSActivityLog" ADD CONSTRAINT "CSActivityLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CSActivityLog" ADD CONSTRAINT "CSActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CSActivityLog" ADD CONSTRAINT "CSActivityLog_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CSActivityLog" ADD CONSTRAINT "CSActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CSMetricSnapshot" ADD CONSTRAINT "CSMetricSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CSMetricSnapshot" ADD CONSTRAINT "CSMetricSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContactEngagement" ADD CONSTRAINT "ContactEngagement_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CSRule" ADD CONSTRAINT "CSRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CSSurvey" ADD CONSTRAINT "CSSurvey_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CSSurvey" ADD CONSTRAINT "CSSurvey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CSSurveyResponse" ADD CONSTRAINT "CSSurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "CSSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CSSurveyResponse" ADD CONSTRAINT "CSSurveyResponse_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CSSurveyResponse" ADD CONSTRAINT "CSSurveyResponse_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CSSurveyResponse" ADD CONSTRAINT "CSSurveyResponse_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
