# Customer Success → Account Module Merge Plan

## Overview

This plan consolidates the Customer Success module into the Account module, eliminating duplicate data models while preserving sophisticated CS features (CTAs, Playbooks, Success Plans, Health Score History).

**Current State:**
- Customer Success uses legacy `Client` model with separate health score tracking
- Account module has basic health/engagement fields but no CS features
- Two separate activity models, contact models, and health scoring systems

**Target State:**
- All CS features accessible from Account
- Single source of truth for health scores with history
- Unified activity timeline
- CTAs, Playbooks, and Success Plans linked to Account

---

## Phase 1: Database Schema Updates

### 1.1 Add Account Relations to CS Models

**File:** `pmo/prisma/schema.prisma`

Add `accountId` to existing Customer Success models:

```prisma
model CTA {
  // Existing fields...
  accountId   String?   @db.Uuid
  account     Account?  @relation(fields: [accountId], references: [id])
  // Keep clientId for backwards compatibility during migration
}

model SuccessPlan {
  // Existing fields...
  accountId   String?   @db.Uuid
  account     Account?  @relation(fields: [accountId], references: [id])
}

model Playbook {
  // Already tenant-scoped, no client/account needed
  // Keep as-is - playbooks are templates
}
```

### 1.2 Create Account-Linked Health Score History

**File:** `pmo/prisma/schema.prisma`

```prisma
model AccountHealthScoreHistory {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  accountId       String   @db.Uuid
  account         Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  overallScore    Int      // 0-100
  usageScore      Int?     // Optional dimension scores
  supportScore    Int?
  engagementScore Int?
  sentimentScore  Int?
  financialScore  Int?

  churnRisk       Float?   // 0-1 probability
  expansionPotential Float? // 0-1 probability
  category        HealthCategory @default(HEALTHY)

  notes           String?
  calculatedAt    DateTime @default(now())

  tenantId        String   @db.Uuid
  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  @@index([accountId, calculatedAt])
  @@index([tenantId])
}

enum HealthCategory {
  HEALTHY
  AT_RISK
  CRITICAL
}
```

### 1.3 Update Account Model

**File:** `pmo/prisma/schema.prisma`

Add relations to Account:

```prisma
model Account {
  // Existing fields...

  // Customer Success relations
  ctas                    CTA[]
  successPlans            SuccessPlan[]
  healthScoreHistory      AccountHealthScoreHistory[]

  // Enhanced health fields (already exist but document purpose)
  healthScore             Int      @default(50)  // Current overall score
  engagementScore         Int      @default(50)  // Current engagement
  churnRisk               Float?                 // Current churn risk
}
```

### 1.4 Create Migration

```bash
npx prisma migrate dev --name merge-customer-success-into-account
```

---

## Phase 2: Data Migration Scripts

### 2.1 Migrate CustomerHealthScore to Account

**File:** `pmo/apps/api/src/scripts/migrate-health-scores-to-account.ts`

```typescript
// Script to:
// 1. Find each CustomerHealthScore record
// 2. Look up Account via Client.id → Account.customFields.legacyClientId
// 3. Create AccountHealthScoreHistory record
// 4. Update Account.healthScore with latest score
```

### 2.2 Migrate CTA/SuccessPlan to Account

**File:** `pmo/apps/api/src/scripts/migrate-cs-entities-to-account.ts`

```typescript
// Script to:
// 1. For each CTA with clientId, find corresponding Account
// 2. Set CTA.accountId
// 3. Same for SuccessPlan
```

### 2.3 Migrate CSActivityLog to CRMActivity

**File:** `pmo/apps/api/src/scripts/migrate-cs-activities.ts`

```typescript
// Script to:
// 1. Map CSActivityLog types to CRMActivity types
// 2. Create CRMActivity records for each CSActivityLog
// 3. Link to Account instead of Client
```

---

## Phase 3: Backend Service Layer

### 3.1 Create Account-Centric Health Score Service

**File:** `pmo/apps/api/src/crm/services/account-health.service.ts`

