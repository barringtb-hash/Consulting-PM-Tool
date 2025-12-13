-- Add tenant isolation to legacy PMO models
-- This migration adds tenantId to Client, Contact, and Project tables

-- Add tenantId column to Client table
ALTER TABLE "Client" ADD COLUMN "tenantId" TEXT;

-- Add tenantId column to Contact table
ALTER TABLE "Contact" ADD COLUMN "tenantId" TEXT;

-- Add tenantId column to Project table
ALTER TABLE "Project" ADD COLUMN "tenantId" TEXT;

-- Create indexes for tenant-scoped queries
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");
CREATE INDEX "Contact_tenantId_idx" ON "Contact"("tenantId");
CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");

-- Add foreign key constraints to Tenant table
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
