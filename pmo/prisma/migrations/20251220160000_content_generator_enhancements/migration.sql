-- Content Generator Enhancements Migration
-- Phase 2: Content Sequences
-- Phase 4: Multi-Language Support

-- CreateEnum for ContentSequenceType
CREATE TYPE "ContentSequenceType" AS ENUM ('ONBOARDING', 'NURTURE', 'FOLLOW_UP', 'DRIP', 'REENGAGEMENT');

-- CreateEnum for ContentSequenceStatus
CREATE TYPE "ContentSequenceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- Add language and translation support to GeneratedContent
ALTER TABLE "GeneratedContent" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "GeneratedContent" ADD COLUMN "parentTranslationId" INTEGER;

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
    "type" "ContentGenerationType" NOT NULL,
    "subject" TEXT,
    "purpose" TEXT,
    "promptHints" TEXT,
    "generatedContentId" INTEGER,
    "status" "ContentSequenceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSequencePiece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for ContentSequence
CREATE INDEX "ContentSequence_configId_status_idx" ON "ContentSequence"("configId", "status");
CREATE INDEX "ContentSequence_configId_type_idx" ON "ContentSequence"("configId", "type");

-- CreateIndex for ContentSequencePiece
CREATE INDEX "ContentSequencePiece_sequenceId_order_idx" ON "ContentSequencePiece"("sequenceId", "order");

-- CreateIndex for GeneratedContent translation support
CREATE INDEX "GeneratedContent_parentTranslationId_idx" ON "GeneratedContent"("parentTranslationId");
CREATE INDEX "GeneratedContent_language_idx" ON "GeneratedContent"("language");

-- AddForeignKey for ContentSequence
ALTER TABLE "ContentSequence" ADD CONSTRAINT "ContentSequence_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ContentGeneratorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for ContentSequencePiece
ALTER TABLE "ContentSequencePiece" ADD CONSTRAINT "ContentSequencePiece_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "ContentSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentSequencePiece" ADD CONSTRAINT "ContentSequencePiece_generatedContentId_fkey" FOREIGN KEY ("generatedContentId") REFERENCES "GeneratedContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for GeneratedContent translations (self-relation)
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_parentTranslationId_fkey" FOREIGN KEY ("parentTranslationId") REFERENCES "GeneratedContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
