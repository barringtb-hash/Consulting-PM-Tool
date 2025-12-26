# Tenant System Analysis Report

**Date:** 2025-12-26
**Status:** CRITICAL ISSUES IDENTIFIED

## Executive Summary

This report provides a comprehensive analysis of the multi-tenant system in the AI CRM Platform. The investigation was triggered by issues with certain AI modules not working properly due to tenant mapping inconsistencies.

### Key Findings

1. **Prisma Tenant Extension** - Only covers 14 out of 100+ models that need tenant filtering
2. **AI Module Services** - Most AI modules do NOT use tenant context, creating potential cross-tenant data leaks
3. **Inconsistent Patterns** - Finance module uses tenant filtering correctly, but AI modules do not
4. **Missing tenantId Columns** - Many AI module config models lack tenantId entirely

---

## 1. Tenant Architecture Overview

### 1.1 Core Components

| Component | File | Purpose |
|-----------|------|---------|
| Tenant Context | `src/tenant/tenant.context.ts` | AsyncLocalStorage for tenant context propagation |
| Tenant Middleware | `src/tenant/tenant.middleware.ts` | Extracts tenant from request (subdomain, header, JWT) |
| Tenant Extension | `src/prisma/tenant-extension.ts` | Prisma extension for auto-filtering queries |

### 1.2 Tenant Resolution Flow

```
Request → Tenant Middleware → AsyncLocalStorage Context → Service → Prisma Extension → Database
```

**Resolution methods (in order of priority):**
1. Subdomain extraction (e.g., `acme.yourcrm.com`)
2. Custom domain lookup (TenantDomain table)
3. X-Tenant-ID header (service-to-service)
4. User's tenant membership (authenticated users)
5. Default tenant (single-tenant mode)

---

## 2. Prisma Tenant Extension Analysis

### 2.1 Models Currently in TENANT_SCOPED_MODELS

The extension (`tenant-extension.ts:22-54`) only auto-filters these models:

**CRM Core (9 models):**
- Account ✅
- CRMContact ✅
- Opportunity ✅
- OpportunityContact ✅
- OpportunityLineItem ✅
- OpportunityStageHistory ✅
- Pipeline ✅
- PipelineStage ✅
- CRMActivity ✅

**Notifications & Integrations (3 models):**
- Notification ✅
- Integration ✅
- SyncLog ✅

**Usage Metering (2 models):**
- UsageEvent ✅
- UsageSummary ✅

**Legacy PMO (10 models):**
- Client ✅
- Contact ✅
- Project ✅
- Task ✅
- Milestone ✅
- Meeting ✅
- AIAsset ✅
- MarketingContent ✅
- Campaign ✅
- InboundLead ✅

### 2.2 CRITICAL: Models with tenantId NOT in Extension

These models have `tenantId` in schema but are NOT in `TENANT_SCOPED_MODELS`:

| Model | Has tenantId | In Extension | Risk Level |
|-------|--------------|--------------|------------|
| SavedReport | ✅ String | ❌ | HIGH |
| AuditLog | ✅ String? | ❌ | MEDIUM |
| TenantHealthMetrics | ✅ String | ❌ | LOW |
| ExpenseCategory | ✅ String | ❌ | HIGH |
| Budget | ✅ String | ❌ | HIGH |
| Expense | ✅ String | ❌ | HIGH |
| RecurringCost | ✅ String | ❌ | HIGH |
| AccountProfitability | ✅ String | ❌ | HIGH |
| FinanceAlert | ✅ String | ❌ | HIGH |
| FinanceInsight | ✅ String | ❌ | HIGH |
| FinanceConfig | ✅ String @unique | ❌ | MEDIUM |
| AIUsageEvent | ✅ String | ❌ | HIGH |
| AIUsageSummary | ✅ String | ❌ | HIGH |
| Anomaly | ✅ String? | ❌ | MEDIUM |
| ProductDescriptionConfig | ✅ String | ❌ | HIGH |
| SchedulingConfig | ✅ String? | ❌ | HIGH |
| ShiftSchedulingConfig | ✅ String | ❌ | HIGH |

