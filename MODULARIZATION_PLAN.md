# Consulting PMO Tool - Modularization Plan

## Overview

This document outlines the plan to modularize the Consulting PMO Tool, enabling customers to use only the features they need. The modularization will allow:

- **Per-customer feature configuration** - Enable/disable modules based on subscription or needs
- **Cleaner codebase** - Better separation of concerns
- **Easier maintenance** - Features isolated in self-contained modules
- **Faster builds** - Only bundle what's needed (future optimization)

---

## Current Feature Modules (from Sidebar)

Based on the sidebar navigation, we have identified **7 distinct feature modules**:

| Module | Sidebar Group | Routes | Description |
|--------|---------------|--------|-------------|
| **core** | - | /dashboard, /login | Always required - auth, dashboard |
| **tasks** | Overview | /tasks | Personal task management |
| **clients** | Clients | /clients, /clients/:id, /client-intake | Client CRM functionality |
| **projects** | Projects | /projects, /projects/:id, /meetings/:id | Project management with milestones, meetings |
| **assets** | Projects | /assets | AI asset library (prompts, workflows) |
| **marketing** | Marketing | /marketing | Content creation, campaigns, publishing |
| **sales** | Sales | /sales/leads, /sales/pipeline | Lead management, sales pipeline |
| **admin** | Admin | /admin/users/* | User administration (role-based) |

---

## Implementation Phases

### Phase 1: Feature Configuration System (Session 1)
**Goal**: Create the foundation for enabling/disabling modules

1. **Create module configuration schema**
   - Define `ModuleConfig` type with all available modules
   - Create default configuration (all modules enabled)
   - Support environment-based and per-customer configs

2. **Create shared configuration package**
   - Add `packages/config/` to monorepo
   - Define module metadata (name, description, dependencies)
   - Create customer config loader

3. **Files to create**:
   ```
   packages/config/
   ├── src/
   │   ├── index.ts
   │   ├── modules.ts          # Module definitions
   │   ├── customer-config.ts  # Customer config loader
   │   └── types.ts            # TypeScript types
   ├── package.json
   └── tsconfig.json
   ```

---

### Phase 2: Backend Module Registry (Session 2)
**Goal**: Conditionally load API routes based on configuration

1. **Create module registry pattern**
   - Each module exports a registration function
   - Registry loads modules based on config
   - Graceful handling of disabled modules (404 with message)

2. **Restructure API routes into modules**
   - Move remaining routes into `/modules/` structure
   - Each module: `[name].router.ts`, `[name].service.ts`

3. **Files to modify**:
   ```
   apps/api/src/
   ├── modules/
   │   ├── index.ts              # Module registry
   │   ├── core/                 # Auth, health (always loaded)
   │   ├── tasks/                # NEW: Move from routes/
   │   ├── clients/              # NEW: Move from routes/
   │   ├── projects/             # NEW: Move from routes/
   │   ├── assets/               # NEW: Move from routes/
   │   ├── marketing/            # EXISTS: Already modular
   │   ├── sales/                # NEW: Combine leads + pipeline
   │   └── admin/                # NEW: Move from routes/
   └── app.ts                    # Use module registry
   ```

4. **Module structure pattern**:
   ```typescript
   // modules/tasks/index.ts
   export const tasksModule = {
     name: 'tasks',
     register: (app: Express) => {
       app.use('/api/tasks', tasksRouter);
     },
     dependencies: ['core'],
   };
   ```

---

### Phase 3: Frontend Module System (Session 3)
**Goal**: Conditionally render routes and sidebar based on configuration

1. **Create frontend module registry**
   - Lazy-load module components
   - Conditional route registration
   - Sidebar filters by enabled modules

2. **Create module context/provider**
   - Fetch enabled modules from API or config
   - Provide to app via React Context

3. **Update Sidebar.tsx**
   - Filter `navItems` by enabled modules
   - Hide entire sections if no items

4. **Update App.tsx**
   - Dynamic route registration
   - Lazy loading with React.lazy()
   - 404 page for disabled modules

5. **Files to create/modify**:
   ```
   apps/web/src/
   ├── modules/
   │   ├── index.ts              # Module registry
   │   ├── core/                 # Dashboard, auth components
   │   ├── tasks/                # Move from features/tasks + pages
   │   ├── clients/              # Move from pages
   │   ├── projects/             # Move from features/projects + pages
   │   ├── assets/               # Move from features/assets + pages
   │   ├── marketing/            # Move from features/marketing + pages
   │   ├── sales/                # NEW: Combine LeadsPage + PipelinePage
   │   └── admin/                # Move from pages/Admin*
   ├── context/
   │   └── ModuleContext.tsx     # NEW: Enabled modules context
   ├── layouts/
   │   └── Sidebar.tsx           # MODIFY: Filter by modules
   └── App.tsx                   # MODIFY: Dynamic routes
   ```

---

### Phase 4: Customer Configuration (Session 4)
**Goal**: Per-customer configuration management

1. **Create customer config storage**
   - Database table for customer configs
   - API endpoint to fetch config
   - Admin UI to manage configs

2. **Create configuration presets**
   - "Full Suite" - All modules
   - "Project Management" - core, tasks, clients, projects
   - "Marketing Focus" - core, clients, marketing
   - "Sales Focus" - core, clients, sales, projects
   - "Custom" - Pick and choose

3. **Environment variable overrides**
   - `ENABLED_MODULES=core,tasks,projects,clients`
   - Useful for deployments without DB config

4. **Files to create**:
   ```
   apps/api/src/modules/config/
   ├── config.router.ts
   ├── config.service.ts
   └── presets.ts

   prisma/
   └── schema.prisma              # Add CustomerConfig model
   ```

---

### Phase 5: Module Isolation & Cleanup (Session 5)
**Goal**: Ensure modules are fully self-contained

1. **Audit cross-module dependencies**
   - Identify shared components
   - Move shared code to `packages/shared/`
   - Break circular dependencies

2. **Create module boundary tests**
   - ESLint rules for import restrictions
   - Module dependency graph validation

3. **Update documentation**
   - Module development guide
   - Configuration reference
   - Customer onboarding guide

---

## Module Definitions

### Core Module (Always Required)
```typescript
{
  name: 'core',
  displayName: 'Core',
  description: 'Authentication, dashboard, and base functionality',
  required: true,
  routes: {
    frontend: ['/', '/dashboard', '/login'],
    backend: ['/api/auth/*', '/api/health'],
  },
  dependencies: [],
}
```

### Tasks Module
```typescript
{
  name: 'tasks',
  displayName: 'Task Management',
  description: 'Personal task management with Kanban board',
  required: false,
  routes: {
    frontend: ['/tasks'],
    backend: ['/api/tasks/*'],
  },
  dependencies: ['core'],
  sidebarGroup: 'overview',
}
```

### Clients Module
```typescript
{
  name: 'clients',
  displayName: 'Client Management',
  description: 'Client CRM with contacts and intake forms',
  required: false,
  routes: {
    frontend: ['/clients', '/clients/:id', '/client-intake'],
    backend: ['/api/clients/*', '/api/contacts/*'],
  },
  dependencies: ['core'],
  sidebarGroup: 'clients',
}
```

### Projects Module
```typescript
{
  name: 'projects',
  displayName: 'Project Management',
  description: 'Project tracking with milestones and meetings',
  required: false,
  routes: {
    frontend: ['/projects', '/projects/:id', '/meetings/:id'],
    backend: ['/api/projects/*', '/api/milestones/*', '/api/meetings/*', '/api/documents/*'],
  },
  dependencies: ['core', 'clients'],
  sidebarGroup: 'projects',
}
```

### Assets Module
```typescript
{
  name: 'assets',
  displayName: 'AI Asset Library',
  description: 'Manage AI prompts, workflows, and datasets',
  required: false,
  routes: {
    frontend: ['/assets'],
    backend: ['/api/assets/*'],
  },
  dependencies: ['core'],
  sidebarGroup: 'projects',
}
```

### Marketing Module
```typescript
{
  name: 'marketing',
  displayName: 'Marketing Content',
  description: 'Content creation, campaigns, and social publishing',
  required: false,
  routes: {
    frontend: ['/marketing'],
    backend: ['/api/marketing-contents/*', '/api/campaigns/*', '/api/brand-profiles/*', '/api/publishing/*'],
  },
  dependencies: ['core', 'clients'],
  sidebarGroup: 'marketing',
}
```

### Sales Module
```typescript
{
  name: 'sales',
  displayName: 'Sales Pipeline',
  description: 'Lead management and sales pipeline tracking',
  required: false,
  routes: {
    frontend: ['/sales/leads', '/sales/pipeline'],
    backend: ['/api/leads/*'],
  },
  dependencies: ['core', 'clients'],
  sidebarGroup: 'sales',
}
```

### Admin Module
```typescript
{
  name: 'admin',
  displayName: 'User Administration',
  description: 'User management and system administration',
  required: false,
  routes: {
    frontend: ['/admin/users', '/admin/users/new', '/admin/users/:id'],
    backend: ['/api/users/*'],
  },
  dependencies: ['core'],
  sidebarGroup: 'admin',
  roleRequired: 'ADMIN',
}
```

---

## Configuration Schema

```typescript
// packages/config/src/types.ts

export type ModuleName =
  | 'core'
  | 'tasks'
  | 'clients'
  | 'projects'
  | 'assets'
  | 'marketing'
  | 'sales'
  | 'admin';

export interface ModuleConfig {
  name: ModuleName;
  displayName: string;
  description: string;
  required: boolean;
  dependencies: ModuleName[];
  sidebarGroup?: 'overview' | 'clients' | 'projects' | 'marketing' | 'sales' | 'admin';
  roleRequired?: 'USER' | 'ADMIN';
}

export interface CustomerConfig {
  customerId?: string;
  customerName?: string;
  enabledModules: ModuleName[];
  preset?: 'full' | 'project-management' | 'marketing-focus' | 'sales-focus' | 'custom';
  branding?: {
    appName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

export interface AppConfig {
  customer: CustomerConfig;
  modules: Record<ModuleName, ModuleConfig>;
}
```

---

## Presets

```typescript
// packages/config/src/presets.ts

export const CONFIG_PRESETS = {
  'full': {
    name: 'Full Suite',
    modules: ['core', 'tasks', 'clients', 'projects', 'assets', 'marketing', 'sales', 'admin'],
  },
  'project-management': {
    name: 'Project Management',
    modules: ['core', 'tasks', 'clients', 'projects'],
  },
  'marketing-focus': {
    name: 'Marketing Focus',
    modules: ['core', 'clients', 'marketing'],
  },
  'sales-focus': {
    name: 'Sales Focus',
    modules: ['core', 'clients', 'projects', 'sales'],
  },
  'minimal': {
    name: 'Minimal',
    modules: ['core', 'tasks'],
  },
};
```

---

## Environment Variables

```bash
# Enable specific modules (comma-separated)
ENABLED_MODULES=core,tasks,clients,projects

# Use a preset
MODULE_PRESET=project-management

# Customer ID for database config lookup
CUSTOMER_ID=acme-corp
```

---

## API Endpoints (Phase 4)

```
GET  /api/config              # Get current customer config
GET  /api/config/modules      # List all available modules
POST /api/config/modules      # Update enabled modules (admin only)
GET  /api/config/presets      # List available presets
POST /api/config/preset       # Apply a preset (admin only)
```

---

## Migration Strategy

1. **No breaking changes** - Existing deployments work unchanged
2. **Default to all modules** - If no config, enable everything
3. **Gradual adoption** - Customers can opt-in to modular setup
4. **Backwards compatible** - Old APIs continue to work

---

## Session Checklist

### Session 1: Feature Configuration System
- [ ] Create `packages/config/` package
- [ ] Define module types and schemas
- [ ] Create module definitions for all 8 modules
- [ ] Add preset configurations
- [ ] Create config loader utility
- [ ] Add to monorepo workspaces

### Session 2: Backend Module Registry
- [ ] Create module registry pattern in `apps/api/src/modules/`
- [ ] Move tasks routes to module structure
- [ ] Move clients/contacts routes to module structure
- [ ] Move projects/documents/milestones routes to module structure
- [ ] Move assets routes to module structure
- [ ] Create sales module (combine leads)
- [ ] Create admin module (users)
- [ ] Update `app.ts` to use registry
- [ ] Add disabled module handling (404 with message)

### Session 3: Frontend Module System
- [ ] Create module context provider
- [ ] Create frontend module registry
- [ ] Update Sidebar.tsx for conditional rendering
- [ ] Update App.tsx for dynamic routes
- [ ] Move pages into module folders
- [ ] Add lazy loading for modules
- [ ] Create "module disabled" page

### Session 4: Customer Configuration
- [ ] Add CustomerConfig to Prisma schema
- [ ] Create config API endpoints
- [ ] Create admin UI for module management
- [ ] Implement environment variable config
- [ ] Add config caching

### Session 5: Cleanup & Documentation
- [ ] Audit and fix cross-module imports
- [ ] Add ESLint import boundaries
- [ ] Create module development guide
- [ ] Update README with modular architecture
- [ ] Add integration tests for module loading

---

## File Structure After Modularization

```
pmo/
├── packages/
│   ├── config/                    # NEW: Shared configuration
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── modules.ts
│   │   │   ├── presets.ts
│   │   │   └── loader.ts
│   │   └── package.json
│   └── shared/                    # NEW: Shared utilities
│       ├── src/
│       │   ├── types/
│       │   └── utils/
│       └── package.json
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── modules/           # REORGANIZED
│   │       │   ├── index.ts       # Module registry
│   │       │   ├── core/          # Auth, health
│   │       │   ├── tasks/         # Task management
│   │       │   ├── clients/       # Client CRM
│   │       │   ├── projects/      # Project management
│   │       │   ├── assets/        # AI assets
│   │       │   ├── marketing/     # Marketing (exists)
│   │       │   ├── sales/         # Leads + pipeline
│   │       │   ├── admin/         # User admin
│   │       │   └── config/        # Config API
│   │       ├── middleware/
│   │       ├── prisma/
│   │       └── app.ts
│   │
│   └── web/
│       └── src/
│           ├── modules/           # NEW: Frontend modules
│           │   ├── index.ts       # Module registry
│           │   ├── core/          # Dashboard, layout
│           │   ├── tasks/         # Task pages/components
│           │   ├── clients/       # Client pages/components
│           │   ├── projects/      # Project pages/components
│           │   ├── assets/        # Asset pages/components
│           │   ├── marketing/     # Marketing (reorganized)
│           │   ├── sales/         # Sales pages/components
│           │   └── admin/         # Admin pages/components
│           ├── context/
│           │   ├── AuthContext.tsx
│           │   └── ModuleContext.tsx  # NEW
│           ├── layouts/
│           ├── ui/                # Shared UI primitives
│           └── App.tsx
│
└── prisma/
    └── schema.prisma              # Add CustomerConfig
```

---

## Success Criteria

1. **Customer A** can deploy with only: core, tasks, clients, projects
2. **Customer B** can deploy with only: core, clients, marketing
3. Disabled modules return 404 with "Module not enabled" message
4. Sidebar only shows enabled modules
5. No code changes needed to switch configurations
6. All existing functionality works unchanged with full config

---

## Notes

- The database schema remains unchanged (models for all features exist)
- Disabled modules simply don't have their routes/UI loaded
- Data isolation between customers is a separate concern (multi-tenancy)
- This plan focuses on feature toggles, not data separation
