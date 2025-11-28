# Claude Code Guide - AI Consulting PMO Platform

## Project Overview

This is a **Project Management Office (PMO) tool** for solo AI consultants to manage clients, projects, tasks, meetings, and AI assets. It's a full-stack TypeScript monorepo using npm workspaces with **modular feature flags** for customizable deployments.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Express + TypeScript + Prisma ORM |
| Database | PostgreSQL (production) / SQLite (development) |
| Testing | Vitest (unit) + Playwright (E2E) |
| State Management | TanStack React Query (server) + React Context (client) |
| Feature Flags | Environment-based toggles with API + frontend integration |

## Directory Structure

```
Consulting-PM-Tool/
├── pmo/                          # Monorepo root (npm workspaces)
│   ├── apps/
│   │   ├── api/                  # Express REST API (port 4000)
│   │   │   ├── src/
│   │   │   │   ├── routes/       # Express route handlers
│   │   │   │   ├── services/     # Business logic layer
│   │   │   │   ├── validation/   # Zod schemas
│   │   │   │   ├── middleware/   # Auth, error, feature gates
│   │   │   │   ├── modules/      # Feature modules (marketing, campaigns, meetings, etc.)
│   │   │   │   └── config/       # Environment & feature flag configuration
│   │   │   └── test/             # API unit tests
│   │   │
│   │   └── web/                  # React SPA (port 5173)
│   │       ├── src/
│   │       │   ├── pages/        # Route components
│   │       │   ├── features/     # Feature modules + FeatureContext
│   │       │   ├── components/   # Reusable components
│   │       │   ├── hooks/        # Custom React hooks
│   │       │   ├── ui/           # UI primitives (Button, Modal, Toast)
│   │       │   ├── api/          # HTTP client utilities
│   │       │   └── api/hooks/    # React Query hooks by domain
│   │       └── test/             # Component tests
│   │
│   ├── packages/types/           # Shared TypeScript types
│   │
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── migrations/           # Database migrations
│   │
│   ├── e2e/                      # Playwright E2E tests
│   └── docs/                     # Project documentation
│
├── Docs/                         # Additional documentation
└── README.md
```

## Key Commands

All commands run from the `/pmo` directory:

```bash
# Development
npm run dev --workspace pmo-api      # Start API server (port 4000)
npm run dev --workspace pmo-web      # Start frontend (port 5173)

# Testing
npm run lint                         # ESLint (zero warnings policy)
npm run test                         # All unit tests
npm run test --workspace pmo-api     # API tests only
npm run test --workspace pmo-web     # Web tests only
npm run test:e2e                     # E2E tests (headless)

# Build
npm run build --workspace pmo-api    # Build API
npm run build --workspace pmo-web    # Build frontend

# Database
npx prisma migrate dev --name <name> # Create migration
npx prisma db seed                   # Seed test data
npx prisma studio                    # Visual DB explorer
```

## Test Accounts (Seeded Data)

| Account | Email | Password |
|---------|-------|----------|
| Admin | `admin@pmo.test` | `AdminDemo123!` |
| Consultant | `avery.chen@pmo.test` | `PmoDemo123!` |

## Code Patterns

### Backend (API)

- **Route handlers** validate input with Zod, then call services
- **Services** contain business logic and Prisma queries
- **Auth middleware** (`requireAuth`) protects routes via JWT cookies

```
Route → Zod Validation → Service → Prisma → Database
```

### Frontend (Web)

- **Pages** are route-mapped React components
- **React Query** manages server state (caching, mutations)
- **Context** manages auth state (`AuthContext`)
- **Components** use Tailwind for styling

## Database Schema (Key Entities)

- **User**: Consultant accounts
- **Client**: Companies being served
- **Contact**: Individuals at client companies
- **Project**: Engagements (status: PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED)
- **Task**: Work items (status: BACKLOG, IN_PROGRESS, BLOCKED, DONE)
- **Milestone**: Project checkpoints
- **Meeting**: Meeting notes with decisions/risks
- **AIAsset**: Prompt templates, workflows, datasets
- **MarketingContent**: Blog posts, case studies, social content (10 content types)
- **Campaign**: Marketing initiatives
- **BrandProfile**: Brand guidelines & assets
- **InboundLead**: Lead tracking and conversion

## Modular Architecture

The platform uses a **domain-driven modular architecture** with feature flags for selective feature activation.

### Feature Modules

| Module | Backend Location | Features Included |
|--------|-----------------|-------------------|
| **Core** | `routes/` | Clients, contacts, projects, tasks, milestones, documents |
| **Marketing** | `modules/marketing/` | Content generation, campaigns, brand profiles, publishing |
| **Sales** | `routes/leads.ts` | Lead management, pipeline tracking, lead conversion |
| **AI Assets** | `routes/assets.ts` | Prompt templates, workflows, datasets, evaluations |
| **Meetings** | `modules/meetings/` | Meeting notes, decisions, task creation from meetings |
| **Admin** | `routes/users.ts` | User management (create, edit, delete) |