**Note:** While Finance services manually use `getTenantId()`, the Prisma extension provides defense-in-depth. Without extension coverage, a bug in service code could leak data.

---

## 3. AI Module Tenant Integration Analysis

### 3.1 Phase 1 AI Modules

| Module | Config Model | Has tenantId | Service Uses getTenantId | Status |
|--------|--------------|--------------|--------------------------|--------|
| **Chatbot** | ChatbotConfig | ❌ (uses accountId) | ❌ No | ⚠️ BROKEN |
| **Product Descriptions** | ProductDescriptionConfig | ✅ String | ❌ Partial | ⚠️ INCONSISTENT |
| **Scheduling** | SchedulingConfig | ✅ String? (optional) | ❌ Optional | ⚠️ INCONSISTENT |
| **Intake** | IntakeConfig | ❌ (uses clientId) | ❌ No | ⚠️ BROKEN |

#### Chatbot Module Issues

**Location:** `src/modules/chatbot/chatbot.service.ts`

**Problems:**
1. `ChatbotConfig` has no `tenantId` column - relies on `accountId/clientId`
2. `listChatbotConfigs()` without filters returns ALL configs across ALL tenants
3. Child models (ChatConversation, ChatMessage, etc.) have no tenant filtering

**Affected Models (no tenantId):**
- ChatbotConfig
- WebhookConfig
- ChannelConfig
- ChatConversation
- ChatMessage
- KnowledgeBaseItem
- ChatAnalytics

#### Scheduling Module Issues

**Location:** `src/modules/scheduling/scheduling.service.ts`

**Problems:**
1. `SchedulingConfig.tenantId` is optional (String?)
2. `listSchedulingConfigs()` has optional `tenantId` filter - not required
3. `getProvider()` and `getAppointment()` do not filter by tenant at all

**Affected Models (no tenantId):**
- Provider
- AppointmentType
- Appointment
- AppointmentReminder
- WaitlistEntry
- NoShowPredictionLog
- BookingPage
- CalendarIntegration
- VideoMeetingConfig
- PaymentConfig
- ShiftEmployee
- ShiftLocation
- ShiftRole
- Shift
- etc.

#### Intake Module Issues

**Location:** `src/modules/intake/intake.service.ts`

**Problems:**
1. `IntakeConfig` has no `tenantId` - only `clientId`
2. All intake queries rely on clientId relationship

**Affected Models (no tenantId):**
- IntakeConfig
- IntakeForm
- IntakeFormField
- IntakeSubmission
- IntakeConversation
- IntakeDocument
- ComplianceTemplate
- ComplianceCheck
- IntakeWorkflow
- WorkflowProgress

### 3.2 Phase 2 AI Modules

| Module | Config Model | Has tenantId | Service Uses getTenantId | Status |
|--------|--------------|--------------|--------------------------|--------|
| **Document Analyzer** | DocumentAnalyzerConfig | ❌ (uses accountId) | ❌ No | ⚠️ BROKEN |
| **Content Generator** | ContentGeneratorConfig | ❌ (uses clientId) | ❌ No | ⚠️ BROKEN |
| **Lead Scoring** | LeadScoringConfig | ❌ (uses clientId) | ❌ No | ⚠️ BROKEN |
| **Prior Auth** | PriorAuthConfig | ❌ (uses clientId) | ❌ No | ⚠️ BROKEN |

#### Document Analyzer Issues

**Location:** `src/modules/document-analyzer/document-analyzer.service.ts`

**Problems:**
1. No `tenantId` in DocumentAnalyzerConfig
2. `listDocumentAnalyzerConfigs()` without filters returns ALL configs
3. `getDocumentAnalyzerConfig()` only filters by accountId/clientId

**Affected Models (no tenantId):**
- DocumentAnalyzerConfig
- AnalyzedDocument
- ExtractionTemplate
- DocumentBatchJob
- DocumentWorkflow
- DocumentIntegration
- ProcessingMetrics
- ComplianceRuleSet

