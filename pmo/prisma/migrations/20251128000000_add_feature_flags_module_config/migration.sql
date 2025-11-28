-- Migration: Add Feature Flags and Module Configuration
-- This migration adds support for:
-- 1. User preferences (JSON field for dashboard panel settings, etc.)
-- 2. FeatureFlag table for system-wide feature toggles
-- 3. TenantModuleConfig table for per-tenant module configuration

-- Add preferences column to User table
ALTER TABLE "User" ADD COLUMN "preferences" JSONB;

-- Create FeatureFlag table
CREATE TABLE "FeatureFlag" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 100,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- Create TenantModuleConfig table
CREATE TABLE "TenantModuleConfig" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "moduleId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "TenantModuleConfig_pkey" PRIMARY KEY ("id")
);

-- Create unique index on FeatureFlag key
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- Create index on FeatureFlag for key + enabled lookups
CREATE INDEX "FeatureFlag_key_enabled_idx" ON "FeatureFlag"("key", "enabled");

-- Create unique index on TenantModuleConfig for tenant + module combination
CREATE UNIQUE INDEX "TenantModuleConfig_tenantId_moduleId_key" ON "TenantModuleConfig"("tenantId", "moduleId");

-- Create index on TenantModuleConfig for tenant lookups
CREATE INDEX "TenantModuleConfig_tenantId_idx" ON "TenantModuleConfig"("tenantId");

-- Create index on TenantModuleConfig for module + enabled lookups
CREATE INDEX "TenantModuleConfig_moduleId_enabled_idx" ON "TenantModuleConfig"("moduleId", "enabled");
