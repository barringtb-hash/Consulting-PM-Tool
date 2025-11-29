-- Phase 1 AI Tools Migration
-- Tool 1.1: Customer Service Chatbot
-- Tool 1.2: Product Description Generator
-- Tool 1.3: AI Scheduling Assistant
-- Tool 1.4: Client Intake Automator

-- ============================================================================
-- ENUMS FOR PHASE 1 AI TOOLS
-- ============================================================================

-- Tool 1.1: Customer Service Chatbot Enums
CREATE TYPE "ChatChannel" AS ENUM ('WEB', 'SMS', 'FACEBOOK_MESSENGER', 'WHATSAPP', 'INSTAGRAM_DM', 'EMAIL');
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'WAITING_CUSTOMER', 'WAITING_AGENT', 'ESCALATED', 'RESOLVED', 'CLOSED');
CREATE TYPE "MessageSender" AS ENUM ('CUSTOMER', 'BOT', 'AGENT');
CREATE TYPE "IntentType" AS ENUM ('ORDER_STATUS', 'RETURN_REQUEST', 'PRODUCT_INQUIRY', 'FAQ', 'COMPLAINT', 'GENERAL', 'ESCALATION', 'UNKNOWN');

-- Tool 1.2: Product Description Generator Enums
CREATE TYPE "Marketplace" AS ENUM ('GENERIC', 'AMAZON', 'EBAY', 'SHOPIFY', 'ETSY', 'WALMART', 'WOOCOMMERCE');
CREATE TYPE "GenerationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Tool 1.3: AI Scheduling Assistant Enums
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');
CREATE TYPE "ReminderChannel" AS ENUM ('SMS', 'EMAIL', 'PUSH');
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- Tool 1.4: Client Intake Automator Enums
CREATE TYPE "IntakeFormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'NUMBER', 'DATE', 'TIME', 'DATETIME', 'SELECT', 'MULTISELECT', 'CHECKBOX', 'RADIO', 'FILE_UPLOAD', 'SIGNATURE', 'ADDRESS', 'SSN_LAST4', 'INSURANCE_INFO');
CREATE TYPE "SubmissionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_RESUBMISSION');
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW');
CREATE TYPE "WorkflowStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'BLOCKED');

-- ============================================================================
-- TOOL 1.1: CUSTOMER SERVICE CHATBOT TABLES
-- ============================================================================

-- ChatbotConfig
CREATE TABLE "ChatbotConfig" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "welcomeMessage" TEXT,
    "fallbackMessage" TEXT,
    "enableOrderTracking" BOOLEAN NOT NULL DEFAULT true,
    "enableReturns" BOOLEAN NOT NULL DEFAULT true,
    "enableFAQ" BOOLEAN NOT NULL DEFAULT true,
    "enableHumanHandoff" BOOLEAN NOT NULL DEFAULT true,
    "channelSettings" JSONB,
    "businessHours" JSONB,
    "shopifyApiKey" TEXT,
    "woocommerceApiKey" TEXT,
    "zendeskApiKey" TEXT,
    "freshdeskApiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotConfig_pkey" PRIMARY KEY ("id")
);

