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

-- Note: Foreign key constraints to Tenant table are not added here
-- because the Tenant table is created via db push, not migrations.
-- The application layer enforces tenant isolation through middleware.
