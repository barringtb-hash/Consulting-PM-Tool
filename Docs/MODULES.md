# Module & Feature Flag System

The AI CRM Platform supports a comprehensive modular architecture that allows you to enable/disable features on a per-customer or per-deployment basis. The platform has evolved from a PMO tool to include full CRM capabilities.

> **Note**: For detailed CRM architecture, see [CRM-TRANSFORMATION-PLAN.md](CRM-TRANSFORMATION-PLAN.md).

## Table of Contents

- [Overview](#overview)
- [Available Modules](#available-modules)
- [Configuration Methods](#configuration-methods)
- [API Reference](#api-reference)
- [Admin UI](#admin-ui)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Frontend Integration](#frontend-integration)
- [Multi-Tenant Setup](#multi-tenant-setup)

---

## Overview

The module system provides three layers of configuration:

| Layer | Source | Scope | Use Case |
|-------|--------|-------|----------|
| **Database** | `TenantModuleConfig` table | Per-tenant | Multi-customer SaaS deployments |
| **Environment** | `ENABLED_MODULES` env var | Per-deployment | Single-tenant deployments |
| **Default** | Code defaults | System-wide | Development / all features |

**Priority**: Database > Environment > Default

---

## Available Modules

### Core Modules (Always Enabled)

These modules cannot be disabled as they form the foundation of the platform:

| Module ID | Label | Description | Routes |
|-----------|-------|-------------|--------|
| `dashboard` | Dashboard | Main dashboard with metrics | `/dashboard` |
| `tasks` | Tasks | Personal task management | `/tasks` |
| `projects` | Projects | Project management with AI-powered insights, ML predictions, scheduling, and document generation | `/projects/:id` |

> **Note**: The `projects` module now includes all AI/ML features (previously in `aiProjects` and `projectML` modules). AI features are accessible via tabs in the Project Dashboard:
> - **AI Assistant**: Chat-based interface for project management assistance
> - **AI Scheduling**: AI-powered auto-scheduling for project tasks
> - **AI Documents**: AI-powered document generation (charters, SOWs, status reports, etc.)

### Legacy PMO Module (Deprecated)

> **Note**: The `clients` module is deprecated and replaced by the CRM `accounts` module. New implementations should use the CRM Accounts module.

| Module ID | Label | Description | Routes |
|-----------|-------|-------------|--------|
| `clients` | Clients | Legacy client management (PMO) | `/clients`, `/clients/:id` |

### CRM Modules

The CRM module provides full customer relationship management capabilities:

| Module ID | Label | Description | Routes |
|-----------|-------|-------------|--------|
| `crm` | CRM | Core CRM functionality | `/crm/*` |
| `accounts` | Accounts | Company/organization management with hierarchy | `/crm/accounts`, `/crm/accounts/:id` |
| `opportunities` | Opportunities | Sales pipeline and deal management | `/crm/opportunities`, `/crm/opportunities/:id` |
| `activities` | Activities | Unified activity timeline (calls, emails, meetings) | `/crm/activities` |
| `pipeline` | Pipeline | Sales pipeline visualization (Kanban) | `/sales/pipeline` |

**CRM API Endpoints:**
- `GET/POST /api/crm/accounts` - Account management
- `GET/POST /api/crm/opportunities` - Opportunity management
- `GET/POST /api/crm/activities` - Activity management
- `GET /api/crm/opportunities/pipeline-stats` - Pipeline analytics

### Toggleable Modules

These modules can be enabled/disabled per customer:

| Module ID | Label | Dependencies | Description | Routes |
|-----------|-------|--------------|-------------|--------|
| `assets` | Assets | None | AI-generated assets library | `/assets` |
| `marketing` | Marketing | accounts, projects | Marketing content, campaigns, publishing | `/marketing` |
| `leads` | Leads | None | Lead capture and management | `/sales/leads` |
| `pipeline` | Pipeline | opportunities | Sales pipeline visualization | `/sales/pipeline` |
| `admin` | Admin | None | User & module administration | `/admin/users`, `/admin/modules` |
| `customerSuccess` | Customer Success | accounts | Customer health scoring, success plans, playbooks | `/customer-success/*` |
| `brandProfiles` | Brand Profiles | accounts | Brand identity, voice, and asset management | `/marketing/brands` |
| `social-publishing` | Social Publishing | marketing | Multi-platform social media publishing via Ayrshare API | `/social-publishing` |
| `content-ml` | Content ML | marketing | AI-powered content generation with brand voice, SEO, repurposing | `/content-ml/*` |

### Operations & Monitoring Modules

These modules provide operational visibility and debugging capabilities:

| Module ID | Label | Dependencies | Description | Routes |
|-----------|-------|--------------|-------------|--------|
| `aiMonitoring` | AI Monitoring | None | AI usage tracking, cost monitoring, predictive analytics | `/operations/ai-usage`, `/operations/dashboard` |
| `bugTracking` | Bug Tracking | None | Issue tracking, error collection, external integrations | `/bug-tracking/issues`, `/bug-tracking/issues/:id` |
| `finance-tracking` | Finance Tracking | admin | Expense tracking, budgets, recurring costs, profitability reporting | `/admin/finance` |
| `mcp` | MCP Integration | None | Model Context Protocol for AI queries against CRM data | `/api/mcp/*` |

### AI Tools Modules

The platform includes comprehensive AI-powered tools organized into implementation phases:

#### Phase 1 AI Tools (Customer Automation)

| Module ID | Label | Dependencies | Description | Routes |
|-----------|-------|--------------|-------------|--------|
| `chatbot` | AI Chatbot | accounts | Customer service chatbot with multi-channel support, intent detection, webhooks | `/ai-tools/chatbot` |
| `productDescriptions` | Product Descriptions | accounts | AI-generated product descriptions with bulk generation | `/ai-tools/product-descriptions` |
| `scheduling` | Scheduling Assistant | accounts | Appointment booking with no-show prediction | `/ai-tools/scheduling` |
| `intake` | Intelligent Intake | accounts | Form processing with compliance checking | `/ai-tools/intake` |

#### Phase 2 AI Tools (Business Intelligence)

| Module ID | Label | Dependencies | Description | Routes |
|-----------|-------|--------------|-------------|--------|
| `documentAnalyzer` | Document Analyzer | accounts | OCR, field extraction, compliance checking, version comparison | `/ai-tools/document-analyzer` |
| `contentGenerator` | Content Generator | accounts | AI-powered marketing content creation | `/ai-tools/content-generator` |
| `leadScoring` | Lead Scoring | leads | ML-based lead prioritization with nurture sequences | `/ai-tools/lead-scoring` |
| `priorAuth` | Prior Authorization | accounts | Healthcare prior authorization workflow automation | `/ai-tools/prior-auth` |

#### Phase 3 AI Tools (Industry-Specific)

| Module ID | Label | Dependencies | Description | Routes |
|-----------|-------|--------------|-------------|--------|
| `inventoryForecasting` | Inventory Forecasting | accounts | Demand forecasting with scenario planning | `/ai-tools/inventory-forecasting` |
| `complianceMonitor` | Compliance Monitor | accounts | Real-time compliance monitoring (HIPAA, SOX, GDPR, PCI) | `/ai-tools/compliance-monitor` |
| `predictiveMaintenance` | Predictive Maintenance | accounts | Equipment failure prediction with sensor data | `/ai-tools/predictive-maintenance` |
| `revenueManagement` | Revenue Management | accounts | Dynamic pricing and revenue optimization | `/ai-tools/revenue-management` |
| `safetyMonitor` | Safety Monitor | accounts | Safety incident tracking and OSHA compliance | `/ai-tools/safety-monitor` |

#### PMO AI Tools (Deprecated)

> **⚠️ Deprecated**: The `aiProjects` and `projectML` modules have been consolidated into the core `projects` module. AI features are now always available and accessible via tabs in the Project Dashboard. The module IDs are maintained for backwards compatibility but new implementations should not use them.

| Module ID | Label | Dependencies | Description | Status |
|-----------|-------|--------------|-------------|--------|
| `aiProjects` | AI Project Assistant | projects | AI-powered project management features | **Deprecated** - Use Project Dashboard AI tabs |
| `projectML` | Project ML | projects | ML-powered project predictions and analytics | **Deprecated** - Use Project Dashboard ML Insights tab |

**Migration Guide:**
- Old route `/ai-tools/project-assistant` → Navigate to `/projects/:id` and use AI tabs
- AI features no longer require module toggles - they're always available in Project Dashboard
- API endpoints under `/api/ai-projects/*` continue to work (no module guard required)

> **AI Tools Documentation**: For detailed information on configuring the AI Chatbot and Document Analyzer, see [AI-Tools.md](AI-Tools.md).

### Module Dependencies

When you enable a module, its dependencies are automatically enabled:

```
marketing            → requires → accounts, projects
pipeline             → requires → opportunities
tasks                → requires → projects (core)
projects             → requires → accounts (CRM)
customerSuccess      → requires → accounts (CRM)

# Phase 1 AI Tools
chatbot              → requires → accounts
productDescriptions  → requires → accounts
scheduling           → requires → accounts
intake               → requires → accounts

# Phase 2 AI Tools
documentAnalyzer     → requires → accounts
contentGenerator     → requires → accounts
leadScoring          → requires → leads
priorAuth            → requires → accounts

# Phase 3 AI Tools
inventoryForecasting → requires → accounts
complianceMonitor    → requires → accounts
predictiveMaintenance→ requires → accounts
revenueManagement    → requires → accounts
safetyMonitor        → requires → accounts

# PMO AI Tools (Deprecated - now part of core projects)
# aiProjects         → DEPRECATED (merged into projects)
# projectML          → DEPRECATED (merged into projects)

# Operations & Support
aiMonitoring         → requires → (none, standalone)
bugTracking          → requires → (none, standalone)
brandProfiles        → requires → accounts

# Social & Content
social-publishing    → requires → marketing
content-ml           → requires → marketing
```

---

## Configuration Methods

### Method 1: Environment Variables (Deployment-Wide)

Best for single-tenant deployments or setting defaults.

**Backend** (`pmo/apps/api/.env`):
```env
# Comma-separated list of module IDs
ENABLED_MODULES=dashboard,tasks,crm,accounts,opportunities,activities,pipeline
```

**Frontend** (`pmo/apps/web/.env`):
```env
# Must match backend configuration
VITE_ENABLED_MODULES=dashboard,tasks,crm,accounts,opportunities,activities,pipeline
```

#### Example Configurations

| Customer Type | Configuration |
|---------------|---------------|
| CRM Only | `dashboard,tasks,crm,accounts,opportunities,activities,pipeline` |
| CRM + Sales | `dashboard,tasks,crm,accounts,opportunities,activities,pipeline,leads,leadScoring` |
| PMO Only (Legacy) | `dashboard,tasks,clients,projects` |
| Sales-focused | `dashboard,tasks,crm,accounts,opportunities,leads,pipeline` |
| Marketing Agency | `dashboard,tasks,crm,accounts,projects,marketing,assets,contentGenerator` |
| Customer Service | `dashboard,tasks,crm,accounts,chatbot,customerSuccess` |
| Document Processing | `dashboard,tasks,crm,accounts,projects,documentAnalyzer` |
| E-commerce | `dashboard,tasks,crm,accounts,chatbot,productDescriptions,inventoryForecasting` |
| Healthcare | `dashboard,tasks,crm,accounts,projects,intake,priorAuth,complianceMonitor,documentAnalyzer` |
| Manufacturing | `dashboard,tasks,crm,accounts,projects,predictiveMaintenance,safetyMonitor,inventoryForecasting` |
| Hospitality | `dashboard,tasks,crm,accounts,projects,scheduling,revenueManagement,chatbot` |
| AI-Enabled CRM | `dashboard,tasks,crm,accounts,opportunities,activities,pipeline,chatbot,documentAnalyzer,leadScoring,customerSuccess` |
| Full Platform | `dashboard,tasks,crm,accounts,opportunities,activities,projects,assets,marketing,leads,pipeline,admin,chatbot,documentAnalyzer,customerSuccess,productDescriptions,scheduling,intake,contentGenerator,leadScoring,priorAuth,inventoryForecasting,complianceMonitor,predictiveMaintenance,revenueManagement,safetyMonitor,aiMonitoring,bugTracking,brandProfiles` |
| Operations Team | `dashboard,tasks,crm,accounts,admin,aiMonitoring,bugTracking` |

### Method 2: Admin UI (Per-Tenant)

Navigate to `/admin/modules` to manage module configuration through the web interface:

1. Select or create a tenant
2. Toggle modules on/off
3. Changes take effect immediately

### Method 3: API (Programmatic)

Use the REST API for automated configuration:

```bash
# Bulk set modules for a tenant
curl -X POST /api/admin/modules/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "customer-acme",
    "enabledModules": ["dashboard", "tasks", "crm", "accounts", "opportunities", "activities"]
  }'
```

---

## API Reference

### Public Endpoints

#### Get Module Configuration

```
GET /api/modules?tenantId={tenantId}
```

**Query Parameters:**
- `tenantId` (optional): Tenant identifier. Defaults to `"default"`.

**Response:**
```json
{
  "tenantId": "customer-acme",
  "source": "database",
  "enabledModules": ["dashboard", "tasks", "crm", "accounts", "opportunities", "activities"],
  "modules": [
    {
      "id": "dashboard",
      "label": "Dashboard",
      "description": "Main dashboard...",
      "isCore": true,
      "enabled": true,
      "dependencies": []
    }
  ],
  "navigationItems": [...]
}
```

#### Check Single Module

```
GET /api/modules/check/{moduleId}?tenantId={tenantId}
```

**Response:**
```json
{
  "moduleId": "marketing",
  "tenantId": "customer-acme",
  "source": "database",
  "enabled": false,
  "isCore": false
}
```

### Admin Endpoints (Require ADMIN Role)

#### List All Tenants

```
GET /api/admin/modules/tenants
```

**Response:**
```json
{
  "tenants": ["default", "customer-acme", "customer-beta"]
}
```

#### Get Tenant Configuration

```
GET /api/admin/modules/{tenantId}
```

**Response:**
```json
{
  "tenantId": "customer-acme",
  "modules": [
    { "moduleId": "dashboard", "enabled": true, "isCore": true },
    { "moduleId": "marketing", "enabled": false, "isCore": false }
  ],
  "source": "database"
}
```

#### Bulk Set Modules

```
POST /api/admin/modules/bulk
```

**Body:**
```json
{
  "tenantId": "customer-acme",
  "enabledModules": ["dashboard", "tasks", "crm", "accounts", "opportunities", "activities"]
}
```

**Notes:**
- Core modules are always included automatically
- Module dependencies are auto-enabled

#### Update Single Module

```
PATCH /api/admin/modules/{tenantId}/{moduleId}
```

**Body:**
```json
{
  "enabled": true,
  "settings": { "customOption": "value" }
}
```

#### Delete Module Config (Revert to Default)

```
DELETE /api/admin/modules/{tenantId}/{moduleId}
```

### Feature Flags API

For granular feature control beyond modules:

#### Check Feature Flag

```
GET /api/feature-flags/check/{key}
```

**Response:**
```json
{
  "key": "new-dashboard-widgets",
  "enabled": true,
  "config": { "widgets": ["chart", "stats"] }
}
```

#### Admin: Manage Feature Flags

```
GET    /api/admin/feature-flags          # List all
POST   /api/admin/feature-flags          # Create
PATCH  /api/admin/feature-flags/{key}    # Update
DELETE /api/admin/feature-flags/{key}    # Delete
```

---

## Admin UI

The module management interface is available at `/admin/modules`:

### Features

- **Tenant Selector**: Switch between tenant configurations
- **Create Tenant**: Add new tenant configurations
- **Module Toggles**: Enable/disable modules visually
- **Core Module Indicators**: Shows which modules cannot be disabled
- **Dependency Warnings**: Shows module dependencies
- **Configuration Source**: Shows if config is from database, env, or default

### Access Requirements

- User must have `ADMIN` role
- `admin` module must be enabled

---

## Architecture

### File Structure

```
pmo/
├── packages/
│   └── modules/
│       └── index.ts                    # Shared module definitions
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── module-config.ts    # Static env-based checks
│   │       │   └── feature-flags/
│   │       │       ├── feature-flags.service.ts   # Database operations
│   │       │       └── feature-flags.router.ts    # API endpoints
│   │       └── middleware/
│   │           └── module-guard.middleware.ts     # Runtime protection
│   │
│   └── web/
│       └── src/
│           ├── modules/
│           │   └── ModuleContext.tsx   # React context
│           ├── api/
│           │   └── modules.ts          # API client
│           └── pages/
│               └── AdminModulesPage.tsx # Admin UI
│
└── prisma/
    └── schema.prisma                   # Database models
```

### Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ ModuleContext │←──│ /api/modules │←──│ X-Tenant-ID  │      │
│  │  (React)     │    │   (fetch)    │    │   header     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Backend                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Express Router                         │  │
│  │  GET /api/modules → getTenantModuleConfig(tenantId)      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Module Guard Middleware                     │  │
│  │  requireModule(moduleId) → isModuleEnabledForTenant()    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                Feature Flags Service                      │  │
│  │  1. Check TenantModuleConfig table                       │  │
│  │  2. Fallback to ENABLED_MODULES env var                  │  │
│  │  3. Fallback to default (all enabled)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### TenantModuleConfig

Stores per-tenant module configuration:

```prisma
model TenantModuleConfig {
  id              Int      @id @default(autoincrement())
  tenantId        String   @default("default")
  moduleId        String
  enabled         Boolean  @default(true)
  settings        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  updatedBy       Int?

  @@unique([tenantId, moduleId])
  @@index([tenantId])
  @@index([moduleId, enabled])
}
```

### FeatureFlag

For granular feature toggles:

```prisma
model FeatureFlag {
  id                Int      @id @default(autoincrement())
  key               String   @unique
  name              String
  description       String?
  enabled           Boolean  @default(false)
  rolloutPercentage Int      @default(100)
  config            Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([key, enabled])
}
```

### User Preferences

Dashboard panel preferences stored in User model:

```prisma
model User {
  // ... other fields
  preferences  Json?  // { dashboardPanels: [...], theme: "light" }
}
```

---

## Frontend Integration

### Using Module Context

```tsx
import { useModules, useModuleEnabled } from '../modules';

function MyComponent() {
  const { isModuleEnabled, navigationItems } = useModules();
  const marketingEnabled = useModuleEnabled('marketing');

  return (
    <div>
      {isModuleEnabled('assets') && <AssetsPanel />}
      {marketingEnabled && <MarketingPanel />}
    </div>
  );
}
```

### Conditional Routing

```tsx
// In App.tsx
{isModuleEnabled('marketing') && (
  <Route path="/marketing" element={<MarketingPage />} />
)}
```

### Fetching Tenant Config

```tsx
import { getModules } from '../api/modules';

// Get config for specific tenant
const config = await getModules('customer-acme');
console.log(config.enabledModules); // ['dashboard', 'tasks', ...]
console.log(config.source);         // 'database' | 'environment' | 'default'
```

---

## Multi-Tenant Setup

### Identifying Tenants

The system uses the `X-Tenant-ID` header to identify tenants:

```typescript
// Frontend: Set header in API calls
fetch('/api/modules', {
  headers: {
    'X-Tenant-ID': 'customer-acme'
  }
});

// Backend: Middleware extracts tenant
function getTenantId(req: Request): string {
  return req.headers['x-tenant-id'] || 'default';
}
```

### Deployment Strategies

#### Single-Tenant (One Customer per Deployment)

Use environment variables only:

```env
ENABLED_MODULES=dashboard,tasks,crm,accounts,opportunities,activities
```

#### Multi-Tenant (Multiple Customers, One Deployment)

1. Set environment variable as default:
   ```env
   ENABLED_MODULES=dashboard,tasks,crm,accounts
   ```

2. Configure per-tenant overrides in database via Admin UI or API

3. Frontend passes `X-Tenant-ID` header based on:
   - Subdomain: `acme.yourapp.com` → `X-Tenant-ID: acme`
   - Path: `/tenant/acme/...` → `X-Tenant-ID: acme`
   - User's organization from JWT token

### Graceful Fallback

If database is unavailable, the system falls back to environment configuration:

```typescript
try {
  const enabled = await isModuleEnabledForTenant(moduleId, tenantId);
  // Database config used
} catch (error) {
  console.error('Database check failed, using static config');
  const enabled = isModuleEnabled(moduleId);
  // Environment config used
}
```

---

## Troubleshooting

### Module Not Showing in Navigation

1. Check `VITE_ENABLED_MODULES` in frontend `.env`
2. Verify database config: `GET /api/modules?tenantId=your-tenant`
3. Check browser console for errors

### API Returns 404 for Module Endpoint

1. Check `ENABLED_MODULES` in backend `.env`
2. Verify route was registered at startup (check server logs)
3. Check tenant config: `GET /api/admin/modules/your-tenant`

### Tenant Config Not Taking Effect

1. Verify `X-Tenant-ID` header is being sent
2. Check database has config: `SELECT * FROM TenantModuleConfig WHERE tenantId = 'xxx'`
3. Restart server if route registration is the issue (routes are registered at startup)

### Database Migration

After adding the feature flag schema, run:

```bash
cd pmo
npx prisma migrate dev --name add_feature_flags
npx prisma generate
```
