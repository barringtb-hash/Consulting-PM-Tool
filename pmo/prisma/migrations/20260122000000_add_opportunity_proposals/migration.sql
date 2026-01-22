-- CreateEnum
CREATE TYPE "EstimateType" AS ENUM ('FIXED_PRICE', 'TIME_AND_MATERIALS', 'RETAINER', 'HYBRID');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LineItemCategory" AS ENUM ('LABOR', 'DELIVERABLE', 'EXPENSE', 'THIRD_PARTY', 'CONTINGENCY', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "SOWStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MSA', 'SOW', 'MSA_WITH_SOW', 'NDA', 'CONSULTING_AGREEMENT', 'RETAINER_AGREEMENT', 'AMENDMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT', 'PENDING_SIGNATURE', 'PARTIALLY_SIGNED', 'SIGNED', 'FULLY_SIGNED', 'VOIDED', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "SignatureMethod" AS ENUM ('ELECTRONIC', 'DIGITAL', 'WET_INK', 'CLICK_WRAP', 'TYPED_NAME', 'DRAWN');

-- CreateTable
CREATE TABLE "OpportunityCostEstimate" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "approvedById" INTEGER,
    "rejectedById" INTEGER,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "estimateType" "EstimateType" NOT NULL DEFAULT 'FIXED_PRICE',
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(5,2),
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "internalNotes" TEXT,
    "assumptions" JSONB,
    "rejectionReason" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "aiRationale" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityCostEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateLineItem" (
    "id" SERIAL NOT NULL,
    "estimateId" INTEGER NOT NULL,
    "category" "LineItemCategory" NOT NULL,
    "phase" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitType" TEXT DEFAULT 'unit',
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "total" DECIMAL(15,2) NOT NULL,
    "role" TEXT,
    "hourlyRate" DECIMAL(10,2),
    "estimatedHours" DECIMAL(10,2),
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "aiRationale" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunitySOW" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "estimateId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "approvedById" INTEGER,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "SOWStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'MANUAL',
    "clientSnapshot" JSONB,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunitySOW_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityContract" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "sowId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "sentById" INTEGER,
    "voidedById" INTEGER,
    "contractNumber" TEXT,
    "type" "ContractType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB,
    "templateId" TEXT,
    "totalValue" DECIMAL(15,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentTerms" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "autoRenewal" BOOLEAN NOT NULL DEFAULT false,
    "renewalTerms" TEXT,
    "signatureMethod" "SignatureMethod" NOT NULL DEFAULT 'ELECTRONIC',
    "requiresWitness" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "sharePassword" TEXT,
    "shareViewed" BOOLEAN NOT NULL DEFAULT false,
    "shareViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractSignature" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signerTitle" TEXT,
    "signerCompany" TEXT,
    "signerType" TEXT NOT NULL DEFAULT 'CLIENT',
    "signToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "signatureData" JSONB,
    "signedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "viewedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "signatureOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAuditLog" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" INTEGER,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpportunityCostEstimate_tenantId_opportunityId_idx" ON "OpportunityCostEstimate"("tenantId", "opportunityId");

-- CreateIndex
CREATE INDEX "OpportunityCostEstimate_status_idx" ON "OpportunityCostEstimate"("status");

-- CreateIndex
CREATE INDEX "EstimateLineItem_estimateId_sortOrder_idx" ON "EstimateLineItem"("estimateId", "sortOrder");

-- CreateIndex
CREATE INDEX "OpportunitySOW_tenantId_opportunityId_idx" ON "OpportunitySOW"("tenantId", "opportunityId");

-- CreateIndex
CREATE INDEX "OpportunitySOW_status_idx" ON "OpportunitySOW"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityContract_shareToken_key" ON "OpportunityContract"("shareToken");

-- CreateIndex
CREATE INDEX "OpportunityContract_tenantId_opportunityId_idx" ON "OpportunityContract"("tenantId", "opportunityId");

-- CreateIndex
CREATE INDEX "OpportunityContract_shareToken_idx" ON "OpportunityContract"("shareToken");

-- CreateIndex
CREATE INDEX "OpportunityContract_status_idx" ON "OpportunityContract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractSignature_signToken_key" ON "ContractSignature"("signToken");

-- CreateIndex
CREATE INDEX "ContractSignature_contractId_signatureOrder_idx" ON "ContractSignature"("contractId", "signatureOrder");

-- CreateIndex
CREATE INDEX "ContractSignature_signToken_idx" ON "ContractSignature"("signToken");

-- CreateIndex
CREATE INDEX "ContractAuditLog_contractId_idx" ON "ContractAuditLog"("contractId");

-- CreateIndex
CREATE INDEX "ContractAuditLog_action_idx" ON "ContractAuditLog"("action");

-- CreateIndex
CREATE INDEX "ContractAuditLog_createdAt_idx" ON "ContractAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "OpportunityCostEstimate" ADD CONSTRAINT "OpportunityCostEstimate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityCostEstimate" ADD CONSTRAINT "OpportunityCostEstimate_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityCostEstimate" ADD CONSTRAINT "OpportunityCostEstimate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityCostEstimate" ADD CONSTRAINT "OpportunityCostEstimate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityCostEstimate" ADD CONSTRAINT "OpportunityCostEstimate_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "OpportunityCostEstimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySOW" ADD CONSTRAINT "OpportunitySOW_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySOW" ADD CONSTRAINT "OpportunitySOW_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySOW" ADD CONSTRAINT "OpportunitySOW_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "OpportunityCostEstimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySOW" ADD CONSTRAINT "OpportunitySOW_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySOW" ADD CONSTRAINT "OpportunitySOW_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContract" ADD CONSTRAINT "OpportunityContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContract" ADD CONSTRAINT "OpportunityContract_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContract" ADD CONSTRAINT "OpportunityContract_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContract" ADD CONSTRAINT "OpportunityContract_sowId_fkey" FOREIGN KEY ("sowId") REFERENCES "OpportunitySOW"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContract" ADD CONSTRAINT "OpportunityContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContract" ADD CONSTRAINT "OpportunityContract_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContract" ADD CONSTRAINT "OpportunityContract_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSignature" ADD CONSTRAINT "ContractSignature_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "OpportunityContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAuditLog" ADD CONSTRAINT "ContractAuditLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "OpportunityContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