-- ChatConversation
CREATE TABLE "ChatConversation" (
    "id" SERIAL NOT NULL,
    "chatbotConfigId" INTEGER NOT NULL,
    "channel" "ChatChannel" NOT NULL DEFAULT 'WEB',
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "customerEmail" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "externalCustomerId" TEXT,
    "sessionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "escalatedToAgentId" INTEGER,
    "escalationReason" TEXT,
    "satisfactionRating" INTEGER,
    "satisfactionFeedback" TEXT,
    "orderNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- ChatMessage
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "content" TEXT NOT NULL,
    "detectedIntent" "IntentType",
    "intentConfidence" DOUBLE PRECISION,
    "sentiment" DOUBLE PRECISION,
    "suggestedActions" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- KnowledgeBaseItem
CREATE TABLE "KnowledgeBaseItem" (
    "id" SERIAL NOT NULL,
    "chatbotConfigId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBaseItem_pkey" PRIMARY KEY ("id")
);

-- ChatAnalytics
CREATE TABLE "ChatAnalytics" (
    "id" SERIAL NOT NULL,
    "chatbotConfigId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "totalConversations" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "uniqueCustomers" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeMs" INTEGER,
    "avgConversationLength" INTEGER,
    "resolvedByBot" INTEGER NOT NULL DEFAULT 0,
    "escalatedToAgent" INTEGER NOT NULL DEFAULT 0,
    "abandonedByCustomer" INTEGER NOT NULL DEFAULT 0,
    "avgSatisfactionRating" DOUBLE PRECISION,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "intentBreakdown" JSONB,
    "channelBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatAnalytics_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- TOOL 1.2: PRODUCT DESCRIPTION GENERATOR TABLES
-- ============================================================================

-- ProductDescriptionConfig
CREATE TABLE "ProductDescriptionConfig" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "defaultTone" TEXT,
    "defaultLength" TEXT,
    "brandVoiceProfile" JSONB,
    "enableSEO" BOOLEAN NOT NULL DEFAULT true,
    "targetKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shopifyApiKey" TEXT,
    "amazonMwsCredentials" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDescriptionConfig_pkey" PRIMARY KEY ("id")
);

-- Product
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "attributes" JSONB,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceDescription" TEXT,
    "shopifyProductId" TEXT,
    "amazonAsin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- ProductDescription
CREATE TABLE "ProductDescription" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "title" TEXT,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "bulletPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marketplace" "Marketplace" NOT NULL DEFAULT 'GENERIC',
    "variant" TEXT,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDescription_pkey" PRIMARY KEY ("id")
);

-- DescriptionTemplate
CREATE TABLE "DescriptionTemplate" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "titleTemplate" TEXT,
    "shortDescTemplate" TEXT,
    "longDescTemplate" TEXT,
    "bulletTemplate" TEXT,
    "marketplace" "Marketplace" NOT NULL DEFAULT 'GENERIC',
    "category" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DescriptionTemplate_pkey" PRIMARY KEY ("id")
);

-- BulkGenerationJob
CREATE TABLE "BulkGenerationJob" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "successfulItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "marketplace" "Marketplace" NOT NULL DEFAULT 'GENERIC',
    "templateId" INTEGER,
    "settings" JSONB,
    "inputFileUrl" TEXT,
    "outputFileUrl" TEXT,
    "errorLog" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkGenerationJob_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- TOOL 1.3: AI SCHEDULING ASSISTANT TABLES
-- ============================================================================

-- SchedulingConfig
CREATE TABLE "SchedulingConfig" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "practiceName" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "minAdvanceBookingHours" INTEGER NOT NULL DEFAULT 24,
    "maxAdvanceBookingDays" INTEGER NOT NULL DEFAULT 90,
    "defaultSlotDurationMin" INTEGER NOT NULL DEFAULT 30,
    "bufferBetweenSlotsMin" INTEGER NOT NULL DEFAULT 0,
    "enableReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderHoursBefore" INTEGER[] DEFAULT ARRAY[24, 2]::INTEGER[],
    "enableNoShowPrediction" BOOLEAN NOT NULL DEFAULT true,
    "noShowThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "enableOverbooking" BOOLEAN NOT NULL DEFAULT false,
    "enableWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "isHipaaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twilioAccountSid" TEXT,
    "twilioAuthToken" TEXT,
    "sendgridApiKey" TEXT,
    "googleCalendarCreds" JSONB,
    "outlookCalendarCreds" JSONB,
    "ehrSystem" TEXT,
    "ehrCredentials" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingConfig_pkey" PRIMARY KEY ("id")
);

-- Provider
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "specialty" TEXT,
    "externalProviderId" TEXT,
    "npiNumber" TEXT,
    "availabilitySchedule" JSONB,
    "availabilityOverrides" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- AppointmentType
CREATE TABLE "AppointmentType" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "price" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'USD',
    "requiresDeposit" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" DECIMAL(10,2),
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentType_pkey" PRIMARY KEY ("id")
);

-- Appointment
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "providerId" INTEGER,
    "appointmentTypeId" INTEGER,
    "patientName" TEXT NOT NULL,
    "patientEmail" TEXT,
    "patientPhone" TEXT,
    "externalPatientId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "confirmedAt" TIMESTAMP(3),
    "confirmationMethod" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "rescheduledFrom" INTEGER,
    "rescheduledTo" INTEGER,
    "noShowRiskScore" DOUBLE PRECISION,
    "noShowPredictedAt" TIMESTAMP(3),
    "googleEventId" TEXT,
    "outlookEventId" TEXT,
    "ehrAppointmentId" TEXT,
    "encryptedNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- AppointmentReminder
