# CRM Migration: Client to Account - Continuation Prompt

## Context

This is a multi-tenant CRM/PMO SaaS application being migrated from a legacy "Client" model to a CRM "Account" model. The application is in development (not production), so legacy code can be removed without backward compatibility concerns.

### Project Structure
- **Frontend**: `pmo/apps/web/` - React + TypeScript + Vite
- **Backend**: `pmo/apps/api/` - Express + TypeScript + Prisma
- **Schema**: `pmo/prisma/schema.prisma`
- **Shared Modules**: `pmo/packages/modules/`

### What's Been Completed

1. **Schema Updates**: Added `accountId` field to `ChatbotConfig` and `DocumentAnalyzerConfig` models (alongside existing `clientId`)

2. **AI Tool Services**: Updated `chatbot.service.ts` and `document-analyzer.service.ts` to support both `clientId` (deprecated) and `accountId`

3. **Migration Script**: Created `pmo/apps/api/src/scripts/migrate-ai-tools-to-accounts.ts` to populate accountId based on Client-Account mapping

4. **Frontend Pages Removed**:
   - `ClientDetailsPage.tsx`, `ClientIntakePage.tsx` and their tests
   - `ClientForm.tsx`, `ContactForm.tsx` components
   - Routes now redirect `/clients/*` and `/client-intake` to `/crm/accounts`

5. **Backend Contacts API Removed**:
   - `routes/contacts.ts`, `services/contact.service.ts`, `validation/contact.schema.ts`
   - Removed from `app.ts` registration

6. **Module Config Updated**: Clients module marked as legacy with `showInNavigation: false`

---

## Remaining Work

### Phase 1: Database Migration

Run Prisma migration to apply the schema changes:
```bash
cd pmo
npx prisma migrate dev --name add-accountId-to-ai-configs
```

Then run the data migration script:
```bash
npx ts-node apps/api/src/scripts/migrate-clients-to-accounts.ts
npx ts-node apps/api/src/scripts/migrate-ai-tools-to-accounts.ts
```

---

### Phase 2: Frontend Migration (27 files)

#### 2.1 AI Tools Pages (13 files)

These pages use `useClients()` hook to show a client dropdown for selecting which client's AI tool config to manage. They need to be updated to use `useAccounts()` instead.

**Files to update:**
- `pmo/apps/web/src/pages/ai-tools/ChatbotPage.tsx`
- `pmo/apps/web/src/pages/ai-tools/DocumentAnalyzerPage.tsx`
- `pmo/apps/web/src/pages/ai-tools/ComplianceMonitorPage.tsx`
- `pmo/apps/web/src/pages/ai-tools/ContentGeneratorPage.tsx`
- `pmo/apps/web/src/pages/ai-tools/IntakePage.tsx`
- `pmo/apps/web/src/pages/ai-tools/InventoryForecastingPage.tsx`
- `pmo/apps/web/src/pages/ai-tools/LeadScoringPage.tsx`
- `pmo/apps/web/src/pages/ai-tools/PredictiveMaintenancePage.tsx`
- `pmo/apps/web/src/pages/ai-tools/PriorAuthPage.tsx`
- `pmo/apps/web/src/pages/ai-tools/ProductDescriptionsPage.tsx`
- `pmo/apps/web/src/pages/ai-tools/RevenueManagementPage.tsx`
- `pmo/apps/web/src/pages/ai-tools/SafetyMonitorPage.tsx`
- `pmo/apps/web/src/pages/ai-tools/SchedulingPage.tsx`

**Pattern to follow:**

```typescript
// BEFORE
import { useClients } from '../../api/queries';
// ...
const { data: clients } = useClients();
// ...
<select onChange={(e) => setSelectedClientId(Number(e.target.value))}>
  {clients?.map((client) => (
    <option key={client.id} value={client.id}>{client.name}</option>
  ))}
</select>

// AFTER
import { useAccounts } from '../../api/hooks/crm';
// ...
const { data: accountsResponse } = useAccounts();
const accounts = accountsResponse?.data ?? [];
// ...
<select onChange={(e) => setSelectedAccountId(Number(e.target.value))}>
  {accounts.map((account) => (
    <option key={account.id} value={account.id}>{account.name}</option>
  ))}
</select>
```

**Note**: The `useAccounts()` hook returns `{ data: { data: Account[], pagination: {...} } }` - the accounts are nested under `.data.data`.

#### 2.2 Project Pages (4 files)

These pages link projects to clients. They need to link to accounts instead.

**Files to update:**
- `pmo/apps/web/src/pages/ProjectsPage.tsx`
- `pmo/apps/web/src/pages/ProjectSetupPage.tsx`
- `pmo/apps/web/src/pages/ProjectDashboardPage.tsx`
- `pmo/apps/web/src/features/projects/ProjectOverviewTab.tsx`

