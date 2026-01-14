-- ===========================================================================
-- ML Prediction Tables Migration
-- Includes missing Lead Scoring infrastructure tables and ML prediction tables
-- All operations are idempotent for safe re-runs
-- ===========================================================================

-- ===========================================================================
-- PART 1: Lead Scoring Enums (dependencies for Lead Scoring tables)
-- ===========================================================================

-- LeadScoreLevel enum
DO $$ BEGIN
  CREATE TYPE "LeadScoreLevel" AS ENUM ('HOT', 'WARM', 'COLD', 'DEAD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NurtureSequenceStatus enum
DO $$ BEGIN
  CREATE TYPE "NurtureSequenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NurtureStepType enum
DO $$ BEGIN
  CREATE TYPE "NurtureStepType" AS ENUM ('EMAIL', 'SMS', 'WAIT', 'CONDITION', 'TASK', 'NOTIFICATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================================================================
-- PART 2: Lead Scoring Tables (dependencies for ML tables)
-- ===========================================================================

-- LeadScoringConfig table (referenced by LeadTrainingData, LeadMLModel)
CREATE TABLE IF NOT EXISTS "LeadScoringConfig" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "clientId" INTEGER NOT NULL,
    "scoringModelVersion" TEXT,
    "lastModelTrainedAt" TIMESTAMP(3),
    "scoringWeights" JSONB,
    "hotThreshold" INTEGER NOT NULL DEFAULT 80,
    "warmThreshold" INTEGER NOT NULL DEFAULT 50,
    "coldThreshold" INTEGER NOT NULL DEFAULT 20,
    "trackEmailOpens" BOOLEAN NOT NULL DEFAULT true,
    "trackEmailClicks" BOOLEAN NOT NULL DEFAULT true,
    "trackWebsiteVisits" BOOLEAN NOT NULL DEFAULT true,
    "trackFormSubmissions" BOOLEAN NOT NULL DEFAULT true,
    "crmType" TEXT,
    "crmCredentials" JSONB,
    "crmSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastCrmSyncAt" TIMESTAMP(3),
    "emailProvider" TEXT,
    "emailCredentials" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadScoringConfig_pkey" PRIMARY KEY ("id")
);

-- ScoredLead table (referenced by LeadMLPrediction)
CREATE TABLE IF NOT EXISTS "ScoredLead" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "crmLeadId" TEXT,
    "crmContactId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreLevel" "LeadScoreLevel" NOT NULL DEFAULT 'COLD',
    "scoredAt" TIMESTAMP(3),
    "scoreBreakdown" JSONB,
    "scoreHistory" JSONB,
    "conversionProbability" DOUBLE PRECISION,
    "predictedValue" DECIMAL(12,2),
    "predictedCloseDate" TIMESTAMP(3),
    "totalEmailsSent" INTEGER NOT NULL DEFAULT 0,
    "totalEmailsOpened" INTEGER NOT NULL DEFAULT 0,
    "totalEmailsClicked" INTEGER NOT NULL DEFAULT 0,
    "totalWebsiteVisits" INTEGER NOT NULL DEFAULT 0,
    "lastEngagementAt" TIMESTAMP(3),
    "pipelineStage" TEXT,
    "pipelineValue" DECIMAL(12,2),
    "assignedTo" INTEGER,
    "currentSequenceId" INTEGER,
    "sequenceStepIndex" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "segments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoredLead_pkey" PRIMARY KEY ("id")
);

-- LeadActivity table
CREATE TABLE IF NOT EXISTS "LeadActivity" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "leadId" INTEGER,
    "activityType" TEXT NOT NULL,
    "activityData" JSONB,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "scoreImpact" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- NurtureSequence table
CREATE TABLE IF NOT EXISTS "NurtureSequence" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerConditions" JSONB,
    "steps" JSONB NOT NULL,
    "allowReEnrollment" BOOLEAN NOT NULL DEFAULT false,
    "reEnrollmentDays" INTEGER,
    "exitOnConversion" BOOLEAN NOT NULL DEFAULT true,
    "exitOnReply" BOOLEAN NOT NULL DEFAULT true,
    "totalEnrollments" INTEGER NOT NULL DEFAULT 0,
    "totalCompletions" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NurtureSequence_pkey" PRIMARY KEY ("id")
);

