-- Migration: Add Row-Level Security (RLS) for Multi-Tenant Isolation
-- This provides database-level tenant isolation as a defense-in-depth measure.
-- RLS policies filter data based on the app.current_tenant session variable.

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY ON ALL TENANT-SCOPED TABLES
-- ============================================================================

-- CRM Core Tables (required tenantId)
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CRMContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Opportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pipeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CRMActivity" ENABLE ROW LEVEL SECURITY;

-- Notification & Integration Tables
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;

-- Usage Metering Tables
ALTER TABLE "UsageEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageSummary" ENABLE ROW LEVEL SECURITY;

-- Saved Reports
ALTER TABLE "SavedReport" ENABLE ROW LEVEL SECURITY;

-- Tenant Configuration Tables
ALTER TABLE "TenantUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantDomain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantBranding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantModule" ENABLE ROW LEVEL SECURITY;

-- Legacy PMO Tables (optional tenantId)
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Milestone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Meeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketingContent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InboundLead" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE TENANT ISOLATION POLICIES FOR CRM TABLES (required tenantId)
-- ============================================================================

-- Account: Companies/organizations
CREATE POLICY tenant_isolation_account ON "Account"
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

-- CRMContact: CRM contacts
CREATE POLICY tenant_isolation_crm_contact ON "CRMContact"
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

-- Opportunity: Deals/potential revenue
CREATE POLICY tenant_isolation_opportunity ON "Opportunity"
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

-- Pipeline: Sales pipelines
CREATE POLICY tenant_isolation_pipeline ON "Pipeline"
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

-- CRMActivity: Activity timeline
CREATE POLICY tenant_isolation_crm_activity ON "CRMActivity"
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

-- ============================================================================
-- CREATE POLICIES FOR NOTIFICATION & INTEGRATION TABLES
-- ============================================================================

-- Notification: User notifications
CREATE POLICY tenant_isolation_notification ON "Notification"
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

-- Integration: External system connections
CREATE POLICY tenant_isolation_integration ON "Integration"
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

-- ============================================================================
-- CREATE POLICIES FOR USAGE METERING TABLES
-- ============================================================================

-- UsageEvent: Individual usage events
CREATE POLICY tenant_isolation_usage_event ON "UsageEvent"
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

-- UsageSummary: Aggregated usage for billing
CREATE POLICY tenant_isolation_usage_summary ON "UsageSummary"
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

-- SavedReport: Custom report configurations
CREATE POLICY tenant_isolation_saved_report ON "SavedReport"
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

-- ============================================================================
-- CREATE POLICIES FOR TENANT CONFIGURATION TABLES
-- ============================================================================

-- TenantUser: User membership in tenants
CREATE POLICY tenant_isolation_tenant_user ON "TenantUser"
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

-- TenantDomain: Custom domain configuration
CREATE POLICY tenant_isolation_tenant_domain ON "TenantDomain"
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

-- TenantBranding: White-label branding settings
CREATE POLICY tenant_isolation_tenant_branding ON "TenantBranding"
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

-- TenantModule: Module enablement per tenant
CREATE POLICY tenant_isolation_tenant_module ON "TenantModule"
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

-- ============================================================================
-- CREATE POLICIES FOR LEGACY PMO TABLES (optional tenantId - NULL allowed)
-- ============================================================================

-- Client: Legacy client companies
CREATE POLICY tenant_isolation_client ON "Client"
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

-- Contact: Legacy project-related contacts
CREATE POLICY tenant_isolation_contact ON "Contact"
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

-- Project: Projects
CREATE POLICY tenant_isolation_project ON "Project"
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

-- Task: Kanban-style tasks
CREATE POLICY tenant_isolation_task ON "Task"
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

-- Milestone: Project milestones
CREATE POLICY tenant_isolation_milestone ON "Milestone"
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

-- Meeting: Meetings
CREATE POLICY tenant_isolation_meeting ON "Meeting"
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

-- AIAsset: Reusable AI assets
CREATE POLICY tenant_isolation_ai_asset ON "AIAsset"
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

-- MarketingContent: Content pieces with publishing workflow
CREATE POLICY tenant_isolation_marketing_content ON "MarketingContent"
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

-- Campaign: Marketing campaigns
CREATE POLICY tenant_isolation_campaign ON "Campaign"
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

-- InboundLead: Sales pipeline leads
CREATE POLICY tenant_isolation_inbound_lead ON "InboundLead"
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

-- ============================================================================
-- COMMENT: TABLES NOT NEEDING DIRECT RLS
-- ============================================================================
-- The following tables are accessed via parent relations and inherit tenant
-- isolation from their parent:
-- - SalesPipelineStage (via Pipeline.tenantId)
-- - OpportunityContact (via Opportunity.tenantId)
-- - OpportunityStageHistory (via Opportunity.tenantId)
-- - SyncLog (via Integration.tenantId)
-- - Document (via Account.tenantId or Project.tenantId)

-- ============================================================================
-- HELPER FUNCTION: Set tenant context safely
-- ============================================================================
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant', COALESCE(p_tenant_id, ''), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to the application user (adjust role name as needed)
-- GRANT EXECUTE ON FUNCTION set_tenant_context(TEXT) TO app_user;

COMMENT ON FUNCTION set_tenant_context(TEXT) IS
'Sets the app.current_tenant session variable for RLS filtering.
The true parameter makes it transaction-local.';