### 3.3 Phase 3 AI Modules

| Module | Config Model | Has tenantId | Service Uses getTenantId | Status |
|--------|--------------|--------------|--------------------------|--------|
| **Inventory Forecasting** | InventoryForecastConfig | ❌ (uses clientId) | ❌ No | ⚠️ BROKEN |
| **Compliance Monitor** | ComplianceMonitorConfig | ❌ (uses clientId) | ❌ No | ⚠️ BROKEN |
| **Predictive Maintenance** | PredictiveMaintenanceConfig | ❌ (uses clientId) | ❌ No | ⚠️ BROKEN |
| **Revenue Management** | RevenueManagementConfig | ❌ (uses clientId) | ❌ No | ⚠️ BROKEN |
| **Safety Monitor** | SafetyMonitorConfig | ❌ (uses clientId) | ❌ No | ⚠️ BROKEN |

---

## 4. Customer Success Module Analysis

| Model | Has tenantId | Status |
|-------|--------------|--------|
| CustomerHealthScore | ❌ (uses clientId) | ⚠️ No tenant isolation |
| HealthScoreHistory | ❌ (via parent) | ⚠️ No tenant isolation |
| SuccessPlan | ❌ (uses clientId) | ⚠️ No tenant isolation |
| SuccessObjective | ❌ (via parent) | ⚠️ No tenant isolation |
| SuccessTask | ❌ (via parent) | ⚠️ No tenant isolation |
| CTA | ❌ (uses clientId) | ⚠️ No tenant isolation |
| CTATask | ❌ (via parent) | ⚠️ No tenant isolation |
| Playbook | ❌ (unknown) | ⚠️ No tenant isolation |
| CSActivityLog | ❌ (uses clientId) | ⚠️ No tenant isolation |
| CSMetricSnapshot | ❌ (uses clientId) | ⚠️ No tenant isolation |
| ContactEngagement | ❌ (unknown) | ⚠️ No tenant isolation |
| CSRule | ❌ (unknown) | ⚠️ No tenant isolation |
| CSSurvey | ❌ (uses clientId) | ⚠️ No tenant isolation |
| CSSurveyResponse | ❌ (via parent) | ⚠️ No tenant isolation |

**Issue:** All Customer Success models rely on `clientId` relationship instead of direct `tenantId`.

---

## 5. CRM Module Analysis (CORRECT IMPLEMENTATION)

The CRM module serves as a **reference implementation** for correct tenant handling.

### 5.1 Correct Pattern Used

```typescript
// src/crm/services/account.service.ts
import { getTenantId } from '../../tenant/tenant.context';

export async function createAccount(input: CreateAccountInput) {
  const tenantId = getTenantId();

  return prisma.account.create({
    data: {
      tenantId,  // Explicit tenantId
      ...input,
    },
  });
}

export async function getAccountById(id: number) {
  const tenantId = getTenantId();

  return prisma.account.findFirst({
    where: { id, tenantId },  // Always filter by tenantId
    ...
  });
}
```

### 5.2 CRM Models - All Correct

| Model | Has tenantId | In Extension | Service Uses getTenantId |
|-------|--------------|--------------|--------------------------|
| Account | ✅ | ✅ | ✅ |
| CRMContact | ✅ | ✅ | ✅ |
| Pipeline | ✅ | ✅ | ✅ |
| Opportunity | ✅ | ✅ | ✅ |
| CRMActivity | ✅ | ✅ | ✅ |

---

## 6. Finance Module Analysis (CORRECT IMPLEMENTATION)

The Finance module also correctly uses tenant context.

### 6.1 Correct Pattern Used

```typescript
// src/modules/finance-tracking/services/expense.service.ts
import { getTenantId } from '../../../tenant/tenant.context';

export async function listExpenses(params: ListExpensesInput) {
  const tenantId = getTenantId();

  const where: Prisma.ExpenseWhereInput = {
    tenantId,  // Always include tenantId
    ...
  };

  return prisma.expense.findMany({ where, ... });
}
```