-- NurtureEnrollment table
CREATE TABLE IF NOT EXISTS "NurtureEnrollment" (
    "id" SERIAL NOT NULL,
    "sequenceId" INTEGER NOT NULL,
    "leadId" INTEGER NOT NULL,
    "status" "NurtureSequenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "nextStepScheduledAt" TIMESTAMP(3),
    "executionHistory" JSONB,
    "completedAt" TIMESTAMP(3),
    "exitReason" TEXT,
    "variant" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NurtureEnrollment_pkey" PRIMARY KEY ("id")
);

-- LeadScoringAnalytics table
CREATE TABLE IF NOT EXISTS "LeadScoringAnalytics" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "hotLeads" INTEGER NOT NULL DEFAULT 0,
    "warmLeads" INTEGER NOT NULL DEFAULT 0,
    "coldLeads" INTEGER NOT NULL DEFAULT 0,
    "newLeads" INTEGER NOT NULL DEFAULT 0,
    "leadsUpgraded" INTEGER NOT NULL DEFAULT 0,
    "leadsDowngraded" INTEGER NOT NULL DEFAULT 0,
    "totalActivities" INTEGER NOT NULL DEFAULT 0,
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "emailsOpened" INTEGER NOT NULL DEFAULT 0,
    "emailsClicked" INTEGER NOT NULL DEFAULT 0,
    "websiteVisits" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversionValue" DECIMAL(12,2),
    "sequenceEnrollments" INTEGER NOT NULL DEFAULT 0,
    "sequenceCompletions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadScoringAnalytics_pkey" PRIMARY KEY ("id")
);

-- ===========================================================================
-- PART 3: Lead Scoring Indexes and Constraints
-- ===========================================================================

-- LeadScoringConfig indexes
CREATE UNIQUE INDEX IF NOT EXISTS "LeadScoringConfig_clientId_key" ON "LeadScoringConfig"("clientId");
CREATE INDEX IF NOT EXISTS "LeadScoringConfig_tenantId_isActive_idx" ON "LeadScoringConfig"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "LeadScoringConfig_clientId_isActive_idx" ON "LeadScoringConfig"("clientId", "isActive");

-- ScoredLead indexes
CREATE UNIQUE INDEX IF NOT EXISTS "ScoredLead_configId_email_key" ON "ScoredLead"("configId", "email");
CREATE INDEX IF NOT EXISTS "ScoredLead_configId_scoreLevel_idx" ON "ScoredLead"("configId", "scoreLevel");
CREATE INDEX IF NOT EXISTS "ScoredLead_configId_score_idx" ON "ScoredLead"("configId", "score" DESC);
CREATE INDEX IF NOT EXISTS "ScoredLead_email_idx" ON "ScoredLead"("email");

-- LeadActivity indexes
CREATE INDEX IF NOT EXISTS "LeadActivity_configId_activityType_idx" ON "LeadActivity"("configId", "activityType");
CREATE INDEX IF NOT EXISTS "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "LeadActivity_createdAt_idx" ON "LeadActivity"("createdAt" DESC);

-- NurtureSequence indexes
CREATE INDEX IF NOT EXISTS "NurtureSequence_configId_isActive_idx" ON "NurtureSequence"("configId", "isActive");

-- NurtureEnrollment indexes
CREATE UNIQUE INDEX IF NOT EXISTS "NurtureEnrollment_sequenceId_leadId_key" ON "NurtureEnrollment"("sequenceId", "leadId");
CREATE INDEX IF NOT EXISTS "NurtureEnrollment_sequenceId_status_idx" ON "NurtureEnrollment"("sequenceId", "status");
CREATE INDEX IF NOT EXISTS "NurtureEnrollment_nextStepScheduledAt_idx" ON "NurtureEnrollment"("nextStepScheduledAt");

