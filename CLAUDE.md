# Claude Code Guide - AI Consulting PMO Platform

## Project Overview

This is a **Project Management Office (PMO) tool** for solo AI consultants to manage clients, projects, tasks, meetings, and AI assets. It's a full-stack TypeScript monorepo using npm workspaces.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Express + TypeScript + Prisma ORM |
| Database | PostgreSQL (production) / SQLite (development) |
| Testing | Vitest (unit) + Playwright (E2E) |
| State Management | TanStack React Query (server) + React Context (client) |

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
│   │   │   │   ├── middleware/   # Auth, error handling, module guards
│   │   │   │   └── modules/      # Feature modules (marketing, campaigns, module-config)
│   │   │   └── test/             # API unit tests
│   │   │
│   │   └── web/                  # React SPA (port 5173)
│   │       ├── src/
│   │       │   ├── pages/        # Route components
│   │       │   ├── features/     # Feature modules
│   │       │   ├── components/   # Reusable components
│   │       │   ├── hooks/        # Custom React hooks
│   │       │   ├── modules/      # Module configuration & context
│   │       │   ├── ui/           # UI primitives (Button, Modal, Toast)
│   │       │   └── api/          # HTTP client utilities
│   │       └── test/             # Component tests
│   │
│   ├── packages/
│   │   ├── modules/              # Shared module definitions (toggleable features)
│   │   └── types/                # Shared TypeScript types
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

## Environment Setup

### API (`pmo/apps/api/.env`)
```env
DATABASE_URL="file:../../prisma/dev.db"  # SQLite for local dev
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="1h"
PORT=4000
NODE_ENV="development"
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

### Adding a New Frontend Page
1. Create page component in `pmo/apps/web/src/pages/`
2. Add route in `pmo/apps/web/src/App.tsx`
3. Create hooks for data fetching in `pmo/apps/web/src/hooks/`
4. Add tests in `pmo/apps/web/test/`

### Database Changes
1. Modify `pmo/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Update seed data if needed in `pmo/prisma/seed.ts`

## Modular Architecture

The platform supports **toggleable modules** to customize deployments per customer. Modules can be configured via environment variables (deployment-wide) or database (per-tenant).

> **Full documentation**: See `Docs/MODULES.md` for comprehensive guide.

### Available Modules

| Module | Type | Description |
|--------|------|-------------|
| `dashboard` | Core | Main dashboard with metrics |
| `tasks` | Core | Personal task management |
| `clients` | Core | Client management |
| `projects` | Core | Project management |
| `assets` | Toggleable | AI-generated assets library |
| `marketing` | Toggleable | Marketing content, campaigns, publishing |
| `leads` | Toggleable | Lead capture and management |
| `pipeline` | Toggleable | Sales pipeline visualization |
| `admin` | Toggleable | User administration & module management |
| `finance-tracking` | Toggleable | Expense tracking, budgets, profitability reporting |
| `mcp` | Toggleable | Model Context Protocol for AI queries against CRM data |
| `social-publishing` | Toggleable | Multi-platform social media publishing via Ayrshare API |
| `content-ml` | Toggleable | AI-powered content generation with brand voice, SEO, repurposing |

### Quick Configuration

**Environment Variables** (deployment-wide default):
```env
# Backend: pmo/apps/api/.env
ENABLED_MODULES=dashboard,tasks,clients,projects,leads,pipeline

# Frontend: pmo/apps/web/.env
VITE_ENABLED_MODULES=dashboard,tasks,clients,projects,leads,pipeline
```

**Per-Tenant Configuration** (database-backed):
```bash
# Set modules for a specific customer via API
POST /api/admin/modules/bulk
{
  "tenantId": "customer-acme",
  "enabledModules": ["dashboard", "tasks", "clients", "projects", "leads"]
}
```

### Configuration Priority

1. **Database** (highest) - Per-tenant configs in `TenantModuleConfig` table
2. **Environment variable** - `ENABLED_MODULES` / `VITE_ENABLED_MODULES`
3. **Default** (lowest) - All modules enabled

### Key Files

| File | Purpose |
|------|---------|
| `packages/modules/index.ts` | Shared module definitions, dependencies, routes |
| `apps/api/src/modules/module-config.ts` | Static environment-based checks |
| `apps/api/src/modules/feature-flags/` | Database-backed tenant configuration |
| `apps/api/src/middleware/module-guard.middleware.ts` | Runtime route protection |
| `apps/web/src/modules/ModuleContext.tsx` | React context and hooks |
| `apps/web/src/pages/AdminModulesPage.tsx` | Admin UI for module management |

### How It Works

1. **Route Registration**: At startup, uses `ENABLED_MODULES` env var to decide which routes to load
2. **Runtime Middleware**: On each request, checks database via `X-Tenant-ID` header
3. **API Discovery**: `GET /api/modules?tenantId=xxx` returns tenant-specific config
4. **Navigation**: Sidebar dynamically shows only enabled modules
5. **Lazy Loading**: Optional modules use `React.lazy()` for code splitting

## ML Modules

The platform includes ML-powered features for predictive analytics and intelligent automation.

### Lead ML Module

Location: `pmo/apps/api/src/modules/lead-ml/`

**Features:**
- Conversion probability prediction
- Time-to-close estimation
- Lead priority ranking
- Score explanation with feature breakdown
- Risk factor analysis
- AI-generated recommendations