### 6.2 Finance Models - Service Layer Correct, Extension Missing

| Model | Has tenantId | In Extension | Service Uses getTenantId |
|-------|--------------|--------------|--------------------------|
| ExpenseCategory | ✅ | ❌ | ✅ |
| Budget | ✅ | ❌ | ✅ |
| Expense | ✅ | ❌ | ✅ |
| RecurringCost | ✅ | ❌ | ✅ |

**Note:** While services use tenant filtering correctly, adding these to the Prisma extension provides defense-in-depth.

---

## 7. Recommended Fixes

### 7.1 Priority 1 - Critical (Security Risk)

**Add tenantId to AI Module Config models:**

1. Add `tenantId String` to these schema models:
   - ChatbotConfig
   - DocumentAnalyzerConfig
   - IntakeConfig
   - ContentGeneratorConfig
   - LeadScoringConfig
   - PriorAuthConfig
   - InventoryForecastConfig
   - ComplianceMonitorConfig
   - PredictiveMaintenanceConfig
   - RevenueManagementConfig
   - SafetyMonitorConfig

2. Create migration to backfill tenantId from related Account/Client

3. Update services to use `getTenantId()` pattern

### 7.2 Priority 2 - High (Defense in Depth)

**Expand TENANT_SCOPED_MODELS in tenant-extension.ts:**

```typescript
const TENANT_SCOPED_MODELS = new Set([
  // Existing...

  // Finance (add these)
  'ExpenseCategory',
  'Budget',
  'Expense',
  'RecurringCost',
  'AccountProfitability',
  'FinanceAlert',
  'FinanceInsight',
  'FinanceConfig',

  // AI Monitoring (add these)
  'AIUsageEvent',
  'AIUsageSummary',

  // Reports (add these)
  'SavedReport',

  // After fixing schema:
  'ChatbotConfig',
  'SchedulingConfig',
  'ShiftSchedulingConfig',
  'ProductDescriptionConfig',
  // etc.
]);
```

### 7.3 Priority 3 - Medium (Customer Success)

**Add tenantId to Customer Success models:**

1. Add `tenantId String` to:
   - CustomerHealthScore
   - SuccessPlan
   - CTA
   - Playbook
   - CSActivityLog
   - CSMetricSnapshot
   - CSRule
   - CSSurvey

2. Update services to filter by tenant

### 7.4 Priority 4 - Standardization

**Update all list functions to require tenant filtering:**

```typescript
// WRONG
export async function listConfigs(filters?: { clientId?: number }) {
  return prisma.config.findMany({ where: filters });
}

// RIGHT
export async function listConfigs(filters?: { clientId?: number }) {
  const tenantId = getTenantId();
  return prisma.config.findMany({
    where: { ...filters, tenantId }
  });
}
```

---

## 8. Migration Strategy

### Phase 1: Schema Updates (Week 1)

1. Add `tenantId` column to all AI module config tables
2. Create backfill script to populate tenantId from Account → tenant relationship
3. Make tenantId NOT NULL after backfill

### Phase 2: Service Updates (Week 2)

1. Update all AI module services to import and use `getTenantId()`
2. Update all list/get functions to filter by tenantId
3. Add validation that tenant context exists

### Phase 3: Extension Updates (Week 3)

1. Add all tenant-scoped models to `TENANT_SCOPED_MODELS`
2. Test tenant isolation thoroughly
3. Add integration tests for cross-tenant access prevention

---

## 9. Testing Requirements

### 9.1 Existing Test

`test/tenant-isolation.test.ts` - Update to cover:
- All AI module configs
- All Customer Success models
- Finance models

### 9.2 Required New Tests

```typescript
describe('AI Module Tenant Isolation', () => {
  it('should not return chatbot configs from other tenants', async () => {
    // Create config in tenant A
    // Try to list from tenant B
    // Should return empty array
  });

  it('should not allow updating configs from other tenants', async () => {
    // Create config in tenant A
    // Try to update from tenant B
    // Should throw P2025 (not found)
  });
});
```