-- LeadScoringAnalytics indexes
CREATE UNIQUE INDEX IF NOT EXISTS "LeadScoringAnalytics_configId_date_key" ON "LeadScoringAnalytics"("configId", "date");
CREATE INDEX IF NOT EXISTS "LeadScoringAnalytics_configId_date_idx" ON "LeadScoringAnalytics"("configId", "date" DESC);

-- Lead Scoring foreign keys
DO $$ BEGIN
  ALTER TABLE "LeadScoringConfig" ADD CONSTRAINT "LeadScoringConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LeadScoringConfig" ADD CONSTRAINT "LeadScoringConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ScoredLead" ADD CONSTRAINT "ScoredLead_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LeadScoringConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LeadScoringConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ScoredLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NurtureSequence" ADD CONSTRAINT "NurtureSequence_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LeadScoringConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NurtureEnrollment" ADD CONSTRAINT "NurtureEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "NurtureSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NurtureEnrollment" ADD CONSTRAINT "NurtureEnrollment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ScoredLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================================================================
-- PART 4: ML Prediction Enums
-- ===========================================================================

-- LeadPredictionType enum
DO $$ BEGIN
  CREATE TYPE "LeadPredictionType" AS ENUM ('CONVERSION', 'TIME_TO_CLOSE', 'SCORE', 'PRIORITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- LeadPredictionStatus enum
DO $$ BEGIN
  CREATE TYPE "LeadPredictionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'VALIDATED', 'INVALIDATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- MLPredictionStatus enum
DO $$ BEGIN
  CREATE TYPE "MLPredictionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'VALIDATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ProjectMLPredictionType enum
DO $$ BEGIN
  CREATE TYPE "ProjectMLPredictionType" AS ENUM ('SUCCESS_PREDICTION', 'RISK_FORECAST', 'TIMELINE_PREDICTION', 'RESOURCE_OPTIMIZATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================================================================
-- PART 5: ML Prediction Tables
-- ===========================================================================

-- LeadTrainingData table
CREATE TABLE IF NOT EXISTS "LeadTrainingData" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "configId" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "didConvert" BOOLEAN NOT NULL,
    "daysToConvert" INTEGER,
    "actualValue" DECIMAL(12,2),
    "predictedScore" INTEGER NOT NULL,
    "predictedProb" DOUBLE PRECISION NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "conversionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadTrainingData_pkey" PRIMARY KEY ("id")
);

-- LeadMLModel table
CREATE TABLE IF NOT EXISTS "LeadMLModel" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "configId" INTEGER NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "hyperparameters" JSONB NOT NULL,
    "trainingDataCount" INTEGER NOT NULL,
    "trainedAt" TIMESTAMP(3) NOT NULL,
    "trainingDuration" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "recall" DOUBLE PRECISION,
    "f1Score" DOUBLE PRECISION,
    "auc" DOUBLE PRECISION,
    "featureWeights" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadMLModel_pkey" PRIMARY KEY ("id")
);

-- LeadMLPrediction table
CREATE TABLE IF NOT EXISTS "LeadMLPrediction" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "leadId" INTEGER NOT NULL,
    "modelId" INTEGER,
    "predictionType" "LeadPredictionType" NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "predictedValue" DECIMAL(12,2),
    "predictedDays" INTEGER,
    "riskFactors" JSONB NOT NULL,
    "explanation" TEXT,
    "recommendations" JSONB,
    "llmModel" TEXT,
    "llmTokensUsed" INTEGER,
    "llmLatencyMs" INTEGER,
    "llmCost" DECIMAL(8,6),
    "status" "LeadPredictionStatus" NOT NULL DEFAULT 'ACTIVE',
    "wasAccurate" BOOLEAN,
    "validatedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3) NOT NULL,
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadMLPrediction_pkey" PRIMARY KEY ("id")
);

