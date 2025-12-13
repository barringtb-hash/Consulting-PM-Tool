# CRM Transformation Technical Debt Report

**Generated:** December 11, 2025
**Last Updated:** December 13, 2025
**Reviewed Codebase:** PMO Consulting Tool → CRM Platform Transformation

---

## Executive Summary

The PMO-to-CRM transformation has a solid architectural foundation with well-designed CRM services and multi-tenancy infrastructure. However, significant legacy code remains that creates security vulnerabilities, inconsistent patterns, and incomplete integration. **28 distinct technical debt items** were identified across 5 categories.

### Risk Distribution

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 4 (4 resolved) | Security/data isolation vulnerabilities |
| **HIGH** | 6 (4 resolved) | Incomplete features blocking production use |
| **MEDIUM** | 10 | Inconsistent patterns causing maintenance burden |
| **LOW** | 8 | Code quality improvements for long-term health |

### ✅ Completed Items
**Phase 1 - Security (COMPLETED):**
- CRIT-01: Legacy routes now have tenantMiddleware
- CRIT-02: Legacy services now have tenant filtering
- CRIT-03: Prisma tenant extension includes all legacy models

**Phase 2 - CRM Frontend (COMPLETED):**
- CRIT-04: CRM frontend implementation (accounts, opportunities pages)
- HIGH-04: Minimal CRM test coverage added
- HIGH-06: CRM React Query hooks implemented

### 🔄 Remaining HIGH Priority
- HIGH-01: PipelinePage uses legacy data (needs CRM Opportunity migration)
- HIGH-02: Inconsistent API response formats
- HIGH-03: Duplicate lead management systems
- HIGH-05: Terminology collision (Client vs Account)

---

## CRITICAL Issues (Must Fix Before Production)

### CRIT-01: ~~Legacy Routes Lack Tenant Isolation~~ ✅ RESOLVED

**Status:** All legacy routes now have tenantMiddleware added.

**Files Updated:**
- `pmo/apps/api/src/routes/clients.ts` - ✅ tenantMiddleware added
- `pmo/apps/api/src/routes/contacts.ts` - ✅ tenantMiddleware added
- `pmo/apps/api/src/routes/projects.ts` - ✅ tenantMiddleware added
- `pmo/apps/api/src/routes/task.routes.ts` - ✅ tenantMiddleware added
- `pmo/apps/api/src/routes/milestone.routes.ts` - ✅ tenantMiddleware added
- `pmo/apps/api/src/routes/assets.ts` - ✅ tenantMiddleware added
- `pmo/apps/api/src/routes/leads.ts` - ✅ tenantMiddleware added
- `pmo/apps/api/src/modules/meetings/meeting.router.ts` - ✅ tenantMiddleware added
- `pmo/apps/api/src/modules/campaigns/campaign.router.ts` - ✅ tenantMiddleware added
- `pmo/apps/api/src/modules/marketing/marketing.router.ts` - ✅ tenantMiddleware added

---

### CRIT-02: ~~Legacy Services Missing Tenant Context~~ ✅ RESOLVED

**Status:** All legacy services now use hasTenantContext()/getTenantId() pattern for tenant filtering.

**Files Updated:**
- `pmo/apps/api/src/services/client.service.ts` - ✅ Tenant filtering added
- `pmo/apps/api/src/services/contact.service.ts` - ✅ Tenant filtering added
- `pmo/apps/api/src/services/project.service.ts` - ✅ Tenant filtering added
- `pmo/apps/api/src/services/task.service.ts` - ✅ Tenant filtering added
- `pmo/apps/api/src/services/milestone.service.ts` - ✅ Tenant filtering added
- `pmo/apps/api/src/services/asset.service.ts` - ✅ Tenant filtering added
- `pmo/apps/api/src/services/lead.service.ts` - ✅ Tenant filtering added
- `pmo/apps/api/src/modules/meetings/meeting.service.ts` - ✅ Tenant filtering added
- `pmo/apps/api/src/modules/campaigns/campaign.service.ts` - ✅ Tenant filtering added
- `pmo/apps/api/src/modules/marketing/marketing.service.ts` - ✅ Tenant filtering added

**Pattern used:**
```typescript
const tenantId = hasTenantContext() ? getTenantId() : undefined;
const records = await prisma.model.findMany({
  where: { ...filters, tenantId },
});
```

