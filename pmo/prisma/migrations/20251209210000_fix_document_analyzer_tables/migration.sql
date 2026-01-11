-- Fix Document Analyzer Tables Migration
-- This migration creates Document Analyzer tables if they don't already exist
-- It's idempotent to handle partial application of the previous migration

-- ============================================================================
-- ENUMS (Create if not exist)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE "DocumentFormat" AS ENUM ('PDF', 'DOCX', 'DOC', 'XLSX', 'XLS', 'PNG', 'JPG', 'TIFF', 'HTML', 'TXT', 'CSV', 'JSON', 'XML', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplianceLevel" AS ENUM ('PASS', 'WARNING', 'FAIL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BatchJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DocumentCategory" AS ENUM ('INVOICE', 'CONTRACT', 'COMPLIANCE', 'HEALTHCARE', 'LEGAL', 'FINANCIAL', 'REAL_ESTATE', 'MANUFACTURING', 'GENERAL', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IndustryType" AS ENUM ('HEALTHCARE', 'LEGAL', 'FINANCIAL_SERVICES', 'REAL_ESTATE', 'MANUFACTURING', 'RETAIL', 'PROFESSIONAL_SERVICES', 'TECHNOLOGY', 'CONSTRUCTION', 'EDUCATION', 'GOVERNMENT', 'NONPROFIT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IntegrationType" AS ENUM ('QUICKBOOKS', 'XERO', 'SALESFORCE', 'DOCUSIGN', 'GOOGLE_DRIVE', 'SHAREPOINT', 'DROPBOX', 'SLACK', 'WEBHOOK', 'API');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WorkflowActionType" AS ENUM ('ROUTE_TO_USER', 'ROUTE_TO_DEPARTMENT', 'SEND_NOTIFICATION', 'TRIGGER_INTEGRATION', 'MARK_FOR_REVIEW', 'AUTO_APPROVE', 'ESCALATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- BASE TABLES (Create if not exist)
-- ============================================================================

-- DocumentAnalyzerConfig
CREATE TABLE IF NOT EXISTS "DocumentAnalyzerConfig" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "industryType" "IndustryType" NOT NULL DEFAULT 'OTHER',
    "enabledCategories" "DocumentCategory"[] DEFAULT ARRAY['GENERAL']::"DocumentCategory"[],
    "enableOCR" BOOLEAN NOT NULL DEFAULT true,
    "enableNER" BOOLEAN NOT NULL DEFAULT true,
    "enableCompliance" BOOLEAN NOT NULL DEFAULT true,
    "enableVersionCompare" BOOLEAN NOT NULL DEFAULT false,
    "enableAutoClassification" BOOLEAN NOT NULL DEFAULT true,
    "enableAutoRouting" BOOLEAN NOT NULL DEFAULT false,
    "classificationThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "defaultExtractionFields" JSONB,
    "complianceRules" JSONB,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "googleVisionApiKey" TEXT,
    "azureFormRecognizerKey" TEXT,
    "openaiApiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentAnalyzerConfig_pkey" PRIMARY KEY ("id")
);

-- AnalyzedDocument
CREATE TABLE IF NOT EXISTS "AnalyzedDocument" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "format" "DocumentFormat" NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "analyzedAt" TIMESTAMP(3),
    "analysisTimeMs" INTEGER,
    "ocrText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "pageCount" INTEGER,
    "extractedFields" JSONB,
    "namedEntities" JSONB,
    "complianceStatus" "ComplianceLevel",
    "complianceFlags" JSONB,
    "riskScore" DOUBLE PRECISION,
    "documentType" TEXT,
    "documentTypeConfidence" DOUBLE PRECISION,
    "category" "DocumentCategory",
    "industryCategory" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedTo" INTEGER,
    "assignedDepartment" TEXT,
    "workflowStatus" TEXT,
    "priority" TEXT DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION,
    "currency" TEXT,
    "vendorName" TEXT,
    "invoiceNumber" TEXT,
    "paymentTerms" TEXT,
    "contractParties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "autoRenewal" BOOLEAN,
    "syncedToIntegrations" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "processingStartedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyzedDocument_pkey" PRIMARY KEY ("id")
);

-- ExtractionTemplate
CREATE TABLE IF NOT EXISTS "ExtractionTemplate" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "documentType" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'GENERAL',
    "industryType" "IndustryType",
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "extractionRules" JSONB NOT NULL,
    "fieldDefinitions" JSONB,
    "complianceRules" JSONB,
    "validationRules" JSONB,
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "previousVersionId" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractionTemplate_pkey" PRIMARY KEY ("id")
);

-- DocumentBatchJob
CREATE TABLE IF NOT EXISTS "DocumentBatchJob" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "BatchJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "processedDocuments" INTEGER NOT NULL DEFAULT 0,
    "successfulDocuments" INTEGER NOT NULL DEFAULT 0,
    "failedDocuments" INTEGER NOT NULL DEFAULT 0,
    "sourceFolder" TEXT,
    "destinationFolder" TEXT,
    "extractionTemplateId" INTEGER,
    "settings" JSONB,
    "errorLog" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentBatchJob_pkey" PRIMARY KEY ("id")
);