### Feature Flags

All features are **enabled by default**. Set environment variables to `false` to disable:

```bash
# Disable marketing features
FEATURE_MARKETING=false

# Disable sales/leads features
FEATURE_SALES=false

# Disable AI assets library
FEATURE_AI_ASSETS=false

# Disable meetings module
FEATURE_MEETINGS=false

# Disable admin user management
FEATURE_ADMIN=false
```

### React Query Hooks Organization

Hooks are organized by domain in `pmo/apps/web/src/api/hooks/`:

```
hooks/
├── queryKeys.ts          # Centralized query key namespace
├── clients/              # Client CRUD hooks
├── contacts/             # Contact management hooks
├── projects/             # Project hooks
├── tasks/                # Task management hooks
├── milestones/           # Milestone hooks
├── meetings/             # Meeting hooks (feature-gated)
├── marketing/            # Marketing content hooks (feature-gated)
├── campaigns/            # Campaign hooks (feature-gated)
├── brand-profiles/       # Brand profile hooks (feature-gated)
├── publishing/           # Publishing hooks (feature-gated)
├── leads/                # Lead management hooks (feature-gated)
├── assets/               # AI asset hooks (feature-gated)
└── documents/            # Document hooks
```

### Frontend Feature Context

Use the feature context to conditionally render UI:

```tsx
import { useFeature, FeatureGate } from './features';

// Hook usage
function MyComponent() {
  const isMarketingEnabled = useFeature('marketing');
  if (!isMarketingEnabled) return null;
  return <MarketingSection />;
}

// Component usage
<FeatureGate feature="marketing" fallback={<UpgradeBanner />}>
  <MarketingSection />
</FeatureGate>
```

## Environment Setup

### API (`pmo/apps/api/.env`)
```env
DATABASE_URL="file:../../prisma/dev.db"  # SQLite for local dev
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="1h"
BCRYPT_SALT_ROUNDS=10
PORT=4000
NODE_ENV="development"

# AI API Keys (optional, for marketing content generation)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Feature flags (all enabled by default, set to 'false' to disable)
# FEATURE_MARKETING=false
# FEATURE_SALES=false
# FEATURE_AI_ASSETS=false
# FEATURE_MEETINGS=false
# FEATURE_ADMIN=false
```

### Web (`pmo/apps/web/.env`)
```env
VITE_API_BASE_URL=  # Leave blank for Vite proxy
```

## CI/CD

GitHub Actions runs on every push:
1. `npm install`
2. `npm run lint` (must pass with zero warnings)
3. `npm run test --workspace pmo-api`
4. `npm run build`

## Code Quality Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Zero warnings policy (`--max-warnings=0`)
- **Prettier**: singleQuote, trailingComma, semi
- **Pre-commit**: Husky + lint-staged runs format/lint on staged files

## Common Development Tasks

### Adding a New API Route
1. Create route handler in `pmo/apps/api/src/routes/`
2. Add Zod schema in `pmo/apps/api/src/validation/`
3. Create service in `pmo/apps/api/src/services/`
4. Register route in `pmo/apps/api/src/app.ts`
5. Add tests in `pmo/apps/api/test/`

### Adding a Feature-Gated Module
1. Create module folder in `pmo/apps/api/src/modules/{feature}/`
2. Add router (`{feature}.router.ts`) and service (`{feature}.service.ts`)
3. Register route with feature gate in `pmo/apps/api/src/app.ts`:
   ```typescript
   app.use('/api', requireFeature('featureName'), featureRouter);
   ```
4. Add React Query hooks in `pmo/apps/web/src/api/hooks/{feature}/`
5. Add frontend page with lazy loading in `App.tsx`:
   ```typescript
   const FeaturePage = lazy(() => import('./pages/FeaturePage'));
   <Route path="/feature" element={<FeatureRoute feature="featureName"><FeaturePage /></FeatureRoute>} />
   ```
6. Add nav item in `Sidebar.tsx` with `feature` property

### Adding a New Frontend Page
1. Create page component in `pmo/apps/web/src/pages/`
2. Add route in `pmo/apps/web/src/App.tsx`
3. Create hooks for data fetching in `pmo/apps/web/src/api/hooks/`
4. Add nav item in `pmo/apps/web/src/layouts/Sidebar.tsx`
5. Add tests in `pmo/apps/web/test/`

### Database Changes
1. Modify `pmo/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Update seed data if needed in `pmo/prisma/seed.ts`

## Important Notes

- Authentication uses httpOnly cookies with JWT
- Safari ITP compatibility: includes cookie partitioning and Authorization header fallbacks
- CORS configured for Vercel preview deployments (`*.vercel.app`)
- API health check: `GET /api/healthz`
