-- Document Analyzer Upgrade Migration
-- Adds industry-specific templates, classification, routing, integrations, and analytics

-- Create new enums
CREATE TYPE "DocumentCategory" AS ENUM ('INVOICE', 'CONTRACT', 'COMPLIANCE', 'HEALTHCARE', 'LEGAL', 'FINANCIAL', 'REAL_ESTATE', 'MANUFACTURING', 'GENERAL', 'OTHER');
CREATE TYPE "IndustryType" AS ENUM ('HEALTHCARE', 'LEGAL', 'FINANCIAL_SERVICES', 'REAL_ESTATE', 'MANUFACTURING', 'RETAIL', 'PROFESSIONAL_SERVICES', 'TECHNOLOGY', 'CONSTRUCTION', 'EDUCATION', 'GOVERNMENT', 'NONPROFIT', 'OTHER');
CREATE TYPE "IntegrationType" AS ENUM ('QUICKBOOKS', 'XERO', 'SALESFORCE', 'DOCUSIGN', 'GOOGLE_DRIVE', 'SHAREPOINT', 'DROPBOX', 'SLACK', 'WEBHOOK', 'API');
CREATE TYPE "WorkflowActionType" AS ENUM ('ROUTE_TO_USER', 'ROUTE_TO_DEPARTMENT', 'SEND_NOTIFICATION', 'TRIGGER_INTEGRATION', 'MARK_FOR_REVIEW', 'AUTO_APPROVE', 'ESCALATE');

-- Add new columns to DocumentAnalyzerConfig
ALTER TABLE "DocumentAnalyzerConfig" ADD COLUMN "industryType" "IndustryType" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "DocumentAnalyzerConfig" ADD COLUMN "enabledCategories" "DocumentCategory"[] DEFAULT ARRAY['GENERAL']::"DocumentCategory"[];
ALTER TABLE "DocumentAnalyzerConfig" ADD COLUMN "enableAutoClassification" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DocumentAnalyzerConfig" ADD COLUMN "enableAutoRouting" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DocumentAnalyzerConfig" ADD COLUMN "classificationThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85;
ALTER TABLE "DocumentAnalyzerConfig" ADD COLUMN "openaiApiKey" TEXT;

-- Add new columns to AnalyzedDocument
ALTER TABLE "AnalyzedDocument" ADD COLUMN "riskScore" DOUBLE PRECISION;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "industryCategory" TEXT;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "assignedTo" INTEGER;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "assignedDepartment" TEXT;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "workflowStatus" TEXT;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "priority" TEXT DEFAULT 'NORMAL';
ALTER TABLE "AnalyzedDocument" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "AnalyzedDocument" ADD COLUMN "totalAmount" DOUBLE PRECISION;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "currency" TEXT;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "vendorName" TEXT;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "paymentTerms" TEXT;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "contractParties" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AnalyzedDocument" ADD COLUMN "effectiveDate" TIMESTAMP(3);
ALTER TABLE "AnalyzedDocument" ADD COLUMN "expirationDate" TIMESTAMP(3);
ALTER TABLE "AnalyzedDocument" ADD COLUMN "autoRenewal" BOOLEAN;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "syncedToIntegrations" JSONB;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AnalyzedDocument" ADD COLUMN "lastRetryAt" TIMESTAMP(3);
ALTER TABLE "AnalyzedDocument" ADD COLUMN "queuedAt" TIMESTAMP(3);
ALTER TABLE "AnalyzedDocument" ADD COLUMN "processingStartedAt" TIMESTAMP(3);

-- Change category column type in AnalyzedDocument (was String, now enum)
ALTER TABLE "AnalyzedDocument" DROP COLUMN IF EXISTS "category";
ALTER TABLE "AnalyzedDocument" ADD COLUMN "category" "DocumentCategory";

-- Add new columns to ExtractionTemplate
ALTER TABLE "ExtractionTemplate" ADD COLUMN "category" "DocumentCategory" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "ExtractionTemplate" ADD COLUMN "industryType" "IndustryType";
ALTER TABLE "ExtractionTemplate" ADD COLUMN "isBuiltIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExtractionTemplate" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExtractionTemplate" ADD COLUMN "fieldDefinitions" JSONB;
ALTER TABLE "ExtractionTemplate" ADD COLUMN "complianceRules" JSONB;
ALTER TABLE "ExtractionTemplate" ADD COLUMN "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8;
ALTER TABLE "ExtractionTemplate" ADD COLUMN "version" TEXT NOT NULL DEFAULT '1.0.0';
ALTER TABLE "ExtractionTemplate" ADD COLUMN "previousVersionId" INTEGER;
ALTER TABLE "ExtractionTemplate" ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ExtractionTemplate" ADD COLUMN "successRate" DOUBLE PRECISION;

-- Make configId optional for built-in templates
ALTER TABLE "ExtractionTemplate" ALTER COLUMN "configId" DROP NOT NULL;