---

### CRIT-03: ~~Prisma Tenant Extension Excludes Legacy Models~~ ✅ RESOLVED

**Status:** All legacy PMO models are now included in TENANT_SCOPED_MODELS.

**File:** `pmo/apps/api/src/prisma/tenant-extension.ts`

**Models now included:**
```typescript
const TENANT_SCOPED_MODELS = new Set([
  // CRM Core
  'Account', 'CRMContact', 'Opportunity', 'OpportunityContact',
  'OpportunityLineItem', 'OpportunityStageHistory', 'Pipeline',
  'PipelineStage', 'CRMActivity',

  // Notifications & Integrations
  'Notification', 'Integration', 'SyncLog',

  // Usage Metering
  'UsageEvent', 'UsageSummary',

  // Legacy PMO models (NOW INCLUDED)
  'Client', 'Contact', 'Project', 'Task', 'Milestone',
  'Meeting', 'AIAsset', 'MarketingContent', 'Campaign', 'InboundLead',
]);
```

**Migration:** `20251213100000_add_tenant_to_remaining_models` added tenantId to all legacy models.

---

### CRIT-04: ~~No CRM Frontend Implementation~~ ✅ LARGELY RESOLVED

**Status:** Core CRM frontend is implemented and functional.

**Files Created:**
- `pmo/apps/web/src/api/accounts.ts` - ✅ Full CRUD API client
- `pmo/apps/web/src/api/opportunities.ts` - ✅ Full CRUD API client
- `pmo/apps/web/src/api/hooks/crm/index.ts` - ✅ Complete React Query hooks
- `pmo/apps/web/src/api/hooks/queryKeys.ts` - ✅ Query keys for accounts, opportunities
- `pmo/apps/web/src/pages/crm/AccountsPage.tsx` - ✅ Full page with stats, filters, CRUD
- `pmo/apps/web/src/pages/crm/OpportunitiesPage.tsx` - ✅ Full page with pipeline stats

**Routes Added in App.tsx:**
- `/crm/accounts` - ✅ AccountsPage
- `/crm/opportunities` - ✅ CRMOpportunitiesPage

**Still Missing (Lower Priority):**
- `pmo/apps/web/src/api/crm-contacts.ts` - CRM contacts API (contacts exist in PMO)
- `pmo/apps/web/src/api/activities.ts` - Activities API client
- `pmo/apps/web/src/api/pipelines.ts` - Pipelines management API
- Detail pages for accounts and opportunities

**Note:** Core CRM functionality is operational. Users can now access CRM features via `/crm/accounts` and `/crm/opportunities`.

---

## HIGH Priority Issues

### HIGH-01: PipelinePage Uses Legacy Data

**File:** `pmo/apps/web/src/pages/PipelinePage.tsx:5-6, 24-35`

**Evidence:**
```typescript
import { useProjects } from '../api/queries';
import { PipelineStage } from '../api/projects';  // LEGACY ENUM

const PIPELINE_STAGES: { value: PipelineStage }[] = [
  { value: 'NEW_LEAD', ... },     // Uses Project.pipelineStage
  { value: 'DISCOVERY', ... },    // NOT CRM Pipeline/SalesPipelineStage
];
```

**Impact:** Pipeline feature doesn't use CRM Opportunity/Pipeline models - just filters projects.

**Remediation:** Rewrite PipelinePage to use CRM Opportunity API with proper Pipeline/Stage support.

---

### HIGH-02: Inconsistent API Response Formats

**Legacy Routes:**
```typescript
// clients.ts:63-66
res.json({ clients: result.data, pagination: result.pagination });

// contacts.ts:42
res.json({ contacts });

// Error format
res.status(400).json({ error: 'Invalid client data', details: ... });
```

**CRM Routes:**
```typescript
// account.routes.ts:114, 137
res.json(result);  // { data: [], meta: {} }
res.status(201).json({ data: account });

// Error format
res.status(400).json({ errors: parsed.error.flatten() });
```

**Files Affected:**
| Route File | Response Wrapper | Error Format |
|------------|------------------|--------------|
| clients.ts | `{ clients }` | `{ error, details }` |
| contacts.ts | `{ contacts }` | `{ error, details }` |
| projects.ts | `{ projects }` | `{ error, details }` |
| account.routes.ts | `{ data }` | `{ errors }` |
| opportunity.routes.ts | `{ data }` | `{ errors }` |

