-- Enable Monitoring Assistant for Default Tenant
-- Run this script against your database to enable the feature

-- First, get the default tenant ID
-- Note: The default tenant has slug = 'default'

-- Check if config already exists and update, otherwise insert
INSERT INTO "TenantModuleConfig" ("tenantId", "moduleId", "enabled", "settings", "createdAt", "updatedAt")
SELECT
  t.id,
  'monitoring-assistant',
  true,
  '{"maxTokensPerResponse": 2000, "conversationHistoryLimit": 50, "enableRecommendations": true, "enableDiagnosis": true}'::jsonb,
  NOW(),
  NOW()
FROM "Tenant" t
WHERE t.slug = 'default'
ON CONFLICT ON CONSTRAINT "TenantModuleConfig_tenantId_moduleId_key"
DO UPDATE SET
  enabled = true,
  "updatedAt" = NOW();

-- Verify the result
SELECT
  t.name as tenant_name,
  t.slug as tenant_slug,
  tmc."moduleId",
  tmc.enabled,
  tmc.settings
FROM "TenantModuleConfig" tmc
JOIN "Tenant" t ON t.id = tmc."tenantId"
WHERE tmc."moduleId" = 'monitoring-assistant';
