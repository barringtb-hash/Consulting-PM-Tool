# CRM Transformation Technical Debt Report

**Generated:** December 11, 2025
**Reviewed Codebase:** PMO Consulting Tool → CRM Platform Transformation

---

## Executive Summary

The PMO-to-CRM transformation has a solid architectural foundation with well-designed CRM services and multi-tenancy infrastructure. However, significant legacy code remains that creates security vulnerabilities, inconsistent patterns, and incomplete integration. **28 distinct technical debt items** were identified across 5 categories.

### Risk Distribution

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 4 | Security/data isolation vulnerabilities |
| **HIGH** | 6 | Incomplete features blocking production use |
| **MEDIUM** | 10 | Inconsistent patterns causing maintenance burden |
| **LOW** | 8 | Code quality improvements for long-term health |

---

## CRITICAL Issues (Must Fix Before Production)

### CRIT-01: Legacy Routes Lack Tenant Isolation

**Files Affected:**
- `pmo/apps/api/src/routes/clients.ts:21-71` - No tenantId filtering
- `pmo/apps/api/src/routes/contacts.ts:22-43` - No tenantId filtering
- `pmo/apps/api/src/routes/projects.ts:40-91` - No tenantId filtering
- `pmo/apps/api/src/routes/task.routes.ts` - No tenantId filtering
- `pmo/apps/api/src/modules/meetings/meeting.router.ts` - No tenantId filtering

**Impact:** In a multi-tenant deployment, users can view/modify data belonging to other tenants.

**Evidence:**
```typescript
// clients.ts:54-62 - Lists ALL clients in database
const result = await listClients({
  search: typeof search === 'string' ? search : undefined,
  // NO tenantId parameter!
});
res.json({ clients: result.data, pagination: result.pagination });
```

**Remediation:**
1. Add `requireTenant` middleware to all legacy routes
2. Pass tenantId to service functions
3. Add legacy models to `TENANT_SCOPED_MODELS` in tenant-extension.ts

---

### CRIT-02: Legacy Services Missing Tenant Context

**Files Affected:**
- `pmo/apps/api/src/services/client.service.ts:34-89` - No getTenantId() call
- `pmo/apps/api/src/services/contact.service.ts:15-38` - No getTenantId() call
- `pmo/apps/api/src/services/project.service.ts:31-71` - No getTenantId() call
- `pmo/apps/api/src/services/task.service.ts` - No getTenantId() call
- `pmo/apps/api/src/modules/meetings/meeting.service.ts` - No getTenantId() call

**Impact:** Services query database without tenant filtering, returning all data regardless of tenant.

**Evidence:**
```typescript
// client.service.ts:70-77
const [total, data] = await Promise.all([
  prisma.client.count({ where }),      // No tenantId filter
  prisma.client.findMany({ where }),   // No tenantId filter
]);
```

**Remediation:**
1. Import `getTenantId` from tenant.context.ts
2. Add tenantId to all WHERE clauses
3. Add tenantId to all CREATE operations

---

### CRIT-03: Prisma Tenant Extension Excludes Legacy Models

**File:** `pmo/apps/api/src/prisma/tenant-extension.ts:21-54`

**Evidence:**
```typescript
const TENANT_SCOPED_MODELS = new Set([
  'Account',       // CRM - included
  'CRMContact',    // CRM - included
  'Opportunity',   // CRM - included
  // ...

  // Legacy models EXCLUDED:
  // 'Client',      // PMO - COMMENTED OUT
  // 'Contact',     // PMO - COMMENTED OUT
  // 'Project',     // PMO - COMMENTED OUT
]);
```

**Impact:** Prisma's automatic tenant filtering doesn't apply to legacy models.

**Remediation:**
1. Add tenantId field to legacy models via migration
2. Uncomment legacy models in TENANT_SCOPED_MODELS
3. Run data migration to assign existing records to default tenant

---