**Remediation:** Standardize all routes to use `{ data }` wrapper and Zod `{ errors }` format.

---

### HIGH-03: Duplicate Lead Management Systems

**System 1 - InboundLead (Legacy PMO):**
```prisma
model InboundLead {
  id      Int        @id
  email   String
  status  LeadStatus // NEW, CONTACTED, QUALIFIED, DISQUALIFIED, CONVERTED
  // ...
}
```

**System 2 - CRMContact Lifecycle (New CRM):**
```prisma
model CRMContact {
  id        Int              @id
  email     String?
  lifecycle ContactLifecycle // LEAD, MQL, SQL, OPPORTUNITY, CUSTOMER, EVANGELIST, CHURNED
  leadScore Int?
  // ...
}
```

**Impact:** Two different models tracking same concept with different enums.

**Remediation:**
1. Map InboundLead → CRMContact via migration
2. Deprecate InboundLead model
3. Update LeadsPage to use CRMContact API

---

### HIGH-04: ~~No Test Coverage for CRM Services~~ ✅ RESOLVED

**Status:** Minimal test suite added.

**Existing Tests (Legacy PMO):**
```
pmo/apps/api/test/clients.routes.test.ts
pmo/apps/api/test/contacts.routes.test.ts
pmo/apps/api/test/projects.routes.test.ts
pmo/apps/api/test/task.routes.test.ts
pmo/apps/api/test/meetings.routes.test.ts
```

**CRM Tests Added:**
```
pmo/apps/api/test/crm/account.routes.test.ts     - ✅ ADDED (3 tests)
pmo/apps/api/test/crm/opportunity.routes.test.ts - ✅ ADDED (2 tests)
```

**Remaining (Optional):**
```
pmo/apps/api/test/crm/activity.routes.test.ts    - Not yet added
```

**Note:** Minimal test coverage now exists for core CRM functionality (accounts, opportunities, tenant isolation).

---

### HIGH-05: Terminology Collision (Client vs Account)

**Collision:**
| PMO Term | CRM Term | Semantic Overlap |
|----------|----------|------------------|
| `Client` | `Account` | Both represent companies |
| `Contact` | `CRMContact` | Both represent people |

**Impact:**
- Confusing codebase with two models for same concept
- Client model has AI Tool configs attached
- Can't cleanly migrate without breaking AI tools

**Remediation:**
1. Create migration path for Client → Account
2. Move AI Tool configs to Account model
3. Deprecate Client model over time

---

### HIGH-06: ~~Missing CRM React Query Hooks~~ ✅ RESOLVED

**Status:** CRM React Query hooks are fully implemented.

**File:** `pmo/apps/web/src/api/hooks/crm/index.ts`

**Account Hooks:**
- `useAccounts(filters?)` - List accounts with filtering
- `useAccount(id)` - Single account by ID
- `useAccountStats()` - Account statistics
- `useCreateAccount()` - Create mutation
- `useUpdateAccount(id)` - Update mutation
- `useArchiveAccount()` - Archive mutation
- `useRestoreAccount()` - Restore mutation
- `useDeleteAccount()` - Delete mutation

**Opportunity Hooks:**
- `useOpportunities(filters?)` - List opportunities
- `useOpportunity(id)` - Single opportunity
- `usePipelineStats(pipelineId?)` - Pipeline statistics
- `useClosingSoon(days?)` - Opportunities closing soon
- `useCreateOpportunity()` - Create mutation
- `useUpdateOpportunity(id)` - Update mutation
- `useMoveOpportunityToStage(id)` - Stage change mutation
- `useMarkOpportunityWon(id)` - Won mutation
- `useMarkOpportunityLost(id)` - Lost mutation
- `useDeleteOpportunity()` - Delete mutation

**Query keys defined in:** `pmo/apps/web/src/api/hooks/queryKeys.ts`

---

## MEDIUM Priority Issues

### MED-01: Enum Inconsistencies

**Duplicate Pipeline Concepts:**
```prisma
// Legacy (schema.prisma:99-108)
enum PipelineStage {
  NEW_LEAD, DISCOVERY, SHAPING_SOLUTION, PROPOSAL_SENT,
  NEGOTIATION, VERBAL_YES, WON, LOST
}

// CRM - Uses SalesPipelineStage model instead (dynamic per-tenant)
model SalesPipelineStage {
  name        String
  probability Int
  type        PipelineStageType  // OPEN, WON, LOST
}
```

