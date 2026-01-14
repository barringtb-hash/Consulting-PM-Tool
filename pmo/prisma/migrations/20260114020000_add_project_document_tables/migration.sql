-- Migration: Add Project Document Tables
-- Creates ProjectDocument and ProjectDocumentVersion tables for AI document generation

-- ============================================================================
-- ENUMS (using DO blocks to handle existing types)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "ProjectDocumentType" AS ENUM (
    'PROJECT_PLAN',
    'STATUS_REPORT',
    'RISK_REGISTER',
    'ISSUE_LOG',
    'MEETING_NOTES',
    'LESSONS_LEARNED',
    'COMMUNICATION_PLAN',
    'KICKOFF_AGENDA',
    'CHANGE_REQUEST',
    'PROJECT_CLOSURE',
    'KNOWLEDGE_TRANSFER',
    'AI_FEASIBILITY',
    'AI_LIMITATIONS',
    'MONITORING_MAINTENANCE',
    'DATA_REQUIREMENTS',
    'DELIVERABLE_CHECKLIST'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectDocumentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectDocumentCategory" AS ENUM ('CORE', 'LIFECYCLE', 'AI_SPECIFIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLES (using IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ProjectDocument" (
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

CREATE TABLE IF NOT EXISTS "ProjectDocumentVersion" (
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

-- ============================================================================
-- INDEXES (using IF NOT EXISTS)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectDocument_projectId_templateType_name_key" ON "ProjectDocument"("projectId", "templateType", "name");
CREATE INDEX IF NOT EXISTS "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectDocument_tenantId_idx" ON "ProjectDocument"("tenantId");
CREATE INDEX IF NOT EXISTS "ProjectDocument_templateType_idx" ON "ProjectDocument"("templateType");
CREATE INDEX IF NOT EXISTS "ProjectDocument_status_idx" ON "ProjectDocument"("status");
CREATE INDEX IF NOT EXISTS "ProjectDocument_category_idx" ON "ProjectDocument"("category");

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectDocumentVersion_documentId_version_key" ON "ProjectDocumentVersion"("documentId", "version");
CREATE INDEX IF NOT EXISTS "ProjectDocumentVersion_documentId_idx" ON "ProjectDocumentVersion"("documentId");

-- ============================================================================
-- FOREIGN KEYS (with existence checks)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_lastEditedBy_fkey" FOREIGN KEY ("lastEditedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectDocumentVersion" ADD CONSTRAINT "ProjectDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProjectDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectDocumentVersion" ADD CONSTRAINT "ProjectDocumentVersion_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
