# Module & Feature Flag System

The AI Consulting PMO platform supports a comprehensive modular architecture that allows you to enable/disable features on a per-customer or per-deployment basis.

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
| `clients` | Clients | Client management | `/clients`, `/clients/:id` |
| `projects` | Projects | Project management | `/projects/:id` |

### Toggleable Modules

These modules can be enabled/disabled per customer:

| Module ID | Label | Dependencies | Description | Routes |
|-----------|-------|--------------|-------------|--------|
| `assets` | Assets | None | AI-generated assets library | `/assets` |
| `marketing` | Marketing | clients, projects | Marketing content, campaigns, publishing | `/marketing` |
| `leads` | Leads | None | Lead capture and management | `/sales/leads` |
| `pipeline` | Pipeline | leads | Sales pipeline visualization | `/sales/pipeline` |
| `admin` | Admin | None | User & module administration | `/admin/users`, `/admin/modules` |

### Module Dependencies

When you enable a module, its dependencies are automatically enabled:

```
marketing → requires → clients, projects
pipeline  → requires → leads
tasks     → requires → projects (core)
projects  → requires → clients (core)
```

---

## Configuration Methods

### Method 1: Environment Variables (Deployment-Wide)

Best for single-tenant deployments or setting defaults.

**Backend** (`pmo/apps/api/.env`):
```env
# Comma-separated list of module IDs
ENABLED_MODULES=dashboard,tasks,clients,projects,leads,pipeline
```

**Frontend** (`pmo/apps/web/.env`):
```env
# Must match backend configuration
VITE_ENABLED_MODULES=dashboard,tasks,clients,projects,leads,pipeline
```

#### Example Configurations

| Customer Type | Configuration |
|---------------|---------------|
| Basic CRM | `dashboard,tasks,clients,projects` |
| Sales-focused | `dashboard,tasks,clients,projects,leads,pipeline` |
| Marketing Agency | `dashboard,tasks,clients,projects,marketing,assets` |
| Full Platform | `dashboard,tasks,clients,projects,assets,marketing,leads,pipeline,admin` |

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
    "enabledModules": ["dashboard", "tasks", "clients", "projects", "leads"]
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
  "enabledModules": ["dashboard", "tasks", "clients", "projects", "leads"],
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
  "enabledModules": ["dashboard", "tasks", "clients", "projects", "leads"]
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
ENABLED_MODULES=dashboard,tasks,clients,projects,leads
```

#### Multi-Tenant (Multiple Customers, One Deployment)

1. Set environment variable as default:
   ```env
   ENABLED_MODULES=dashboard,tasks,clients,projects
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