### CRIT-04: No CRM Frontend Implementation

**Files Missing:**
- `pmo/apps/web/src/api/accounts.ts` - Does not exist
- `pmo/apps/web/src/api/opportunities.ts` - Does not exist
- `pmo/apps/web/src/api/crm-contacts.ts` - Does not exist
- `pmo/apps/web/src/api/activities.ts` - Does not exist
- `pmo/apps/web/src/api/pipelines.ts` - Does not exist

**Routes Missing in App.tsx:**
- `/crm/accounts` - No route defined
- `/crm/accounts/:id` - No route defined
- `/crm/opportunities` - No route defined
- `/crm/contacts` - No route defined
- `/crm/pipeline` - No route defined

**Impact:** Backend CRM APIs exist but have zero frontend integration. Users cannot access CRM features.

**Remediation:**
1. Create CRM API client files
2. Create React Query hooks for CRM entities
3. Create CRM page components
4. Add routes to App.tsx

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

### HIGH-04: No Test Coverage for CRM Services

**Existing Tests (Legacy PMO):**
```
pmo/apps/api/test/clients.routes.test.ts
pmo/apps/api/test/contacts.routes.test.ts
pmo/apps/api/test/projects.routes.test.ts
pmo/apps/api/test/task.routes.test.ts
pmo/apps/api/test/meetings.routes.test.ts
```

**Missing Tests (CRM):**
```
pmo/apps/api/test/crm/account.routes.test.ts     - MISSING
pmo/apps/api/test/crm/opportunity.routes.test.ts - MISSING
pmo/apps/api/test/crm/activity.routes.test.ts    - MISSING
pmo/apps/api/test/crm/account.service.test.ts    - MISSING
```

**Remediation:** Create comprehensive test suite for CRM services and routes.

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

### HIGH-06: Missing CRM React Query Hooks

**File:** `pmo/apps/web/src/api/hooks/` - No CRM hooks

**Existing PMO Hooks:**
```
hooks/clients/index.ts     - useClients, useClient, useCreateClient...
hooks/contacts/index.ts    - useContacts, useCreateContact...
hooks/projects/index.ts    - useProjects, useProject...
```

**Missing CRM Hooks:**
```
hooks/crm/accounts.ts      - useAccounts, useAccount...
hooks/crm/opportunities.ts - useOpportunities, useOpportunity...
hooks/crm/activities.ts    - useActivities, useCreateActivity...
hooks/crm/pipelines.ts     - usePipelines, usePipelineStages...
```

**Remediation:** Create React Query hooks for all CRM entities.

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

| Phase | Items | Effort | Risk Reduction |
|-------|-------|--------|----------------|
| **Phase 1: Security** | CRIT-01, CRIT-02, CRIT-03 | ~3 days | Eliminates data leakage |
| **Phase 2: Integration** | CRIT-04, HIGH-01, HIGH-06 | ~5 days | Enables CRM UI |
| **Phase 3: Testing** | HIGH-04 | ~3 days | Quality assurance |
| **Phase 4: Standardization** | HIGH-02, MED-01 to MED-05 | ~4 days | Code consistency |
| **Phase 5: Cleanup** | LOW-01 to LOW-08 | ~2 days | Maintainability |

---

## Recommended Next Steps

1. **Immediate (This Sprint):**
   - Add `requireTenant` middleware to legacy routes
   - Add tenantId to legacy service functions
   - Run security audit on tenant isolation

2. **Short Term (Next Sprint):**
   - Create CRM API client files
   - Create CRM React Query hooks
   - Build AccountsPage and OpportunitiesPage

3. **Medium Term (Next Quarter):**
   - Write CRM test suite
   - Migrate PipelinePage to use CRM Opportunity
   - Consolidate Lead/Contact models

4. **Long Term:**
   - Full Client → Account migration
   - API versioning strategy
   - Comprehensive E2E coverage

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