**Changes needed:**
- Replace `useClients()` with `useAccounts()`
- Replace `clientId` state/params with `accountId`
- Update UI labels from "Client" to "Account"

#### 2.3 ClientProjectContext

**File**: `pmo/apps/web/src/pages/ClientProjectContext.tsx`

This context manages selected client/project state. Options:
1. Rename to `AccountProjectContext` and update to use Account type
2. Keep as-is if only used for project selection (the `selectedClient` part may be unused now)

Check usage in:
- `ProjectSetupPage.tsx`
- `ProjectDashboardPage.tsx`

#### 2.4 Other Pages

- `pmo/apps/web/src/pages/AssetsPage.tsx` - Uses clients for asset association
- `pmo/apps/web/src/pages/MarketingContentPage.tsx` - Uses clients for content association

#### 2.5 API Hooks to Clean Up

**Files to review/update:**
- `pmo/apps/web/src/api/hooks/clients/index.ts` - May be deletable if unused
- `pmo/apps/web/src/api/hooks/index.ts` - Remove client hook exports
- `pmo/apps/web/src/api/hooks/moduleRegistry.ts` - Update module registry
- `pmo/apps/web/src/api/queries.ts` - Remove/deprecate client queries
- `pmo/apps/web/src/api/clients.ts` - May be deletable after migration

---

### Phase 3: Backend Migration (69 files, ~1331 clientId references)

#### 3.1 MCP Module (Critical - Provides AI Assistant Tooling)

**Files:**
- `pmo/apps/api/src/modules/mcp/tools/clients.tools.ts` - Rename to `accounts.tools.ts`
- `pmo/apps/api/src/modules/mcp/mcp.router.ts` - Update imports
- `pmo/apps/api/src/modules/mcp/mcp-server.service.ts` - Update tool references
- `pmo/apps/api/src/modules/mcp/ai-query.service.ts` - Update system prompt CLIENT TOOLS → ACCOUNT TOOLS
- `pmo/apps/api/src/modules/mcp/types.ts` - Update types

**The MCP system prompt needs updating** (in `ai-query.service.ts`):
```typescript
// BEFORE
CLIENT TOOLS:
- query_clients: Search and filter clients by name, industry...
- get_client: Get detailed information about a specific client
- create_client: Create a new client
- update_client: Update client information

// AFTER
ACCOUNT TOOLS:
- query_accounts: Search and filter accounts by name, industry, type...
- get_account: Get detailed information about a specific account
- create_account: Create a new account
- update_account: Update account information
```

#### 3.2 AI Tool Modules (Already have accountId support, need cleanup)

These already support `accountId` but still have `clientId` fallback. After frontend migration, remove `clientId` support:

- `pmo/apps/api/src/modules/chatbot/chatbot.service.ts`
- `pmo/apps/api/src/modules/chatbot/chatbot.router.ts`
- `pmo/apps/api/src/modules/document-analyzer/document-analyzer.service.ts`
- `pmo/apps/api/src/modules/document-analyzer/document-analyzer.router.ts`

Other AI tool modules need similar migration:
- `pmo/apps/api/src/modules/product-descriptions/`
- `pmo/apps/api/src/modules/scheduling/`
- `pmo/apps/api/src/modules/intake/`
- `pmo/apps/api/src/modules/content-generator/`
- `pmo/apps/api/src/modules/lead-scoring/`
- `pmo/apps/api/src/modules/prior-auth/`
- `pmo/apps/api/src/modules/inventory-forecasting/`
- `pmo/apps/api/src/modules/compliance-monitor/`
- `pmo/apps/api/src/modules/predictive-maintenance/`
- `pmo/apps/api/src/modules/revenue-management/`
- `pmo/apps/api/src/modules/safety-monitor/`

#### 3.3 Customer Success Module (6 services)

- `pmo/apps/api/src/modules/customer-success/customer-success.router.ts`
- `pmo/apps/api/src/modules/customer-success/engagement.service.ts`
- `pmo/apps/api/src/modules/customer-success/analytics.service.ts`
- `pmo/apps/api/src/modules/customer-success/cta.service.ts`
- `pmo/apps/api/src/modules/customer-success/success-plan.service.ts`
- `pmo/apps/api/src/modules/customer-success/health-score.service.ts`

#### 3.4 Core Services

- `pmo/apps/api/src/services/project.service.ts` - Projects link to clientId
- `pmo/apps/api/src/services/asset.service.ts` - Assets link to clientId
- `pmo/apps/api/src/services/document.service.ts` - Documents link to clientId
- `pmo/apps/api/src/routes/projects.ts`
- `pmo/apps/api/src/routes/assets.ts`
- `pmo/apps/api/src/routes/documents.ts`

#### 3.5 Marketing/Publishing Modules