**Duplicate Lead Sources:**
```prisma
// Legacy
enum LeadSource { WEBSITE_CONTACT, REFERRAL, LINKEDIN... }

// CRM
enum CRMLeadSource { WEBSITE, REFERRAL, LINKEDIN... }
```

**Remediation:** Consolidate to CRM enums, deprecate legacy enums.

---

### MED-02: Missing Validation Schemas for CRM

**Files Affected:**
- `pmo/apps/api/src/validation/` - No CRM schemas exported

**Current State:** CRM routes define Zod schemas inline in route files.

**Evidence:**
```typescript
// account.routes.ts:25-58
const createAccountSchema = z.object({...});  // Inline, not exported
```

**Remediation:** Move validation schemas to dedicated files for reuse.

---

### MED-03: Inconsistent Pagination Response Structure

**Legacy:**
```typescript
{
  clients: [...],
  pagination: { page, limit, total, totalPages }
}
```

**CRM:**
```typescript
{
  data: [...],
  meta: { page, limit, total, totalPages }
}
```

**Remediation:** Standardize to `{ data, meta }` pattern everywhere.

---

### MED-04: Project Model Has Pipeline Fields (Should Be Separate)

**File:** `pmo/prisma/schema.prisma` - Project model

**Evidence:** Project model includes sales pipeline fields that should be on Opportunity:
```prisma
model Project {
  pipelineStage      PipelineStage?
  pipelineValue      Decimal?
  probability        Int?
  expectedCloseDate  String?
  leadSource         String?
}
```

**Impact:** Confuses project management with sales pipeline functionality.

**Remediation:**
1. Migrate pipeline data from Project to Opportunity
2. Remove pipeline fields from Project model
3. Keep Project for delivery tracking only

---

### MED-05: No CRM Module Guard in Frontend

**File:** `pmo/apps/web/src/App.tsx`

**Evidence:** No `isModuleEnabled('crm')` check exists.

**Remediation:** Add CRM module flag and conditionally render CRM routes.

---

### MED-06: Missing TypeScript Types Export

**Impact:** Frontend can't import types from backend - must duplicate interfaces.

**Remediation:** Create shared types package or export Prisma-generated types.

---

### MED-07: Raw SQL in Account Service

**File:** `pmo/apps/api/src/crm/services/account.service.ts:535-547`

**Evidence:**
```typescript
prisma.$queryRaw`
  SELECT
    CASE WHEN "healthScore" >= 80 THEN 'healthy'...
  FROM "Account"
  WHERE "tenantId" = ${tenantId}
`
```

**Impact:** Raw SQL bypasses Prisma type safety and tenant extension.

**Remediation:** Use Prisma groupBy or aggregate methods instead.

---

### MED-08: Contact Model Duplicate Email Constraint

**Legacy Contact:**
```prisma
@@unique([clientId, email])  // Email unique per client
```

**CRM Contact:**
```prisma
// No unique constraint on email per account
```

**Remediation:** Align constraints or document intentional difference.

---

### MED-09: Missing Activity Cascade Rules

**File:** CRMActivity model relationships

**Issue:** Deleting Account/Contact/Opportunity - what happens to activities?

**Remediation:** Add explicit onDelete cascade rules.

---

### MED-10: Frontend Client Model Doesn't Match CRM Account

**Impact:** ClientsPage, ClientDetailsPage show PMO Client fields (aiMaturity, companySize) not CRM Account fields (healthScore, engagementScore, annualRevenue).

**Remediation:** Create AccountsPage/AccountDetailsPage with proper CRM fields.

---

## LOW Priority Issues

### LOW-01: Console.log Statements in Production Code

**Files with console.error:**
- clients.ts:68, 88, 120, 143, 166
- contacts.ts (error handling)
- projects.ts (multiple locations)

**Remediation:** Use proper logging library (winston, pino).

---

### LOW-02: Inconsistent ID Validation

**Legacy:** Uses `Number(req.params.id)` with `Number.isNaN` check
**CRM:** Uses `parseInt(req.params.id, 10)` with `isNaN` check