CREATE TABLE "AppointmentReminder" (
    "id" SERIAL NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "message" TEXT,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "responseContent" TEXT,
    "responseAction" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentReminder_pkey" PRIMARY KEY ("id")
);

-- WaitlistEntry
CREATE TABLE "WaitlistEntry" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientEmail" TEXT,
    "patientPhone" TEXT,
    "preferredProviderId" INTEGER,
    "preferredDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredTimeStart" TEXT,
    "preferredTimeEnd" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifiedAt" TIMESTAMP(3),
    "bookedAt" TIMESTAMP(3),
    "bookedAppointmentId" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- NoShowPredictionLog
CREATE TABLE "NoShowPredictionLog" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "predictedScore" DOUBLE PRECISION NOT NULL,
    "predictedAt" TIMESTAMP(3) NOT NULL,
    "actualOutcome" BOOLEAN,
    "outcomeRecordedAt" TIMESTAMP(3),
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoShowPredictionLog_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- TOOL 1.4: CLIENT INTAKE AUTOMATOR TABLES
-- ============================================================================

-- IntakeConfig
CREATE TABLE "IntakeConfig" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "portalName" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "customDomain" TEXT,
    "requireIdentityVerification" BOOLEAN NOT NULL DEFAULT false,
    "requireDocumentVerification" BOOLEAN NOT NULL DEFAULT false,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "docusignAccountId" TEXT,
    "docusignApiKey" TEXT,
    "hellosignApiKey" TEXT,
    "notifyOnSubmission" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCompletion" BOOLEAN NOT NULL DEFAULT true,
    "notificationEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "storageProvider" TEXT,
    "storageCredentials" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeConfig_pkey" PRIMARY KEY ("id")
);

-- IntakeForm
CREATE TABLE "IntakeForm" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT,
    "status" "IntakeFormStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isMultiPage" BOOLEAN NOT NULL DEFAULT false,
    "allowSaveProgress" BOOLEAN NOT NULL DEFAULT true,
    "requireSignature" BOOLEAN NOT NULL DEFAULT false,
    "expiresAfterDays" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);

-- IntakeFormField
CREATE TABLE "IntakeFormField" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "placeholder" TEXT,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "validationRules" JSONB,
    "options" JSONB,
    "conditionalLogic" JSONB,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" TEXT,
    "prefillSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeFormField_pkey" PRIMARY KEY ("id")
);

-- IntakeSubmission
CREATE TABLE "IntakeSubmission" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "formId" INTEGER NOT NULL,
    "submitterEmail" TEXT NOT NULL,
    "submitterName" TEXT,
    "submitterPhone" TEXT,
    "accessToken" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "formData" JSONB,
    "encryptedData" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSavedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" INTEGER,
    "signatureUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "docusignEnvelopeId" TEXT,
    "hellosignRequestId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeSubmission_pkey" PRIMARY KEY ("id")
);

-- IntakeDocument
CREATE TABLE "IntakeDocument" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" INTEGER,
    "verificationNotes" TEXT,
    "extractedData" JSONB,
    "extractionConfidence" DOUBLE PRECISION,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "encryptionKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeDocument_pkey" PRIMARY KEY ("id")
);

-- ComplianceTemplate
CREATE TABLE "ComplianceTemplate" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "useCase" TEXT,
    "requirements" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceTemplate_pkey" PRIMARY KEY ("id")
);

-- ComplianceCheck
CREATE TABLE "ComplianceCheck" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,
    "requirementStatus" JSONB,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- IntakeWorkflow
CREATE TABLE "IntakeWorkflow" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "triggerFormIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "autoStart" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeWorkflow_pkey" PRIMARY KEY ("id")
);

-- WorkflowProgress
CREATE TABLE "WorkflowProgress" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "currentStepId" TEXT,
    "stepStatuses" JSONB,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "assignedTo" INTEGER,
    "dueAt" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowProgress_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