---

## 10. Summary Table

| Module | Models Affected | Current Status | Priority |
|--------|-----------------|----------------|----------|
| Chatbot | 7 models | No tenantId | P1 |
| Scheduling | 15+ models | Optional tenantId | P1 |
| Intake | 10 models | No tenantId | P1 |
| Document Analyzer | 8 models | No tenantId | P1 |
| Content Generator | 5+ models | No tenantId | P1 |
| Lead Scoring | 6 models | No tenantId | P1 |
| Prior Auth | 5 models | No tenantId | P1 |
| Inventory | 8 models | No tenantId | P2 |
| Compliance Monitor | 7 models | No tenantId | P2 |
| Predictive Maintenance | 9 models | No tenantId | P2 |
| Revenue Management | 8 models | No tenantId | P2 |
| Safety Monitor | 10 models | No tenantId | P2 |
| Customer Success | 14 models | No tenantId | P3 |
| Finance | 8 models | Correct in service, missing in extension | P3 |

---

## Appendix A: Full Model Inventory

### Models with Direct tenantId

1. Account ✅
2. CRMContact ✅
3. Opportunity ✅
4. Pipeline ✅
5. CRMActivity ✅
6. Client ✅
7. Contact ✅
8. Project ✅
9. Task ✅
10. Milestone ✅
11. Meeting ✅
12. AIAsset ✅
13. MarketingContent ✅
14. Campaign ✅
15. InboundLead ✅
16. Notification ✅
17. Integration ✅
18. UsageEvent ✅
19. UsageSummary ✅
20. ExpenseCategory ✅
21. Budget ✅
22. Expense ✅
23. RecurringCost ✅
24. AccountProfitability ✅
25. FinanceAlert ✅
26. FinanceInsight ✅
27. FinanceConfig ✅
28. SavedReport ✅
29. AuditLog ✅
30. AIUsageEvent ✅
31. AIUsageSummary ✅
32. ProductDescriptionConfig ✅
33. SchedulingConfig ✅
34. ShiftSchedulingConfig ✅
35. TenantHealthMetrics ✅

### Models Relying on Parent Relationships (Need tenantId)

1. ChatbotConfig (via accountId)
2. WebhookConfig (via chatbotConfigId)
3. ChannelConfig (via chatbotConfigId)
4. ChatConversation (via chatbotConfigId)
5. ChatMessage (via conversationId)
6. KnowledgeBaseItem (via chatbotConfigId)
7. ChatAnalytics (via chatbotConfigId)
8. Product (via configId)
9. ProductDescription (via productId)
10. DescriptionTemplate (via configId)
11. BulkGenerationJob (via configId)
12. IntakeConfig (via clientId)
13. IntakeForm (via configId)
14. ... (100+ more)

---

## Appendix B: Code Patterns Reference

### Correct Service Pattern

```typescript
import { prisma } from '../../prisma/client';
import { getTenantId } from '../../tenant/tenant.context';

export async function listItems(filters?: ItemFilters) {
  const tenantId = getTenantId();

  return prisma.item.findMany({
    where: {
      tenantId,  // ALWAYS include tenantId
      ...filters,
    },
  });
}

export async function getItemById(id: number) {
  const tenantId = getTenantId();

  // Use findFirst with tenantId instead of findUnique
  return prisma.item.findFirst({
    where: { id, tenantId },
  });
}

export async function createItem(input: CreateItemInput) {
  const tenantId = getTenantId();

  return prisma.item.create({
    data: {
      tenantId,  // ALWAYS set tenantId on create
      ...input,
    },
  });
}
```

### Incorrect Pattern (Current AI Modules)

```typescript
// WRONG - No tenant filtering
export async function listConfigs(filters?: { clientId?: number }) {
  return prisma.config.findMany({
    where: filters ? { clientId: filters.clientId } : undefined,
  });
  // Returns ALL configs if no filter provided!
}
```
