-- Migration: Add Row-Level Security (RLS) for Multi-Tenant Isolation
-- This provides database-level tenant isolation as a defense-in-depth measure.
-- RLS policies filter data based on the app.current_tenant session variable.

-- ============================================================================
-- HELPER FUNCTION: Set tenant context safely
-- ============================================================================
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant', COALESCE(p_tenant_id, ''), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_tenant_context(TEXT) IS
'Sets the app.current_tenant session variable for RLS filtering.
The true parameter makes it transaction-local.';

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY ON ALL TENANT-SCOPED TABLES (CONDITIONALLY)
-- ============================================================================

DO $$
DECLARE
    -- Tables that require tenantId (no NULL allowed)
    required_tables TEXT[] := ARRAY[
        'Account', 'CRMContact', 'Opportunity', 'Pipeline', 'CRMActivity',
        'Integration', 'UsageEvent', 'UsageSummary', 'SavedReport',
        'TenantUser', 'TenantDomain', 'TenantBranding', 'TenantModule'
    ];
    -- Tables that allow NULL tenantId (legacy PMO tables)
    optional_tables TEXT[] := ARRAY[
        'Client', 'Contact', 'Project', 'Task', 'Milestone', 'Meeting',
        'AIAsset', 'MarketingContent', 'Campaign', 'InboundLead', 'Notification'
    ];
    t TEXT;
BEGIN
    -- Enable RLS on required tenant tables
    FOREACH t IN ARRAY required_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            RAISE NOTICE 'Enabled RLS on table: %', t;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping RLS', t;
        END IF;
    END LOOP;

    -- Enable RLS on optional tenant tables
    FOREACH t IN ARRAY optional_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            RAISE NOTICE 'Enabled RLS on table: %', t;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping RLS', t;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- CREATE TENANT ISOLATION POLICIES FOR CRM TABLES (required tenantId)
-- ============================================================================

DO $$
BEGIN
    -- Account: Companies/organizations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Account' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_account ON "Account";
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
    END IF;

    -- CRMContact: CRM contacts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CRMContact' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_crm_contact ON "CRMContact";
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
    END IF;

    -- Opportunity: Deals/potential revenue
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Opportunity' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_opportunity ON "Opportunity";
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
    END IF;

    -- Pipeline: Sales pipelines
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Pipeline' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_pipeline ON "Pipeline";
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
    END IF;

    -- CRMActivity: Activity timeline
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CRMActivity' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_crm_activity ON "CRMActivity";
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
    END IF;

    -- Integration: External system connections
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Integration' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_integration ON "Integration";
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
    END IF;

    -- UsageEvent: Individual usage events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UsageEvent' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_usage_event ON "UsageEvent";
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
    END IF;

    -- UsageSummary: Aggregated usage for billing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UsageSummary' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_usage_summary ON "UsageSummary";
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
    END IF;

    -- SavedReport: Custom report configurations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SavedReport' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_saved_report ON "SavedReport";
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
    END IF;

    -- TenantUser: User membership in tenants
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TenantUser' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_tenant_user ON "TenantUser";
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
    END IF;

    -- TenantDomain: Custom domain configuration
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TenantDomain' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_tenant_domain ON "TenantDomain";
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
    END IF;

    -- TenantBranding: White-label branding settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TenantBranding' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_tenant_branding ON "TenantBranding";
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
    END IF;

    -- TenantModule: Module enablement per tenant
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TenantModule' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_tenant_module ON "TenantModule";
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
    END IF;
END $$;

-- ============================================================================
-- CREATE POLICIES FOR LEGACY PMO TABLES (optional tenantId - NULL allowed)
-- ============================================================================

DO $$
BEGIN
    -- Client: Legacy client companies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Client' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_client ON "Client";
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
    END IF;

    -- Contact: Legacy project-related contacts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Contact' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_contact ON "Contact";
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
    END IF;

    -- Project: Projects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Project' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_project ON "Project";
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
    END IF;

    -- Task: Kanban-style tasks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Task' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_task ON "Task";
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
    END IF;

    -- Milestone: Project milestones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Milestone' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_milestone ON "Milestone";
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
    END IF;

    -- Meeting: Meetings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Meeting' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_meeting ON "Meeting";
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
    END IF;

    -- AIAsset: Reusable AI assets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIAsset' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_ai_asset ON "AIAsset";
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
    END IF;

    -- MarketingContent: Content pieces with publishing workflow
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'MarketingContent' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_marketing_content ON "MarketingContent";
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
    END IF;

    -- Campaign: Marketing campaigns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Campaign' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_campaign ON "Campaign";
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
    END IF;

    -- InboundLead: Sales pipeline leads
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'InboundLead' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_inbound_lead ON "InboundLead";
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
    END IF;

    -- Notification: User notifications (optional tenantId)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Notification' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS tenant_isolation_notification ON "Notification";
        CREATE POLICY tenant_isolation_notification ON "Notification"
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
    END IF;
END $$;

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