- `pmo/apps/api/src/modules/marketing/marketing.service.ts`
- `pmo/apps/api/src/modules/campaigns/campaign.service.ts`
- `pmo/apps/api/src/modules/campaigns/campaign.router.ts`
- `pmo/apps/api/src/modules/brand-profiles/brand-profile.service.ts`
- `pmo/apps/api/src/modules/brand-profiles/brand-profile.router.ts`
- `pmo/apps/api/src/modules/publishing/publishing.service.ts`
- `pmo/apps/api/src/modules/publishing/publishing.router.ts`

#### 3.6 Validation Schemas

- `pmo/apps/api/src/validation/project.schema.ts`
- `pmo/apps/api/src/validation/asset.schema.ts`
- `pmo/apps/api/src/validation/document.schema.ts`
- `pmo/apps/api/src/validation/marketing.schema.ts`

#### 3.7 Integration Services

- `pmo/apps/api/src/integrations/oauth/oauth.service.ts`
- `pmo/apps/api/src/integrations/oauth/provider-configs.ts`
- `pmo/apps/api/src/integrations/integration.types.ts`

---

### Phase 4: Schema Cleanup

After all code is migrated:

1. **Update Prisma Schema** (`pmo/prisma/schema.prisma`):
   - Remove `clientId` from ChatbotConfig, DocumentAnalyzerConfig
   - Update Project model to use `accountId` instead of `clientId`
   - Update Asset, Document, MarketingContent models
   - Eventually remove the `Client` and `Contact` models entirely

2. **Create migration**:
   ```bash
   npx prisma migrate dev --name remove-legacy-clientId-fields
   ```

---

### Phase 5: Final Cleanup

1. **Remove Legacy Files**:
   - `pmo/apps/api/src/routes/clients.ts`
   - `pmo/apps/api/src/services/client.service.ts`
   - `pmo/apps/api/src/validation/client.schema.ts`
   - `pmo/apps/web/src/api/clients.ts`
   - `pmo/apps/web/src/api/hooks/clients/`

2. **Update app.ts**:
   - Remove `clientsRouter` import and registration

3. **Update Module Config**:
   - Remove `clients` module from `pmo/packages/modules/index.ts`

4. **Update Tests**:
   - `pmo/apps/web/src/test/NavigationSmokeTest.test.tsx`
   - `pmo/apps/web/src/test/ProjectSetupFlow.test.tsx`
   - Any API tests referencing clients

---

## Key Patterns

### Account API Response Structure

```typescript
// useAccounts() returns:
{
  data: {
    data: Account[],
    pagination: { page, limit, total, totalPages }
  }
}

// useAccount(id) returns:
{
  data: Account
}
```

### Account Type Definition

```typescript
interface Account {
  id: number;
  tenantId: string;
  name: string;
  type: 'PROSPECT' | 'CUSTOMER' | 'PARTNER' | 'COMPETITOR' | 'CHURNED' | 'OTHER';
  industry: string | null;
  website: string | null;
  phone: string | null;
  employeeCount: string | null;
  annualRevenue: number | null;
  description: string | null;
  healthScore: number;
  engagementScore: number;
  ownerId: number;
  parentAccountId: number | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Existing CRM Hooks

Located in `pmo/apps/web/src/api/hooks/crm/index.ts`:
- `useAccounts(filters?)` - List accounts with pagination
- `useAccount(id)` - Get single account
- `useCreateAccount()` - Create mutation
- `useUpdateAccount()` - Update mutation
- `useArchiveAccount()` - Archive mutation
- `useRestoreAccount()` - Restore mutation

---

## Testing Checklist

After each phase, verify:

1. **Lint passes**: `npm run lint`
2. **TypeScript compiles**: `npm run build` (or check for TS errors)
3. **Tests pass**: `npm run test`
4. **Application runs**: Start dev servers and test manually:
   - Dashboard loads with account data
   - CRM Accounts page works
   - AI Tools pages load and can select accounts
   - Projects can be associated with accounts

---

## Commit Strategy

Make atomic commits for each logical change:
1. `refactor(web): migrate AI tools pages from clients to accounts`
2. `refactor(web): migrate project pages from clients to accounts`
3. `refactor(api): migrate MCP module from clients to accounts`
4. `refactor(api): migrate AI tool modules from clientId to accountId`
5. `refactor(api): migrate core services from clientId to accountId`
6. `chore(schema): remove legacy clientId fields`
7. `chore: remove legacy client files and routes`

---

## Important Notes

1. **This is a development environment** - No need for backward compatibility or deprecation periods

2. **The Account model already exists** with full CRM functionality - This is not about creating new features, just migrating references

3. **Migration scripts exist** to populate accountId based on Client-Account mapping (via `customFields.legacyClientId`)

4. **CRM routes are already working** at `/api/crm/accounts`, `/api/crm/opportunities`, `/api/crm/activities`

5. **Run linting frequently** to catch issues early: `npm run lint`
