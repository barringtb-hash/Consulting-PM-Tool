-- Associate existing users with default tenant
-- This ensures all users have a TenantUser record for proper tenant resolution

-- First, ensure a default tenant exists
INSERT INTO "Tenant" ("id", "name", "slug", "plan", "status", "createdAt", "updatedAt")
SELECT
    'default-tenant-' || gen_random_uuid()::text,
    'Default Organization',
    'default',
    'PROFESSIONAL'::"TenantPlan",
    'ACTIVE'::"TenantStatus",
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "Tenant" WHERE "slug" = 'default'
)
ON CONFLICT DO NOTHING;

-- Associate all users who don't have a TenantUser record with the default tenant
INSERT INTO "TenantUser" ("tenantId", "userId", "role", "createdAt", "updatedAt")
SELECT
    t.id,
    u.id,
    CASE
        WHEN u.role = 'SUPER_ADMIN' THEN 'OWNER'::"TenantRole"
        WHEN u.role = 'ADMIN' THEN 'ADMIN'::"TenantRole"
        ELSE 'MEMBER'::"TenantRole"
    END,
    NOW(),
    NOW()
FROM "User" u
CROSS JOIN (SELECT id FROM "Tenant" WHERE "slug" = 'default' LIMIT 1) t
WHERE NOT EXISTS (
    SELECT 1 FROM "TenantUser" tu WHERE tu."userId" = u.id
)
ON CONFLICT ("tenantId", "userId") DO NOTHING;
