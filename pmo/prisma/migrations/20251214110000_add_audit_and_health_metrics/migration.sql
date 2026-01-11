-- Migration: Add Audit Logging and Tenant Health Metrics

-- Create AuditAction enum
CREATE TYPE "AuditAction" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'BULK_UPDATE',
  'BULK_DELETE',
  'PERMISSION_CHANGE',
  'TENANT_SWITCH'
);

-- Create AuditLog table
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" INTEGER,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes for AuditLog
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- Create foreign keys for AuditLog
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create TenantHealthMetrics table
CREATE TABLE "TenantHealthMetrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "accountCount" INTEGER NOT NULL DEFAULT 0,
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "opportunityCount" INTEGER NOT NULL DEFAULT 0,
    "activityCount" INTEGER NOT NULL DEFAULT 0,
    "storageUsedMB" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documentsCount" INTEGER NOT NULL DEFAULT 0,
    "apiCallsToday" INTEGER NOT NULL DEFAULT 0,
    "apiCallsMonth" INTEGER NOT NULL DEFAULT 0,
    "dailyActiveUsers" INTEGER NOT NULL DEFAULT 0,
    "weeklyActiveUsers" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),

    CONSTRAINT "TenantHealthMetrics_pkey" PRIMARY KEY ("id")
);

-- Create index for TenantHealthMetrics
CREATE INDEX "TenantHealthMetrics_tenantId_recordedAt_idx" ON "TenantHealthMetrics"("tenantId", "recordedAt");

-- Create foreign key for TenantHealthMetrics
ALTER TABLE "TenantHealthMetrics" ADD CONSTRAINT "TenantHealthMetrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on AuditLog (only tenant users should see their audit logs)
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_log ON "AuditLog"
    FOR ALL
    USING (
        current_setting('app.current_tenant', true) IS NULL
        OR current_setting('app.current_tenant', true) = ''
        OR "tenantId" IS NULL
        OR "tenantId" = current_setting('app.current_tenant', true)
    )
    WITH CHECK (
        current_setting('app.current_tenant', true) IS NULL
        OR current_setting('app.current_tenant', true) = ''
        OR "tenantId" IS NULL
        OR "tenantId" = current_setting('app.current_tenant', true)
    );

-- Enable RLS on TenantHealthMetrics
ALTER TABLE "TenantHealthMetrics" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_health_metrics ON "TenantHealthMetrics"
    FOR ALL
    USING (
        current_setting('app.current_tenant', true) IS NULL
        OR current_setting('app.current_tenant', true) = ''
        OR "tenantId" = current_setting('app.current_tenant', true)
    )
    WITH CHECK (
        current_setting('app.current_tenant', true) IS NULL
        OR current_setting('app.current_tenant', true) = ''
        OR "tenantId" = current_setting('app.current_tenant', true)
    );