CREATE UNIQUE INDEX "ChatbotConfig_clientId_key" ON "ChatbotConfig"("clientId");
CREATE UNIQUE INDEX "ChatConversation_sessionId_key" ON "ChatConversation"("sessionId");
CREATE UNIQUE INDEX "ChatAnalytics_chatbotConfigId_date_key" ON "ChatAnalytics"("chatbotConfigId", "date");
CREATE UNIQUE INDEX "ProductDescriptionConfig_clientId_key" ON "ProductDescriptionConfig"("clientId");
CREATE UNIQUE INDEX "SchedulingConfig_clientId_key" ON "SchedulingConfig"("clientId");
CREATE UNIQUE INDEX "IntakeConfig_clientId_key" ON "IntakeConfig"("clientId");
CREATE UNIQUE INDEX "IntakeForm_configId_slug_key" ON "IntakeForm"("configId", "slug");
CREATE UNIQUE INDEX "IntakeSubmission_accessToken_key" ON "IntakeSubmission"("accessToken");
CREATE UNIQUE INDEX "ComplianceCheck_submissionId_templateId_key" ON "ComplianceCheck"("submissionId", "templateId");
CREATE UNIQUE INDEX "WorkflowProgress_submissionId_workflowId_key" ON "WorkflowProgress"("submissionId", "workflowId");

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tool 1.1: Customer Service Chatbot Indexes
CREATE INDEX "ChatbotConfig_clientId_isActive_idx" ON "ChatbotConfig"("clientId", "isActive");
CREATE INDEX "ChatConversation_chatbotConfigId_status_idx" ON "ChatConversation"("chatbotConfigId", "status");
CREATE INDEX "ChatConversation_customerEmail_idx" ON "ChatConversation"("customerEmail");
CREATE INDEX "ChatConversation_sessionId_idx" ON "ChatConversation"("sessionId");
CREATE INDEX "ChatConversation_createdAt_idx" ON "ChatConversation"("createdAt" DESC);
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");
CREATE INDEX "KnowledgeBaseItem_chatbotConfigId_category_idx" ON "KnowledgeBaseItem"("chatbotConfigId", "category");
CREATE INDEX "KnowledgeBaseItem_chatbotConfigId_isPublished_idx" ON "KnowledgeBaseItem"("chatbotConfigId", "isPublished");
CREATE INDEX "ChatAnalytics_chatbotConfigId_date_idx" ON "ChatAnalytics"("chatbotConfigId", "date" DESC);

-- Tool 1.2: Product Description Generator Indexes
CREATE INDEX "ProductDescriptionConfig_clientId_isActive_idx" ON "ProductDescriptionConfig"("clientId", "isActive");
CREATE INDEX "Product_configId_isActive_idx" ON "Product"("configId", "isActive");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "ProductDescription_productId_marketplace_idx" ON "ProductDescription"("productId", "marketplace");
CREATE INDEX "ProductDescription_productId_variant_idx" ON "ProductDescription"("productId", "variant");
CREATE INDEX "DescriptionTemplate_configId_marketplace_idx" ON "DescriptionTemplate"("configId", "marketplace");
CREATE INDEX "DescriptionTemplate_configId_category_idx" ON "DescriptionTemplate"("configId", "category");
CREATE INDEX "BulkGenerationJob_configId_status_idx" ON "BulkGenerationJob"("configId", "status");
CREATE INDEX "BulkGenerationJob_status_createdAt_idx" ON "BulkGenerationJob"("status", "createdAt" DESC);

-- Tool 1.3: AI Scheduling Assistant Indexes
CREATE INDEX "SchedulingConfig_clientId_isActive_idx" ON "SchedulingConfig"("clientId", "isActive");
CREATE INDEX "Provider_configId_isActive_idx" ON "Provider"("configId", "isActive");
CREATE INDEX "AppointmentType_configId_isActive_idx" ON "AppointmentType"("configId", "isActive");
CREATE INDEX "Appointment_configId_scheduledAt_idx" ON "Appointment"("configId", "scheduledAt");
CREATE INDEX "Appointment_configId_status_idx" ON "Appointment"("configId", "status");
CREATE INDEX "Appointment_providerId_scheduledAt_idx" ON "Appointment"("providerId", "scheduledAt");
CREATE INDEX "Appointment_patientEmail_idx" ON "Appointment"("patientEmail");
CREATE INDEX "AppointmentReminder_appointmentId_status_idx" ON "AppointmentReminder"("appointmentId", "status");
CREATE INDEX "AppointmentReminder_status_scheduledFor_idx" ON "AppointmentReminder"("status", "scheduledFor");
CREATE INDEX "WaitlistEntry_configId_isActive_idx" ON "WaitlistEntry"("configId", "isActive");
CREATE INDEX "WaitlistEntry_configId_priority_idx" ON "WaitlistEntry"("configId", "priority");
CREATE INDEX "NoShowPredictionLog_configId_predictedAt_idx" ON "NoShowPredictionLog"("configId", "predictedAt" DESC);
CREATE INDEX "NoShowPredictionLog_appointmentId_idx" ON "NoShowPredictionLog"("appointmentId");

