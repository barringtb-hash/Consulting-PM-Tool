-- Document Analyzer Migration
-- Creates Document Analyzer tables with industry-specific templates, classification, routing, integrations, and analytics

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE "DocumentFormat" AS ENUM ('PDF', 'DOCX', 'DOC', 'XLSX', 'XLS', 'PNG', 'JPG', 'TIFF', 'HTML', 'TXT', 'CSV', 'JSON', 'XML', 'OTHER');
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW');
CREATE TYPE "ComplianceLevel" AS ENUM ('PASS', 'WARNING', 'FAIL');
CREATE TYPE "BatchJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "DocumentCategory" AS ENUM ('INVOICE', 'CONTRACT', 'COMPLIANCE', 'HEALTHCARE', 'LEGAL', 'FINANCIAL', 'REAL_ESTATE', 'MANUFACTURING', 'GENERAL', 'OTHER');
CREATE TYPE "IndustryType" AS ENUM ('HEALTHCARE', 'LEGAL', 'FINANCIAL_SERVICES', 'REAL_ESTATE', 'MANUFACTURING', 'RETAIL', 'PROFESSIONAL_SERVICES', 'TECHNOLOGY', 'CONSTRUCTION', 'EDUCATION', 'GOVERNMENT', 'NONPROFIT', 'OTHER');
CREATE TYPE "IntegrationType" AS ENUM ('QUICKBOOKS', 'XERO', 'SALESFORCE', 'DOCUSIGN', 'GOOGLE_DRIVE', 'SHAREPOINT', 'DROPBOX', 'SLACK', 'WEBHOOK', 'API');
CREATE TYPE "WorkflowActionType" AS ENUM ('ROUTE_TO_USER', 'ROUTE_TO_DEPARTMENT', 'SEND_NOTIFICATION', 'TRIGGER_INTEGRATION', 'MARK_FOR_REVIEW', 'AUTO_APPROVE', 'ESCALATE');

-- ============================================================================
-- BASE TABLES
-- ============================================================================

-- DocumentAnalyzerConfig
CREATE TABLE "DocumentAnalyzerConfig" (
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
CREATE TABLE "AnalyzedDocument" (
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
CREATE TABLE "ExtractionTemplate" (
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
CREATE TABLE "DocumentBatchJob" (
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

-- ============================================================================
-- NEW TABLES FOR UPGRADE
-- ============================================================================

-- DocumentWorkflow
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

-- DocumentIntegration
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

-- ProcessingMetrics
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

-- ComplianceRuleSet
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

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

ALTER TABLE "DocumentAnalyzerConfig" ADD CONSTRAINT "DocumentAnalyzerConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyzedDocument" ADD CONSTRAINT "AnalyzedDocument_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtractionTemplate" ADD CONSTRAINT "ExtractionTemplate_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentBatchJob" ADD CONSTRAINT "DocumentBatchJob_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentBatchJob" ADD CONSTRAINT "DocumentBatchJob_extractionTemplateId_fkey" FOREIGN KEY ("extractionTemplateId") REFERENCES "ExtractionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentWorkflow" ADD CONSTRAINT "DocumentWorkflow_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentIntegration" ADD CONSTRAINT "DocumentIntegration_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcessingMetrics" ADD CONSTRAINT "ProcessingMetrics_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DocumentAnalyzerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

CREATE UNIQUE INDEX "DocumentAnalyzerConfig_clientId_key" ON "DocumentAnalyzerConfig"("clientId");
CREATE UNIQUE INDEX "DocumentIntegration_configId_integrationType_key" ON "DocumentIntegration"("configId", "integrationType");
CREATE UNIQUE INDEX "ProcessingMetrics_configId_periodStart_periodType_key" ON "ProcessingMetrics"("configId", "periodStart", "periodType");
CREATE UNIQUE INDEX "ComplianceRuleSet_code_key" ON "ComplianceRuleSet"("code");

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX "DocumentAnalyzerConfig_clientId_isActive_idx" ON "DocumentAnalyzerConfig"("clientId", "isActive");
CREATE INDEX "DocumentAnalyzerConfig_industryType_idx" ON "DocumentAnalyzerConfig"("industryType");
CREATE INDEX "AnalyzedDocument_configId_status_idx" ON "AnalyzedDocument"("configId", "status");
CREATE INDEX "AnalyzedDocument_configId_category_idx" ON "AnalyzedDocument"("configId", "category");
CREATE INDEX "AnalyzedDocument_assignedTo_status_idx" ON "AnalyzedDocument"("assignedTo", "status");
CREATE INDEX "AnalyzedDocument_priority_status_idx" ON "AnalyzedDocument"("priority", "status");
CREATE INDEX "ExtractionTemplate_configId_isActive_idx" ON "ExtractionTemplate"("configId", "isActive");
CREATE INDEX "ExtractionTemplate_category_industryType_idx" ON "ExtractionTemplate"("category", "industryType");
CREATE INDEX "ExtractionTemplate_isBuiltIn_isActive_idx" ON "ExtractionTemplate"("isBuiltIn", "isActive");
CREATE INDEX "DocumentBatchJob_configId_status_idx" ON "DocumentBatchJob"("configId", "status");
CREATE INDEX "DocumentWorkflow_configId_isActive_idx" ON "DocumentWorkflow"("configId", "isActive");
CREATE INDEX "DocumentWorkflow_categories_idx" ON "DocumentWorkflow"("categories");
CREATE INDEX "DocumentIntegration_configId_isActive_idx" ON "DocumentIntegration"("configId", "isActive");
CREATE INDEX "DocumentIntegration_integrationType_idx" ON "DocumentIntegration"("integrationType");
CREATE INDEX "ProcessingMetrics_configId_periodType_idx" ON "ProcessingMetrics"("configId", "periodType");
CREATE INDEX "ProcessingMetrics_periodStart_periodEnd_idx" ON "ProcessingMetrics"("periodStart", "periodEnd");
CREATE INDEX "ComplianceRuleSet_code_idx" ON "ComplianceRuleSet"("code");
CREATE INDEX "ComplianceRuleSet_industries_idx" ON "ComplianceRuleSet"("industries");
CREATE INDEX "ComplianceRuleSet_isBuiltIn_isActive_idx" ON "ComplianceRuleSet"("isBuiltIn", "isActive");