**Architecture:**
- Hybrid approach: LLM-based predictions (OpenAI GPT-4o-mini) with rule-based fallback
- Feature engineering: demographic, behavioral, temporal, engagement
- Prediction caching: 24-hour validity by default

**Key Files:**
| File | Purpose |
|------|---------|
| `services/lead-feature-extraction.service.ts` | Extract features from lead data |
| `services/lead-rule-based-prediction.service.ts` | Fallback rule-based predictions |
| `services/lead-conversion-prediction.service.ts` | Main prediction orchestration |
| `services/lead-priority-ranking.service.ts` | Lead ranking and sorting |
| `prompts/lead-ml-prompts.ts` | LLM prompt templates |
| `lead-ml.router.ts` | API endpoints |
| `types/` | TypeScript interfaces |

**API Endpoints:**
```
POST /api/lead-scoring/leads/:id/ml/predict       # Generate prediction
GET  /api/lead-scoring/leads/:id/ml/prediction    # Get existing prediction
GET  /api/lead-scoring/leads/:id/ml/features      # Get extracted features
POST /api/lead-scoring/:configId/ml/bulk-predict  # Bulk predictions
GET  /api/lead-scoring/:configId/ml/ranked-leads  # Priority-ranked leads
GET  /api/lead-scoring/:configId/ml/top-leads     # Top N leads
GET  /api/lead-scoring/:configId/ml/accuracy      # Prediction accuracy
GET  /api/lead-scoring/:configId/ml/feature-importance  # Feature weights
```

**Database Models:**
- `LeadTrainingData`: Historical data for model training
- `LeadMLModel`: Trained model metadata
- `LeadMLPrediction`: Stored predictions

**Documentation:**
- Feature guide: `docs/features/lead-ml-capabilities.md`
- API reference: `docs/api/lead-ml-endpoints.md`

### Customer Success ML Module

Location: `pmo/apps/api/src/modules/customer-success-ml/`

**Features:**
- Churn prediction
- Health insights
- Intelligent CTA generation

### Project ML Module

Location: `pmo/apps/api/src/modules/project-ml/`

**Features:**
- Success prediction
- Risk forecasting
- Timeline prediction
- Resource optimization

### Content ML Module

Location: `pmo/apps/api/src/modules/content-ml/`

**Features:**
- AI-powered content generation with brand voice consistency
- SEO optimization and keyword analysis
- Content repurposing (blog → social posts)
- AI-generated content ideas and suggestions
- Platform-specific optimization (character limits, hashtags)

**Key Files:**
| File | Purpose |
|------|---------|
| `services/brand-voice.service.ts` | Train and check brand voice consistency |
| `services/content-generation.service.ts` | Generate platform-optimized content |
| `services/seo-optimization.service.ts` | SEO analysis and keyword optimization |
| `services/content-repurposing.service.ts` | Convert content between formats |
| `services/content-ideas.service.ts` | Generate AI content suggestions |
| `prompts/content-ml-prompts.ts` | LLM prompt templates |
| `content-ml.router.ts` | API endpoints |

**API Endpoints:**
```
POST /api/content-ml/:configId/train-voice       # Train brand voice from samples
GET  /api/content-ml/:configId/voice-profile     # Get voice profile
POST /api/content-ml/:configId/check-voice       # Check content voice consistency
POST /api/content-ml/:configId/analyze-seo       # SEO analysis
POST /api/content-ml/:configId/repurpose/:id     # Repurpose content
POST /api/content-ml/:configId/ideas/generate    # Generate content ideas
POST /api/content-ml/hashtags                    # Generate hashtags
POST /api/content-ml/captions                    # Generate captions
```

### Social Publishing Module

Location: `pmo/apps/api/src/modules/social-publishing/`

**Features:**
- Multi-platform publishing via Ayrshare unified API
- Supported platforms: LinkedIn, Twitter/X, Instagram, Facebook, TikTok, YouTube, Pinterest, Threads, Bluesky
- Platform-level API tenancy (one Ayrshare account, per-tenant profile keys)
- Scheduled post publishing with BullMQ workers
- Publishing history tracking with metrics sync

**Key Files:**
| File | Purpose |
|------|---------|
| `adapters/unified/ayrshare.adapter.ts` | Ayrshare API integration |
| `services/social-publishing.service.ts` | Main orchestration service |
| `workers/publish.worker.ts` | BullMQ worker for publishing |
| `workers/scheduled-post.worker.ts` | Scheduled post scanner |
| `social-publishing.router.ts` | API endpoints |

**API Endpoints:**
```
POST /api/social-publishing/config               # Setup publishing config
GET  /api/social-publishing/platforms            # List connected platforms
POST /api/social-publishing/posts                # Create post
POST /api/social-publishing/posts/:id/publish    # Publish immediately
POST /api/social-publishing/posts/:id/schedule   # Schedule for later
GET  /api/social-publishing/posts/:id/metrics    # Get engagement metrics
```

**Database Models:**
- `SocialMediaPost`: Posts with status, platforms, scheduling
- `SocialPublishingConfig`: Per-tenant API configuration
- `PublishingHistory`: Platform-specific publish results

**Environment Variables:**
```env
AYRSHARE_API_KEY=your_platform_api_key    # Master key for all tenants
```

## Important Notes

- Authentication uses httpOnly cookies with JWT
- Safari ITP compatibility: includes cookie partitioning and Authorization header fallbacks
- CORS configured for Vercel preview deployments (`*.vercel.app`)
- API health check: `GET /api/healthz`
- ML features require OpenAI API key in `OPENAI_API_KEY` environment variable