-- Create DocumentWorkflow table
CREATE TABLE "DocumentWorkflow" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "triggerConditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "categories" "DocumentCategory"[] DEFAULT ARRAY[]::"DocumentCategory"[],
    "documentTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notifyOnTrigger" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "lastExecutedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentWorkflow_pkey" PRIMARY KEY ("id")
);

-- Create DocumentIntegration table
CREATE TABLE "DocumentIntegration" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "integrationType" "IntegrationType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "settings" JSONB,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "syncDirection" TEXT NOT NULL DEFAULT 'EXPORT',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "fieldMappings" JSONB,
    "documentsExported" INTEGER NOT NULL DEFAULT 0,
    "documentsImported" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentIntegration_pkey" PRIMARY KEY ("id")
);

-- Create ProcessingMetrics table
CREATE TABLE "ProcessingMetrics" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'DAILY',
    "documentsProcessed" INTEGER NOT NULL DEFAULT 0,
    "documentsSuccessful" INTEGER NOT NULL DEFAULT 0,
    "documentsFailed" INTEGER NOT NULL DEFAULT 0,
    "documentsManualReview" INTEGER NOT NULL DEFAULT 0,
    "categoryBreakdown" JSONB,
    "totalProcessingTime" INTEGER NOT NULL DEFAULT 0,
    "avgProcessingTime" DOUBLE PRECISION,
    "minProcessingTime" INTEGER,
    "maxProcessingTime" INTEGER,
    "avgConfidence" DOUBLE PRECISION,
    "fieldsExtracted" INTEGER NOT NULL DEFAULT 0,
    "fieldsVerified" INTEGER NOT NULL DEFAULT 0,
    "compliancePassRate" DOUBLE PRECISION,
    "complianceWarnings" INTEGER NOT NULL DEFAULT 0,
    "complianceFailures" INTEGER NOT NULL DEFAULT 0,
    "estimatedTimeSaved" INTEGER,
    "estimatedCostSaved" DOUBLE PRECISION,
    "integrationSyncs" INTEGER NOT NULL DEFAULT 0,
    "integrationErrors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingMetrics_pkey" PRIMARY KEY ("id")
);

-- Create ComplianceRuleSet table
CREATE TABLE "ComplianceRuleSet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "industries" "IndustryType"[] DEFAULT ARRAY[]::"IndustryType"[],
    "categories" "DocumentCategory"[] DEFAULT ARRAY[]::"DocumentCategory"[],
    "rules" JSONB NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "adoptionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRuleSet_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "DocumentWorkflow" ADD CONSTRAINT "DocumentWorkflow_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentIntegration" ADD CONSTRAINT "DocumentIntegration_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcessingMetrics" ADD CONSTRAINT "ProcessingMetrics_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraints
CREATE UNIQUE INDEX "DocumentIntegration_configId_integrationType_key" ON "DocumentIntegration"("configId", "integrationType");
CREATE UNIQUE INDEX "ProcessingMetrics_configId_periodStart_periodType_key" ON "ProcessingMetrics"("configId", "periodStart", "periodType");
CREATE UNIQUE INDEX "ComplianceRuleSet_code_key" ON "ComplianceRuleSet"("code");

-- Add indexes
CREATE INDEX "DocumentAnalyzerConfig_industryType_idx" ON "DocumentAnalyzerConfig"("industryType");
CREATE INDEX "AnalyzedDocument_configId_category_idx" ON "AnalyzedDocument"("configId", "category");
CREATE INDEX "AnalyzedDocument_assignedTo_status_idx" ON "AnalyzedDocument"("assignedTo", "status");
CREATE INDEX "AnalyzedDocument_priority_status_idx" ON "AnalyzedDocument"("priority", "status");
CREATE INDEX "ExtractionTemplate_category_industryType_idx" ON "ExtractionTemplate"("category", "industryType");
CREATE INDEX "ExtractionTemplate_isBuiltIn_isActive_idx" ON "ExtractionTemplate"("isBuiltIn", "isActive");
CREATE INDEX "DocumentWorkflow_configId_isActive_idx" ON "DocumentWorkflow"("configId", "isActive");
CREATE INDEX "DocumentWorkflow_categories_idx" ON "DocumentWorkflow"("categories");
CREATE INDEX "DocumentIntegration_configId_isActive_idx" ON "DocumentIntegration"("configId", "isActive");
CREATE INDEX "DocumentIntegration_integrationType_idx" ON "DocumentIntegration"("integrationType");
CREATE INDEX "ProcessingMetrics_configId_periodType_idx" ON "ProcessingMetrics"("configId", "periodType");
CREATE INDEX "ProcessingMetrics_periodStart_periodEnd_idx" ON "ProcessingMetrics"("periodStart", "periodEnd");
CREATE INDEX "ComplianceRuleSet_code_idx" ON "ComplianceRuleSet"("code");
CREATE INDEX "ComplianceRuleSet_industries_idx" ON "ComplianceRuleSet"("industries");
CREATE INDEX "ComplianceRuleSet_isBuiltIn_isActive_idx" ON "ComplianceRuleSet"("isBuiltIn", "isActive");
