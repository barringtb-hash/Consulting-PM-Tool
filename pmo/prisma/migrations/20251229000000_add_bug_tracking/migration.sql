-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('BUG', 'ISSUE', 'FEATURE_REQUEST', 'IMPROVEMENT', 'TASK');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'TRIAGING', 'IN_PROGRESS', 'IN_REVIEW', 'RESOLVED', 'CLOSED', 'WONT_FIX');

-- CreateEnum
CREATE TYPE "IssueSource" AS ENUM ('MANUAL', 'AI_ASSISTANT', 'BROWSER_ERROR', 'API_ERROR', 'VERCEL_LOG', 'RENDER_LOG', 'ANOMALY');

-- CreateTable
CREATE TABLE "Issue" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "type" "IssueType" NOT NULL DEFAULT 'BUG',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "source" "IssueSource" NOT NULL DEFAULT 'MANUAL',
    "reportedById" INTEGER,
    "assignedToId" INTEGER,
    "projectId" INTEGER,
    "accountId" INTEGER,
    "anomalyId" TEXT,
    "errorHash" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 1,
    "stackTrace" TEXT,
    "browserInfo" JSONB,
    "requestInfo" JSONB,
    "componentStack" TEXT,
    "environment" TEXT,
    "appVersion" TEXT,
    "url" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueLabel" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueComment" (
    "id" SERIAL NOT NULL,
    "issueId" INTEGER NOT NULL,
    "userId" INTEGER,
    "content" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueAttachment" (
    "id" SERIAL NOT NULL,
    "issueId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" SERIAL NOT NULL,
    "issueId" INTEGER,
    "tenantId" TEXT,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "source" "IssueSource" NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'error',
    "userId" INTEGER,
    "sessionId" TEXT,
    "requestId" TEXT,
    "url" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "environment" TEXT,
    "appVersion" TEXT,
    "browserInfo" JSONB,
    "serverInfo" JSONB,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BugTrackingApiKey" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BugTrackingApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable (junction table for Issue <-> IssueLabel many-to-many)
CREATE TABLE "_IssueLabels" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_IssueLabels_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Issue_tenantId_idx" ON "Issue"("tenantId");
CREATE INDEX "Issue_status_idx" ON "Issue"("status");
CREATE INDEX "Issue_priority_idx" ON "Issue"("priority");
CREATE INDEX "Issue_type_idx" ON "Issue"("type");
CREATE INDEX "Issue_source_idx" ON "Issue"("source");
CREATE INDEX "Issue_assignedToId_idx" ON "Issue"("assignedToId");
CREATE INDEX "Issue_reportedById_idx" ON "Issue"("reportedById");
CREATE INDEX "Issue_createdAt_idx" ON "Issue"("createdAt");
CREATE INDEX "Issue_errorHash_idx" ON "Issue"("errorHash");
CREATE UNIQUE INDEX "Issue_tenantId_errorHash_key" ON "Issue"("tenantId", "errorHash");

-- CreateIndex
CREATE INDEX "IssueLabel_tenantId_idx" ON "IssueLabel"("tenantId");
CREATE UNIQUE INDEX "IssueLabel_tenantId_name_key" ON "IssueLabel"("tenantId", "name");

-- CreateIndex
CREATE INDEX "IssueComment_issueId_idx" ON "IssueComment"("issueId");
CREATE INDEX "IssueComment_userId_idx" ON "IssueComment"("userId");

-- CreateIndex
CREATE INDEX "IssueAttachment_issueId_idx" ON "IssueAttachment"("issueId");

-- CreateIndex
CREATE INDEX "ErrorLog_issueId_idx" ON "ErrorLog"("issueId");
CREATE INDEX "ErrorLog_tenantId_idx" ON "ErrorLog"("tenantId");
CREATE INDEX "ErrorLog_source_idx" ON "ErrorLog"("source");
CREATE INDEX "ErrorLog_level_idx" ON "ErrorLog"("level");
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BugTrackingApiKey_keyHash_key" ON "BugTrackingApiKey"("keyHash");
CREATE INDEX "BugTrackingApiKey_tenantId_idx" ON "BugTrackingApiKey"("tenantId");
CREATE INDEX "BugTrackingApiKey_keyHash_idx" ON "BugTrackingApiKey"("keyHash");
CREATE INDEX "BugTrackingApiKey_keyPrefix_idx" ON "BugTrackingApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "_IssueLabels_B_index" ON "_IssueLabels"("B");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLabel" ADD CONSTRAINT "IssueLabel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueComment" ADD CONSTRAINT "IssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueComment" ADD CONSTRAINT "IssueComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueAttachment" ADD CONSTRAINT "IssueAttachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugTrackingApiKey" ADD CONSTRAINT "BugTrackingApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IssueLabels" ADD CONSTRAINT "_IssueLabels_A_fkey" FOREIGN KEY ("A") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_IssueLabels" ADD CONSTRAINT "_IssueLabels_B_fkey" FOREIGN KEY ("B") REFERENCES "IssueLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