-- DocumentWorkflow
CREATE TABLE IF NOT EXISTS "DocumentWorkflow" (
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

-- DocumentIntegration
CREATE TABLE IF NOT EXISTS "DocumentIntegration" (
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

-- ProcessingMetrics
CREATE TABLE IF NOT EXISTS "ProcessingMetrics" (
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

-- ComplianceRuleSet
CREATE TABLE IF NOT EXISTS "ComplianceRuleSet" (
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

-- ============================================================================
-- FOREIGN KEYS (Add if not exist using DO blocks)
-- ============================================================================

DO $$ BEGIN
    ALTER TABLE "DocumentAnalyzerConfig" ADD CONSTRAINT "DocumentAnalyzerConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AnalyzedDocument" ADD CONSTRAINT "AnalyzedDocument_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ExtractionTemplate" ADD CONSTRAINT "ExtractionTemplate_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DocumentBatchJob" ADD CONSTRAINT "DocumentBatchJob_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DocumentBatchJob" ADD CONSTRAINT "DocumentBatchJob_extractionTemplateId_fkey" FOREIGN KEY ("extractionTemplateId") REFERENCES "ExtractionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DocumentWorkflow" ADD CONSTRAINT "DocumentWorkflow_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DocumentIntegration" ADD CONSTRAINT "DocumentIntegration_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProcessingMetrics" ADD CONSTRAINT "ProcessingMetrics_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- UNIQUE CONSTRAINTS (Create if not exist)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentAnalyzerConfig_clientId_key" ON "DocumentAnalyzerConfig"("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentIntegration_configId_integrationType_key" ON "DocumentIntegration"("configId", "integrationType");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcessingMetrics_configId_periodStart_periodType_key" ON "ProcessingMetrics"("configId", "periodStart", "periodType");
CREATE UNIQUE INDEX IF NOT EXISTS "ComplianceRuleSet_code_key" ON "ComplianceRuleSet"("code");

-- ============================================================================
-- INDEXES (Create if not exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS "DocumentAnalyzerConfig_clientId_isActive_idx" ON "DocumentAnalyzerConfig"("clientId", "isActive");
CREATE INDEX IF NOT EXISTS "DocumentAnalyzerConfig_industryType_idx" ON "DocumentAnalyzerConfig"("industryType");
CREATE INDEX IF NOT EXISTS "AnalyzedDocument_configId_status_idx" ON "AnalyzedDocument"("configId", "status");
CREATE INDEX IF NOT EXISTS "AnalyzedDocument_configId_category_idx" ON "AnalyzedDocument"("configId", "category");
CREATE INDEX IF NOT EXISTS "AnalyzedDocument_assignedTo_status_idx" ON "AnalyzedDocument"("assignedTo", "status");
CREATE INDEX IF NOT EXISTS "AnalyzedDocument_priority_status_idx" ON "AnalyzedDocument"("priority", "status");
CREATE INDEX IF NOT EXISTS "ExtractionTemplate_configId_isActive_idx" ON "ExtractionTemplate"("configId", "isActive");
CREATE INDEX IF NOT EXISTS "ExtractionTemplate_category_industryType_idx" ON "ExtractionTemplate"("category", "industryType");
CREATE INDEX IF NOT EXISTS "ExtractionTemplate_isBuiltIn_isActive_idx" ON "ExtractionTemplate"("isBuiltIn", "isActive");
CREATE INDEX IF NOT EXISTS "DocumentBatchJob_configId_status_idx" ON "DocumentBatchJob"("configId", "status");
CREATE INDEX IF NOT EXISTS "DocumentWorkflow_configId_isActive_idx" ON "DocumentWorkflow"("configId", "isActive");
CREATE INDEX IF NOT EXISTS "DocumentWorkflow_categories_idx" ON "DocumentWorkflow"("categories");
CREATE INDEX IF NOT EXISTS "DocumentIntegration_configId_isActive_idx" ON "DocumentIntegration"("configId", "isActive");
CREATE INDEX IF NOT EXISTS "DocumentIntegration_integrationType_idx" ON "DocumentIntegration"("integrationType");
CREATE INDEX IF NOT EXISTS "ProcessingMetrics_configId_periodType_idx" ON "ProcessingMetrics"("configId", "periodType");
CREATE INDEX IF NOT EXISTS "ProcessingMetrics_periodStart_periodEnd_idx" ON "ProcessingMetrics"("periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS "ComplianceRuleSet_code_idx" ON "ComplianceRuleSet"("code");
CREATE INDEX IF NOT EXISTS "ComplianceRuleSet_industries_idx" ON "ComplianceRuleSet"("industries");
CREATE INDEX IF NOT EXISTS "ComplianceRuleSet_isBuiltIn_isActive_idx" ON "ComplianceRuleSet"("isBuiltIn", "isActive");
