-- CreateEnum: Lead ML enums
CREATE TYPE "LeadPredictionType" AS ENUM ('CONVERSION', 'TIME_TO_CLOSE', 'SCORE', 'PRIORITY');

-- CreateEnum
CREATE TYPE "LeadPredictionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'VALIDATED', 'INVALIDATED');

-- CreateEnum: Project ML enums
CREATE TYPE "MLPredictionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'VALIDATED');

-- CreateEnum
CREATE TYPE "ProjectMLPredictionType" AS ENUM ('SUCCESS_PREDICTION', 'RISK_FORECAST', 'TIMELINE_PREDICTION', 'RESOURCE_OPTIMIZATION');

-- CreateTable: Lead Training Data
CREATE TABLE "LeadTrainingData" (
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

-- CreateTable: Lead ML Model
CREATE TABLE "LeadMLModel" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadMLModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Lead ML Prediction
CREATE TABLE "LeadMLPrediction" (
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

-- CreateTable: Project ML Prediction
CREATE TABLE "ProjectMLPrediction" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMLPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: LeadTrainingData indexes
CREATE INDEX "LeadTrainingData_tenantId_configId_idx" ON "LeadTrainingData"("tenantId", "configId");
CREATE INDEX "LeadTrainingData_snapshotDate_idx" ON "LeadTrainingData"("snapshotDate");
CREATE INDEX "LeadTrainingData_didConvert_idx" ON "LeadTrainingData"("didConvert");

-- CreateIndex: LeadMLModel indexes
CREATE INDEX "LeadMLModel_tenantId_configId_idx" ON "LeadMLModel"("tenantId", "configId");
CREATE INDEX "LeadMLModel_isActive_idx" ON "LeadMLModel"("isActive");
CREATE UNIQUE INDEX "LeadMLModel_configId_modelType_isActive_key" ON "LeadMLModel"("configId", "modelType", "isActive");

-- CreateIndex: LeadMLPrediction indexes
CREATE INDEX "LeadMLPrediction_tenantId_leadId_idx" ON "LeadMLPrediction"("tenantId", "leadId");
CREATE INDEX "LeadMLPrediction_predictionType_status_idx" ON "LeadMLPrediction"("predictionType", "status");
CREATE INDEX "LeadMLPrediction_validUntil_idx" ON "LeadMLPrediction"("validUntil");

-- CreateIndex: ProjectMLPrediction indexes
CREATE INDEX "ProjectMLPrediction_projectId_predictionType_status_idx" ON "ProjectMLPrediction"("projectId", "predictionType", "status");
CREATE INDEX "ProjectMLPrediction_tenantId_predictionType_idx" ON "ProjectMLPrediction"("tenantId", "predictionType");
CREATE INDEX "ProjectMLPrediction_validUntil_status_idx" ON "ProjectMLPrediction"("validUntil", "status");

-- AddForeignKey: LeadTrainingData
ALTER TABLE "LeadTrainingData" ADD CONSTRAINT "LeadTrainingData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadTrainingData" ADD CONSTRAINT "LeadTrainingData_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LeadScoringConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LeadMLModel
ALTER TABLE "LeadMLModel" ADD CONSTRAINT "LeadMLModel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadMLModel" ADD CONSTRAINT "LeadMLModel_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LeadScoringConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LeadMLPrediction
ALTER TABLE "LeadMLPrediction" ADD CONSTRAINT "LeadMLPrediction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadMLPrediction" ADD CONSTRAINT "LeadMLPrediction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ScoredLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadMLPrediction" ADD CONSTRAINT "LeadMLPrediction_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "LeadMLModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ProjectMLPrediction
ALTER TABLE "ProjectMLPrediction" ADD CONSTRAINT "ProjectMLPrediction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMLPrediction" ADD CONSTRAINT "ProjectMLPrediction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