-- ProjectMLPrediction table
CREATE TABLE IF NOT EXISTS "ProjectMLPrediction" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "predictionType" "ProjectMLPredictionType" NOT NULL,
    "status" "MLPredictionStatus" NOT NULL DEFAULT 'ACTIVE',
    "probability" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "predictionWindow" INTEGER NOT NULL,
    "riskFactors" JSONB NOT NULL,
    "explanation" TEXT,
    "recommendations" JSONB,
    "predictedEndDate" TIMESTAMP(3),
    "originalEndDate" TIMESTAMP(3),
    "daysVariance" INTEGER,
    "resourceRecommendations" JSONB,
    "workloadAnalysis" JSONB,
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "actualOutcome" BOOLEAN,
    "validatedAt" TIMESTAMP(3),
    "wasAccurate" BOOLEAN,
    "llmModel" TEXT,
    "llmTokensUsed" INTEGER,
    "llmCost" DOUBLE PRECISION,
    "generatedTaskId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMLPrediction_pkey" PRIMARY KEY ("id")
);

-- ===========================================================================
-- PART 6: ML Prediction Indexes
-- ===========================================================================

-- LeadTrainingData indexes
CREATE INDEX IF NOT EXISTS "LeadTrainingData_tenantId_configId_idx" ON "LeadTrainingData"("tenantId", "configId");
CREATE INDEX IF NOT EXISTS "LeadTrainingData_snapshotDate_idx" ON "LeadTrainingData"("snapshotDate");
CREATE INDEX IF NOT EXISTS "LeadTrainingData_didConvert_idx" ON "LeadTrainingData"("didConvert");

-- LeadMLModel indexes
CREATE INDEX IF NOT EXISTS "LeadMLModel_tenantId_configId_idx" ON "LeadMLModel"("tenantId", "configId");
CREATE INDEX IF NOT EXISTS "LeadMLModel_isActive_idx" ON "LeadMLModel"("isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "LeadMLModel_configId_modelType_isActive_key" ON "LeadMLModel"("configId", "modelType", "isActive");

-- LeadMLPrediction indexes
CREATE INDEX IF NOT EXISTS "LeadMLPrediction_tenantId_leadId_idx" ON "LeadMLPrediction"("tenantId", "leadId");
CREATE INDEX IF NOT EXISTS "LeadMLPrediction_predictionType_status_idx" ON "LeadMLPrediction"("predictionType", "status");
CREATE INDEX IF NOT EXISTS "LeadMLPrediction_validUntil_idx" ON "LeadMLPrediction"("validUntil");

-- ProjectMLPrediction indexes
CREATE INDEX IF NOT EXISTS "ProjectMLPrediction_projectId_predictionType_status_idx" ON "ProjectMLPrediction"("projectId", "predictionType", "status");
CREATE INDEX IF NOT EXISTS "ProjectMLPrediction_tenantId_predictionType_idx" ON "ProjectMLPrediction"("tenantId", "predictionType");
CREATE INDEX IF NOT EXISTS "ProjectMLPrediction_validUntil_status_idx" ON "ProjectMLPrediction"("validUntil", "status");

-- ===========================================================================
-- PART 7: ML Prediction Foreign Keys
-- ===========================================================================

-- LeadTrainingData foreign keys
DO $$ BEGIN
  ALTER TABLE "LeadTrainingData" ADD CONSTRAINT "LeadTrainingData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LeadTrainingData" ADD CONSTRAINT "LeadTrainingData_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LeadScoringConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- LeadMLModel foreign keys
DO $$ BEGIN
  ALTER TABLE "LeadMLModel" ADD CONSTRAINT "LeadMLModel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LeadMLModel" ADD CONSTRAINT "LeadMLModel_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LeadScoringConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- LeadMLPrediction foreign keys
DO $$ BEGIN
  ALTER TABLE "LeadMLPrediction" ADD CONSTRAINT "LeadMLPrediction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LeadMLPrediction" ADD CONSTRAINT "LeadMLPrediction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ScoredLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LeadMLPrediction" ADD CONSTRAINT "LeadMLPrediction_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "LeadMLModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ProjectMLPrediction foreign keys
DO $$ BEGIN
  ALTER TABLE "ProjectMLPrediction" ADD CONSTRAINT "ProjectMLPrediction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectMLPrediction" ADD CONSTRAINT "ProjectMLPrediction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
