-- Content Generator Suite Migration
-- Creates all content generator tables and enums from scratch
-- Also includes Phase 2 (Sequences) and Phase 4 (Multi-Language) enhancements

-- CreateEnum ContentGenerationType
CREATE TYPE "ContentGenerationType" AS ENUM (
    'SOCIAL_POST',
    'EMAIL',
    'BLOG_POST',
    'AD_COPY',
    'LANDING_PAGE',
    'NEWSLETTER',
    'PRESS_RELEASE',
    'PRODUCT_COPY',
    'VIDEO_SCRIPT',
    'PROPOSAL',
    'CASE_STUDY',
    'FAQ_CONTENT',
    'WELCOME_PACKET',
    'WHITEPAPER'
);

-- CreateEnum ContentApprovalStatus
CREATE TYPE "ContentApprovalStatus" AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'REVISION_REQUESTED',
    'APPROVED',
    'REJECTED',
    'PUBLISHED'
);

-- CreateEnum WorkflowStepType
CREATE TYPE "WorkflowStepType" AS ENUM (
    'CREATE',
    'REVIEW',
    'REVISE',
    'APPROVE',
    'PUBLISH'
);

-- CreateEnum ContentSequenceType
CREATE TYPE "ContentSequenceType" AS ENUM (
    'ONBOARDING',
    'NURTURE',
    'FOLLOW_UP',
    'DRIP',
    'REENGAGEMENT'
);

-- CreateEnum ContentSequenceStatus
CREATE TYPE "ContentSequenceStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'ARCHIVED'
);

-- CreateTable ContentGeneratorConfig
CREATE TABLE "ContentGeneratorConfig" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "brandVoiceDescription" TEXT,
    "toneKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoidKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "voiceSamples" JSONB,
    "voiceTrainedAt" TIMESTAMP(3),
    "enableSEO" BOOLEAN NOT NULL DEFAULT true,
    "targetKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enablePlagiarismCheck" BOOLEAN NOT NULL DEFAULT true,
    "defaultTone" TEXT,
    "defaultLength" TEXT,
    "cmsIntegrations" JSONB,
    "socialIntegrations" JSONB,
    "emailIntegrations" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentGeneratorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable GeneratedContent
CREATE TABLE "GeneratedContent" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContentGenerationType" NOT NULL,
    "content" TEXT NOT NULL,
    "contentHtml" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seoScore" INTEGER,
    "voiceConsistencyScore" DOUBLE PRECISION,
    "toneAnalysis" JSONB,
    "originalityScore" DOUBLE PRECISION,
    "plagiarismSources" JSONB,
    "approvalStatus" "ContentApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "approvalWorkflowId" INTEGER,
    "currentApproverId" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentVersionId" INTEGER,
    "revisionNotes" TEXT,
    "prompt" TEXT,
    "modelUsed" TEXT,
    "generationParams" JSONB,
    "variantGroup" TEXT,
    "isControlVariant" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishedUrl" TEXT,
    "publishPlatform" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION,
    "language" TEXT NOT NULL DEFAULT 'en',
    "parentTranslationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable ContentTemplate
CREATE TABLE "ContentTemplate" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ContentGenerationType" NOT NULL,
    "template" TEXT NOT NULL,
    "placeholders" JSONB,
    "systemPrompt" TEXT,
    "exampleOutputs" JSONB,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable ContentApprovalWorkflow
CREATE TABLE "ContentApprovalWorkflow" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "autoAssign" BOOLEAN NOT NULL DEFAULT false,
    "assignmentRules" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable ContentSequence
CREATE TABLE "ContentSequence" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ContentSequenceType" NOT NULL,
    "triggerEvent" TEXT,
    "status" "ContentSequenceStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "totalPieces" INTEGER NOT NULL DEFAULT 0,
    "totalDurationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable ContentSequencePiece
CREATE TABLE "ContentSequencePiece" (
    "id" SERIAL NOT NULL,
    "sequenceId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "contentId" INTEGER,
    "purpose" TEXT NOT NULL,
    "subject" TEXT,
    "contentType" "ContentGenerationType" NOT NULL DEFAULT 'EMAIL',
    "promptHints" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSequencePiece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for ContentGeneratorConfig
CREATE UNIQUE INDEX "ContentGeneratorConfig_clientId_key" ON "ContentGeneratorConfig"("clientId");
CREATE INDEX "ContentGeneratorConfig_clientId_isActive_idx" ON "ContentGeneratorConfig"("clientId", "isActive");

-- CreateIndex for GeneratedContent
CREATE INDEX "GeneratedContent_configId_type_idx" ON "GeneratedContent"("configId", "type");
CREATE INDEX "GeneratedContent_configId_approvalStatus_idx" ON "GeneratedContent"("configId", "approvalStatus");
CREATE INDEX "GeneratedContent_createdAt_idx" ON "GeneratedContent"("createdAt" DESC);
CREATE INDEX "GeneratedContent_parentTranslationId_idx" ON "GeneratedContent"("parentTranslationId");
CREATE INDEX "GeneratedContent_language_idx" ON "GeneratedContent"("language");

-- CreateIndex for ContentTemplate
CREATE INDEX "ContentTemplate_configId_type_idx" ON "ContentTemplate"("configId", "type");
CREATE INDEX "ContentTemplate_configId_category_idx" ON "ContentTemplate"("configId", "category");

-- CreateIndex for ContentApprovalWorkflow
CREATE INDEX "ContentApprovalWorkflow_configId_isActive_idx" ON "ContentApprovalWorkflow"("configId", "isActive");

-- CreateIndex for ContentSequence
CREATE INDEX "ContentSequence_configId_status_idx" ON "ContentSequence"("configId", "status");
CREATE INDEX "ContentSequence_configId_type_idx" ON "ContentSequence"("configId", "type");

-- CreateIndex for ContentSequencePiece
CREATE INDEX "ContentSequencePiece_sequenceId_order_idx" ON "ContentSequencePiece"("sequenceId", "order");

-- AddForeignKey for ContentGeneratorConfig
ALTER TABLE "ContentGeneratorConfig" ADD CONSTRAINT "ContentGeneratorConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for GeneratedContent
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ContentGeneratorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_parentTranslationId_fkey" FOREIGN KEY ("parentTranslationId") REFERENCES "GeneratedContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for ContentTemplate
ALTER TABLE "ContentTemplate" ADD CONSTRAINT "ContentTemplate_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ContentGeneratorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for ContentApprovalWorkflow
ALTER TABLE "ContentApprovalWorkflow" ADD CONSTRAINT "ContentApprovalWorkflow_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ContentGeneratorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for ContentSequence
ALTER TABLE "ContentSequence" ADD CONSTRAINT "ContentSequence_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ContentGeneratorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for ContentSequencePiece
ALTER TABLE "ContentSequencePiece" ADD CONSTRAINT "ContentSequencePiece_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "ContentSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentSequencePiece" ADD CONSTRAINT "ContentSequencePiece_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "GeneratedContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