-- Tool 1.4: Client Intake Automator Indexes
CREATE INDEX "IntakeConfig_clientId_isActive_idx" ON "IntakeConfig"("clientId", "isActive");
CREATE INDEX "IntakeForm_configId_status_idx" ON "IntakeForm"("configId", "status");
CREATE INDEX "IntakeFormField_formId_pageNumber_sortOrder_idx" ON "IntakeFormField"("formId", "pageNumber", "sortOrder");
CREATE INDEX "IntakeSubmission_configId_status_idx" ON "IntakeSubmission"("configId", "status");
CREATE INDEX "IntakeSubmission_formId_status_idx" ON "IntakeSubmission"("formId", "status");
CREATE INDEX "IntakeSubmission_submitterEmail_idx" ON "IntakeSubmission"("submitterEmail");
CREATE INDEX "IntakeSubmission_accessToken_idx" ON "IntakeSubmission"("accessToken");
CREATE INDEX "IntakeDocument_submissionId_documentType_idx" ON "IntakeDocument"("submissionId", "documentType");
CREATE INDEX "ComplianceTemplate_configId_isActive_idx" ON "ComplianceTemplate"("configId", "isActive");
CREATE INDEX "ComplianceCheck_submissionId_idx" ON "ComplianceCheck"("submissionId");
CREATE INDEX "IntakeWorkflow_configId_isActive_idx" ON "IntakeWorkflow"("configId", "isActive");
CREATE INDEX "WorkflowProgress_workflowId_isComplete_idx" ON "WorkflowProgress"("workflowId", "isComplete");
CREATE INDEX "WorkflowProgress_assignedTo_isComplete_idx" ON "WorkflowProgress"("assignedTo", "isComplete");

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

-- Tool 1.1: Customer Service Chatbot Foreign Keys
ALTER TABLE "ChatbotConfig" ADD CONSTRAINT "ChatbotConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_chatbotConfigId_fkey" FOREIGN KEY ("chatbotConfigId") REFERENCES "ChatbotConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeBaseItem" ADD CONSTRAINT "KnowledgeBaseItem_chatbotConfigId_fkey" FOREIGN KEY ("chatbotConfigId") REFERENCES "ChatbotConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tool 1.2: Product Description Generator Foreign Keys
ALTER TABLE "ProductDescriptionConfig" ADD CONSTRAINT "ProductDescriptionConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ProductDescriptionConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductDescription" ADD CONSTRAINT "ProductDescription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DescriptionTemplate" ADD CONSTRAINT "DescriptionTemplate_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ProductDescriptionConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BulkGenerationJob" ADD CONSTRAINT "BulkGenerationJob_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ProductDescriptionConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tool 1.3: AI Scheduling Assistant Foreign Keys
ALTER TABLE "SchedulingConfig" ADD CONSTRAINT "SchedulingConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentType" ADD CONSTRAINT "AppointmentType_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tool 1.4: Client Intake Automator Foreign Keys
ALTER TABLE "IntakeConfig" ADD CONSTRAINT "IntakeConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_configId_fkey" FOREIGN KEY ("configId") REFERENCES "IntakeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeFormField" ADD CONSTRAINT "IntakeFormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "IntakeForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_configId_fkey" FOREIGN KEY ("configId") REFERENCES "IntakeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "IntakeForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeDocument" ADD CONSTRAINT "IntakeDocument_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "IntakeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceTemplate" ADD CONSTRAINT "ComplianceTemplate_configId_fkey" FOREIGN KEY ("configId") REFERENCES "IntakeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "IntakeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ComplianceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeWorkflow" ADD CONSTRAINT "IntakeWorkflow_configId_fkey" FOREIGN KEY ("configId") REFERENCES "IntakeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowProgress" ADD CONSTRAINT "WorkflowProgress_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "IntakeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowProgress" ADD CONSTRAINT "WorkflowProgress_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "IntakeWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