```typescript
// Functions:
// - calculateHealthScore(accountId, dimensions) - Calculate and store
// - getHealthScoreHistory(accountId, dateRange) - Get history
// - getHealthScoreTrend(accountId) - Get trend analysis
// - recalculateAllScores(tenantId) - Batch recalculation
```

### 3.2 Create Account-Centric CTA Service

**File:** `pmo/apps/api/src/crm/services/account-cta.service.ts`

```typescript
// Migrate from customer-success/cta.service.ts
// Update to use accountId instead of clientId
// Functions:
// - createCTA(accountId, data)
// - getCTAs(filters) - Support accountId filter
// - updateCTA(id, data)
// - closeCTA(id, outcome)
// - snooze/reassign/etc.
```

### 3.3 Create Account-Centric Success Plan Service

**File:** `pmo/apps/api/src/crm/services/account-success-plan.service.ts`

```typescript
// Migrate from customer-success/success-plan.service.ts
// Update to use accountId
// Functions:
// - createSuccessPlan(accountId, data)
// - getSuccessPlans(filters)
// - updateSuccessPlan(id, data)
// - addObjective/removeObjective
// - updateObjectiveProgress
```

### 3.4 Update Account Service

**File:** `pmo/apps/api/src/crm/services/account.service.ts`

Add methods:
```typescript
// - getAccountWithSuccess(id) - Include health history, active CTAs, plans
// - getAccountTimeline(id) - Unified timeline with CS activities
// - getPortfolioHealth(filters) - Portfolio health summary
```

### 3.5 Playbook Service (Keep Separate)

Playbooks are templates, not account-specific. Keep in:
**File:** `pmo/apps/api/src/crm/services/playbook.service.ts`

Migrate from customer-success but keep tenant-scoped (not account-scoped).

---

## Phase 4: API Routes

### 4.1 Add CS Routes Under Account

**File:** `pmo/apps/api/src/crm/routes/account.routes.ts`

Add endpoints:
```
# Health Scores
GET    /api/crm/accounts/:id/health              - Get current health + history
POST   /api/crm/accounts/:id/health/calculate    - Trigger recalculation
GET    /api/crm/accounts/:id/health/trend        - Get trend data

# CTAs
GET    /api/crm/accounts/:id/ctas                - List CTAs for account
POST   /api/crm/accounts/:id/ctas                - Create CTA for account
PUT    /api/crm/accounts/:id/ctas/:ctaId         - Update CTA
DELETE /api/crm/accounts/:id/ctas/:ctaId         - Delete CTA
POST   /api/crm/accounts/:id/ctas/:ctaId/close   - Close CTA
POST   /api/crm/accounts/:id/ctas/:ctaId/snooze  - Snooze CTA

# Success Plans
GET    /api/crm/accounts/:id/success-plans       - List success plans
POST   /api/crm/accounts/:id/success-plans       - Create success plan
PUT    /api/crm/accounts/:id/success-plans/:planId - Update plan
DELETE /api/crm/accounts/:id/success-plans/:planId - Delete plan

# Portfolio-level endpoints (not account-specific)
GET    /api/crm/accounts/portfolio/health        - Portfolio health summary
GET    /api/crm/accounts/portfolio/ctas          - All CTAs across accounts
GET    /api/crm/accounts/portfolio/at-risk       - At-risk accounts
```

### 4.2 Playbook Routes (Tenant-Scoped)

**File:** `pmo/apps/api/src/crm/routes/playbook.routes.ts`

```
GET    /api/crm/playbooks                - List playbooks
POST   /api/crm/playbooks                - Create playbook
GET    /api/crm/playbooks/:id            - Get playbook
PUT    /api/crm/playbooks/:id            - Update playbook
DELETE /api/crm/playbooks/:id            - Delete playbook
POST   /api/crm/playbooks/:id/clone      - Clone playbook
POST   /api/crm/playbooks/seed           - Seed default playbooks
```

### 4.3 Update app.ts

**File:** `pmo/apps/api/src/app.ts`

- Register new playbook routes
- Remove customer-success router (after migration complete)