**Remediation:** Create shared ID parsing utility.

---

### LOW-03: Missing JSDoc on Legacy Services

**CRM Services:** Well-documented with JSDoc
**Legacy Services:** Minimal documentation

**Remediation:** Add JSDoc to legacy services.

---

### LOW-04: Hardcoded Pagination Limits

**Evidence:** Multiple files define `DEFAULT_PAGE_SIZE = 50`, `MAX_PAGE_SIZE = 100`

**Remediation:** Create shared pagination config.

---

### LOW-05: No E2E Tests for CRM Flows

**Existing E2E:** Focus on PMO flows (client intake, project setup)

**Missing:** CRM flows (account creation, opportunity pipeline, activity logging)

**Remediation:** Add Playwright tests for CRM user journeys.

---

### LOW-06: Unused Imports in Route Files

**Evidence:** Some route files import types not used.

**Remediation:** Run linter with unused imports rule.

---

### LOW-07: Missing Error Boundaries in CRM Pages

**Impact:** CRM pages (when created) may crash without graceful error handling.

**Remediation:** Add error boundaries to lazy-loaded CRM pages.

---

### LOW-08: No API Versioning

**Current:** `/api/crm/accounts`
**Future-proof:** `/api/v1/crm/accounts`

**Remediation:** Consider API versioning before major release.

---

## Remediation Priority Matrix

| Phase | Items | Effort | Risk Reduction | Status |
|-------|-------|--------|----------------|--------|
| **Phase 1: Security** | CRIT-01, CRIT-02, CRIT-03 | ~3 days | Eliminates data leakage | ✅ COMPLETED |
| **Phase 2: CRM Frontend** | CRIT-04, HIGH-06 | ~5 days | Enables CRM UI | ✅ COMPLETED |
| **Phase 3: Testing** | HIGH-04 | ~3 days | Quality assurance | ✅ COMPLETED (minimal) |
| **Phase 4: Legacy Migration** | HIGH-01, HIGH-03, HIGH-05 | ~4 days | Removes duplication | Pending |
| **Phase 5: Standardization** | HIGH-02, MED-01 to MED-05 | ~4 days | Code consistency | Pending |
| **Phase 6: Cleanup** | LOW-01 to LOW-08 | ~2 days | Maintainability | Pending |

---

## Recommended Next Steps

1. **✅ COMPLETED (Phases 1-3):**
   - ~~Add `requireTenant` middleware to legacy routes~~ ✅
   - ~~Add tenantId to legacy service functions~~ ✅
   - ~~Add legacy models to Prisma tenant extension~~ ✅
   - ~~Create CRM API client files~~ ✅
   - ~~Create CRM React Query hooks~~ ✅
   - ~~Build AccountsPage and OpportunitiesPage~~ ✅
   - ~~Basic CRM test coverage~~ ✅

2. **Current Priority (This Sprint):**
   - Verify production migration deployed successfully
   - Add CRM Activities API and hooks
   - Create account/opportunity detail pages
   - Add CRM Pipelines management UI

3. **Short Term (Next Sprint):**
   - Migrate PipelinePage to use CRM Opportunity (HIGH-01)
   - Consolidate Lead/Contact models (HIGH-03)
   - Add comprehensive CRM test coverage

4. **Medium Term (Next Quarter):**
   - Full Client → Account migration (HIGH-05)
   - API response format standardization (HIGH-02)
   - API versioning strategy

5. **Long Term:**
   - Comprehensive E2E coverage
   - Performance optimization
   - Clean up deprecated code

---

## Files Reference

### Critical Path Files

| Purpose | Path |
|---------|------|
| Tenant Extension | `pmo/apps/api/src/prisma/tenant-extension.ts` |
| Legacy Client Route | `pmo/apps/api/src/routes/clients.ts` |
| Legacy Client Service | `pmo/apps/api/src/services/client.service.ts` |
| CRM Account Route | `pmo/apps/api/src/crm/routes/account.routes.ts` |
| CRM Account Service | `pmo/apps/api/src/crm/services/account.service.ts` |
| Frontend Router | `pmo/apps/web/src/App.tsx` |
| Pipeline Page | `pmo/apps/web/src/pages/PipelinePage.tsx` |
| Prisma Schema | `pmo/prisma/schema.prisma` |

---

*Report generated by Claude Code technical debt analysis*