### 4.4 Backwards Compatibility (Temporary)

Keep `/api/customer-success/*` routes working during transition:
- Redirect or proxy to new `/api/crm/accounts/*` endpoints
- Log deprecation warnings
- Remove after frontend migration complete

---

## Phase 5: Frontend Updates

### 5.1 Update Account Detail Page

**File:** `pmo/apps/web/src/pages/crm/AccountDetailPage.tsx`

Add tabs/sections:
- **Health Score Tab**: Current score, dimension breakdown, trend chart, history
- **CTAs Tab**: Active/snoozed/closed CTAs, create new CTA
- **Success Plans Tab**: Active plans with objectives and progress
- **Timeline**: Unified timeline including CS activities

### 5.2 Create Reusable CS Components

**New Files:**
- `pmo/apps/web/src/components/customer-success/HealthScoreCard.tsx`
- `pmo/apps/web/src/components/customer-success/HealthScoreTrend.tsx`
- `pmo/apps/web/src/components/customer-success/CTAList.tsx`
- `pmo/apps/web/src/components/customer-success/CTAForm.tsx`
- `pmo/apps/web/src/components/customer-success/SuccessPlanCard.tsx`
- `pmo/apps/web/src/components/customer-success/SuccessPlanForm.tsx`

### 5.3 Update API Hooks

**File:** `pmo/apps/web/src/api/hooks/crm/useAccountHealth.ts`

```typescript
// Hooks:
// - useAccountHealth(accountId)
// - useAccountHealthHistory(accountId)
// - useCalculateHealth(accountId)
```

**File:** `pmo/apps/web/src/api/hooks/crm/useAccountCTAs.ts`

```typescript
// Hooks:
// - useAccountCTAs(accountId, filters)
// - useCreateCTA(accountId)
// - useUpdateCTA()
// - useCloseCTA()
```

**File:** `pmo/apps/web/src/api/hooks/crm/useAccountSuccessPlans.ts`

```typescript
// Hooks:
// - useAccountSuccessPlans(accountId)
// - useCreateSuccessPlan(accountId)
// - useUpdateSuccessPlan()
```

**File:** `pmo/apps/web/src/api/hooks/crm/usePlaybooks.ts`

```typescript
// Hooks (tenant-level, not account-specific):
// - usePlaybooks()
// - usePlaybook(id)
// - useCreatePlaybook()
// - useClonePlaybook()
```

### 5.4 Portfolio Dashboard

**File:** `pmo/apps/web/src/pages/crm/PortfolioHealthPage.tsx`

New page combining:
- Portfolio health summary (from CS dashboard)
- CTA cockpit (all CTAs across accounts)
- At-risk accounts list
- Health score trends

Add route: `/crm/portfolio`

### 5.5 Update Sidebar Navigation

**File:** `pmo/apps/web/src/layouts/Sidebar.tsx`

- Remove Customer Success section
- Add "Portfolio Health" under CRM section
- Keep Playbooks accessible (under CRM or Settings)

### 5.6 Update Routing

**File:** `pmo/apps/web/src/App.tsx`

- Add `/crm/portfolio` route
- Add `/crm/playbooks` route
- Redirect old CS routes to new locations:
  - `/customer-success/dashboard` → `/crm/portfolio`
  - `/customer-success/ctas` → `/crm/portfolio?tab=ctas`
  - `/customer-success/analytics` → `/crm/portfolio?tab=analytics`

---

## Phase 6: Validation Schemas

### 6.1 Create CRM Customer Success Schemas

**File:** `pmo/apps/api/src/validation/crm/cta.schema.ts`

```typescript
// Migrate from customer-success validation
// Update to use accountId instead of clientId
```

**File:** `pmo/apps/api/src/validation/crm/success-plan.schema.ts`

**File:** `pmo/apps/api/src/validation/crm/health-score.schema.ts`

**File:** `pmo/apps/api/src/validation/crm/playbook.schema.ts`

---

## Phase 7: Cleanup

### 7.1 Remove Legacy Customer Success Module

After migration is complete and verified:

1. Remove `pmo/apps/api/src/modules/customer-success/` directory
2. Remove old frontend pages `pmo/apps/web/src/pages/customer-success/`
3. Remove old API file `pmo/apps/web/src/api/customer-success.ts`
4. Remove old hooks `pmo/apps/web/src/api/hooks/customer-success/`
5. Update module config to remove `customerSuccess` module flag

### 7.2 Remove Legacy Client Sync

**File:** `pmo/apps/api/src/crm/services/account.service.ts`

Remove code that creates/syncs legacy Client on Account operations.

### 7.3 Database Cleanup

After verifying all data migrated:
- Drop `CustomerHealthScore` table
- Drop `HealthScoreHistory` table
- Drop `CSActivityLog` table
- Drop `ContactEngagement` table (if fully migrated to CRMContact)
- Consider dropping legacy `Client` table (or archive)

---

## Implementation Order

### Step 1: Schema & Migration (Day 1-2)
- [ ] Update Prisma schema (Phase 1.1-1.3)
- [ ] Create migration (Phase 1.4)
- [ ] Write data migration scripts (Phase 2)
- [ ] Run migrations on dev database

### Step 2: Backend Services (Day 3-4)
- [ ] Create account-health.service.ts (Phase 3.1)
- [ ] Create account-cta.service.ts (Phase 3.2)
- [ ] Create account-success-plan.service.ts (Phase 3.3)
- [ ] Update account.service.ts (Phase 3.4)
- [ ] Migrate playbook.service.ts (Phase 3.5)

### Step 3: API Routes (Day 5)
- [ ] Add CS routes to account.routes.ts (Phase 4.1)
- [ ] Create playbook.routes.ts (Phase 4.2)
- [ ] Update app.ts (Phase 4.3)
- [ ] Add backwards compatibility layer (Phase 4.4)

### Step 4: Validation & Testing (Day 6)
- [ ] Create validation schemas (Phase 6)
- [ ] Write unit tests for new services
- [ ] Write API integration tests
- [ ] Run existing tests to verify no regressions

### Step 5: Frontend - Components (Day 7-8)
- [ ] Create reusable CS components (Phase 5.2)
- [ ] Create API hooks (Phase 5.3)

### Step 6: Frontend - Pages (Day 9-10)
- [ ] Update AccountDetailPage (Phase 5.1)
- [ ] Create PortfolioHealthPage (Phase 5.4)
- [ ] Update Sidebar (Phase 5.5)
- [ ] Update routing (Phase 5.6)

### Step 7: Testing & Verification (Day 11)
- [ ] Manual testing of all CS features via Account
- [ ] Verify data migration accuracy
- [ ] E2E tests for critical flows

### Step 8: Cleanup (Day 12)
- [ ] Remove legacy module (Phase 7.1)
- [ ] Remove legacy Client sync (Phase 7.2)
- [ ] Document changes

---

## Documentation Updates Required

Per CLAUDE.md requirements:

| Change Type | Documentation to Update |
|-------------|------------------------|
| New API routes (account CS endpoints) | CLAUDE.md (API endpoints table) |
| New services | CLAUDE.md (Core Services section) |
| Schema changes | CLAUDE.md (Database Models section) |
| New pages | CLAUDE.md (routing section), CODEBASE-INVENTORY.md |
| Removed module | CLAUDE.md (remove CS references), MODULES.md |

---

## Rollback Plan

If issues occur:

1. **Database**: Keep old tables until verification complete
2. **API**: Backwards compatibility routes allow rollback
3. **Frontend**: Old pages remain until cleanup phase
4. **Feature Flag**: Can temporarily re-enable `customerSuccess` module

---

## Success Criteria

- [ ] All CTAs accessible from Account detail page
- [ ] All Success Plans accessible from Account detail page
- [ ] Health score history visible on Account
- [ ] Portfolio dashboard shows aggregated health metrics
- [ ] Unified activity timeline includes CS activities
- [ ] No data loss from migration
- [ ] All existing CS functionality preserved
- [ ] Tests passing
- [ ] Documentation updated
