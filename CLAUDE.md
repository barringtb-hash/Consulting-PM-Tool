# CLAUDE.md

This document provides a comprehensive guide for AI assistants working with the AI CRM Platform codebase.

## Project Overview

The AI CRM Platform is a full-stack monorepo application that has evolved from a consulting PMO tool into a comprehensive multi-tenant CRM SaaS platform with AI-powered modules. It consists of a React + TypeScript frontend and a Node.js + Express + TypeScript API backend.

### Platform Capabilities

**Core CRM Features:**
- **Accounts**: Company/organization management with hierarchy support, health scores, and engagement tracking
- **CRM Contacts**: Contact lifecycle management (Lead → MQL → SQL → Customer) with lead scoring
- **Opportunities**: Sales pipeline management with customizable stages, weighted forecasting, and stage history
- **Pipelines**: Customizable sales pipelines with Kanban visualization
- **Activities**: Unified timeline for calls, emails, meetings, tasks, notes, and more

**Multi-Tenant Architecture:**
- Row-level tenant isolation via `tenantId` on all models
- Tenant context propagation through AsyncLocalStorage
- Prisma middleware for automatic tenant filtering

**PMO Module** (Original Features):
- Project management with templates
- Task management with Kanban boards
- Milestone tracking
- Meeting notes with action item extraction

**AI Tools** (Premium Add-ons):
- AI Chatbot with multi-channel support
- Smart Document Analyzer with OCR and field extraction

## Quick Reference

### Essential Commands (run from `/pmo` directory)

```bash
# Install dependencies
npm install

# Development servers
npm run dev --workspace pmo-web    # Frontend at http://localhost:5173
npm run dev --workspace pmo-api    # API at http://localhost:3001

# Testing
npm run test                       # All unit tests
npm run test --workspace pmo-api   # API unit tests only
npm run test --workspace pmo-web   # Web unit tests only
npm run test:e2e                   # E2E tests (headless)
npm run test:e2e:headed            # E2E tests (visible browser)
npm run test:e2e:ui                # E2E tests with Playwright UI

# Code quality
npm run lint                       # ESLint across all workspaces
npm run format                     # Prettier formatting

# Database
npx prisma migrate dev --name <name>  # Create and apply migration
npx prisma migrate deploy             # Deploy migrations (production)
npx prisma db seed                    # Seed sample data
npx prisma studio                     # Open Prisma Studio GUI
```

### Test Credentials (seeded accounts)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pmo.test | AdminDemo123! |
| Consultant | avery.chen@pmo.test | PmoDemo123! |
| Consultant | priya.desai@pmo.test | PmoDemo123! |
| Consultant | marco.silva@pmo.test | PmoDemo123! |

## Directory Structure

```
Consulting-PM-Tool/
├── pmo/                          # Main workspace root
│   ├── apps/
│   │   ├── web/                  # React frontend (Vite + TypeScript)
│   │   │   ├── src/
│   │   │   │   ├── api/          # API client functions and React Query hooks
│   │   │   │   ├── auth/         # Authentication context and protected routes
│   │   │   │   ├── components/   # Reusable feature components
│   │   │   │   ├── features/     # Feature-specific modules (meetings, etc.)
│   │   │   │   ├── layouts/      # App shell (Sidebar, TopBar, AppLayout)
│   │   │   │   ├── pages/        # Page components
│   │   │   │   ├── test/         # Test utilities and integration tests
│   │   │   │   ├── ui/           # Base UI components (Button, Input, Modal, etc.)
│   │   │   │   ├── utils/        # Utility functions
│   │   │   │   ├── App.tsx       # Main routing component
│   │   │   │   └── main.tsx      # Application entry point
│   │   │   └── package.json
│   │   │
│   │   └── api/                  # Express backend (TypeScript)
│   │       ├── src/
│   │       │   ├── auth/         # Authentication (JWT, cookies, middleware)
│   │       │   ├── config/       # Environment configuration
│   │       │   ├── crm/          # CRM module (Accounts, Opportunities, Activities)
│   │       │   │   ├── services/         # CRM business logic
│   │       │   │   │   ├── account.service.ts
│   │       │   │   │   ├── opportunity.service.ts
│   │       │   │   │   └── activity.service.ts
│   │       │   │   ├── routes/           # CRM API routes
│   │       │   │   │   ├── account.routes.ts
│   │       │   │   │   ├── opportunity.routes.ts
│   │       │   │   │   └── activity.routes.ts
│   │       │   │   └── index.ts          # CRM module exports
│   │       │   ├── middleware/   # Express middleware (error, rate-limit, module-guard)
│   │       │   ├── modules/      # Feature modules (AI tools, MCP, marketing, etc.)
│   │       │   │   ├── chatbot/          # AI Chatbot (Tool 1.1)
│   │       │   │   └── document-analyzer/ # Smart Document Analyzer (Tool 2.1)
│   │       │   ├── prisma/       # Prisma client configuration
│   │       │   ├── routes/       # Core API routes
│   │       │   ├── services/     # Business logic services
│   │       │   ├── types/        # TypeScript type definitions
│   │       │   ├── validation/   # Zod validation schemas
│   │       │   ├── app.ts        # Express app factory
│   │       │   └── index.ts      # Server entry point
│   │       ├── test/             # API test suites
│   │       └── package.json
│   │
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema (PostgreSQL)
│   │   ├── seed.ts               # Seed script for test data
│   │   └── migrations/           # Database migrations
│   │
│   ├── packages/                 # Shared packages
│   │   └── chatbot-widget/       # @pmo/chatbot-widget NPM package for embedding
│   ├── docs/                     # Internal documentation
│   ├── e2e/                      # Playwright E2E tests
│   ├── eslint.config.mjs         # ESLint configuration
│   ├── playwright.config.ts      # Playwright configuration
│   └── package.json              # Workspace root package.json
│
├── Docs/                         # Project documentation
│   ├── ai-coding-notes.md        # Quick reference for AI assistants
│   ├── ai-consulting-pmo-product-requirements.md  # Original PMO product specs
│   ├── AI_Consulting_PMO_Implementation_Codex.md  # Technical architecture
│   ├── AI-Tools.md               # AI Chatbot & Document Analyzer documentation
│   ├── CRM-TRANSFORMATION-PLAN.md # CRM transformation architecture & implementation plan
│   ├── deploy-notes-render-vercel.md              # Deployment guide
│   └── MODULES.md                # Module system documentation
│
├── .github/workflows/ci.yml      # GitHub Actions CI pipeline
└── README.md                     # Project README
```

## Tech Stack

### Frontend (pmo/apps/web)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC plugin
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Data Fetching**: TanStack React Query
- **Drag & Drop**: @dnd-kit (for Kanban boards)
- **Icons**: Lucide React
- **Testing**: Vitest + Testing Library

### Backend (pmo/apps/api)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: JWT with httpOnly cookies
- **Validation**: Zod schemas
- **Password Hashing**: bcryptjs
- **Testing**: Vitest + Supertest

### Development Tools
- **Monorepo**: npm workspaces
- **Linting**: ESLint 9 with TypeScript and React plugins
- **Formatting**: Prettier
- **Pre-commit**: Husky + lint-staged
- **E2E Testing**: Playwright
- **CI/CD**: GitHub Actions

## Architecture Patterns

### Frontend Architecture

1. **API Layer** (`apps/web/src/api/`)
   - `http.ts`: Base fetch wrapper with credentials
   - Entity-specific files (clients.ts, projects.ts, etc.): CRUD operations
   - `hooks/`: React Query hooks for data fetching

2. **Authentication** (`apps/web/src/auth/`)
   - `AuthContext.tsx`: Global auth state management
   - `ProtectedRoute.tsx`: Route guard component
   - Cookie-based JWT auth with Safari ITP fallback

3. **Routing** (`apps/web/src/App.tsx`)
   - Core routes always available
   - Module routes conditionally rendered based on `useModules()` hook
   - Lazy loading for optional module pages

4. **UI Components** (`apps/web/src/ui/`)
   - Reusable base components: Button, Input, Modal, Card, Badge, etc.
   - Consistent styling via Tailwind classes

### Backend Architecture

1. **Entry Point**: `apps/api/src/index.ts` → `apps/api/src/app.ts`

2. **Route Organization**:
   - Core routes in `routes/` directory
   - Feature modules in `modules/` directory with router + service pattern
   - Routes registered in `app.ts` with module guards

3. **Authentication Flow**:
   - `POST /api/auth/login`: Issues JWT cookie
   - `POST /api/auth/logout`: Clears cookie
   - `GET /api/auth/me`: Returns current user
   - `requireAuth` middleware protects routes

4. **Module System**:
   - Modules can be enabled/disabled via environment variables
   - `requireModule()` middleware guards module routes
   - Frontend discovers enabled modules via `/api/feature-flags`

5. **Validation Pattern**:
   ```typescript
   // In route handler
   const parsed = schema.safeParse(req.body);
   if (!parsed.success) {
     return res.status(400).json({ errors: parsed.error.flatten() });
   }
   ```

### Database Models (Prisma)

Key models in `pmo/prisma/schema.prisma`:

**CRM Core Models:**
- **Account**: Company/organization with hierarchy support, health scores, engagement tracking, billing/shipping addresses
  - Supports parent/child relationships for account hierarchies
  - Types: PROSPECT, CUSTOMER, PARTNER, COMPETITOR, CHURNED, OTHER
  - Relations: contacts, opportunities, activities, child accounts
- **CRMContact**: CRM-specific contact with lifecycle management
  - Lifecycle stages: LEAD, MQL, SQL, OPPORTUNITY, CUSTOMER, EVANGELIST, CHURNED
  - Lead scoring, source tracking, communication preferences
  - LinkedIn/Twitter integration
- **Pipeline**: Customizable sales pipelines with stages
  - Default pipeline created per tenant
  - Configurable stage order and probabilities
- **SalesPipelineStage**: Individual pipeline stages
  - Stage types: OPEN, WON, LOST
  - Probability and color coding
  - Rotten days tracking for stale deals
- **Opportunity**: Deals/potential revenue
  - Weighted amount calculation (amount × probability)
  - Stage history tracking
  - Expected/actual close dates
  - Lost reason tracking
- **OpportunityContact**: Junction table for opportunity contacts with roles
- **OpportunityStageHistory**: Audit trail for opportunity stage changes
- **CRMActivity**: Unified activity timeline
  - Types: CALL, EMAIL, MEETING, TASK, NOTE, SMS, LINKEDIN_MESSAGE, CHAT, DEMO, PROPOSAL, CONTRACT, OTHER
  - Status: PLANNED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
  - Links to accounts, contacts, and opportunities

**PMO Models (Original):**
- **User**: Consultants/admins with role-based access
- **Client**: Client companies with industry, size, AI maturity
- **Contact**: Project-related client contacts (cascade delete with client)
- **Project**: Projects linked to clients with status tracking
- **Task**: Kanban-style tasks with status, priority, assignee
- **Milestone**: Project milestones with status tracking
- **Meeting**: Meetings linked to clients/projects
- **AIAsset**: Reusable AI assets (prompts, workflows, datasets)
- **MarketingContent**: Content pieces with publishing workflow
- **Campaign**: Marketing campaigns with multiple content pieces
- **InboundLead**: Sales pipeline leads

**AI Chatbot Models** (Tool 1.1):
- **ChatbotConfig**: Per-client chatbot configuration with widget customization
- **ChatConversation**: Conversation sessions with customer info and status
- **ChatMessage**: Individual messages with intent detection and sentiment
- **KnowledgeBaseItem**: FAQ entries for automated responses
- **WebhookConfig**: Webhook endpoints for real-time event notifications
- **ChannelConfig**: Multi-channel messaging (SMS, WhatsApp, Slack)
- **ChatAnalytics**: Daily aggregated analytics

**Document Analyzer Models** (Tool 2.1):
- **DocumentAnalyzerConfig**: Per-client document analysis configuration
- **AnalyzedDocument**: Uploaded documents with extraction results
- **ExtractionTemplate**: Custom field extraction templates
- **DocumentIntegration**: External system integrations
- **BatchJob**: Batch processing jobs for multiple documents

## Code Conventions

### TypeScript
- Strict mode enabled
- Use explicit return types for functions
- Prefix unused variables with `_` (configured in ESLint)
- Use Zod for runtime validation

### React Components
- Functional components with TypeScript
- Props interfaces defined inline or in same file
- Use React Query for server state
- Avoid prop drilling - use context for shared state

### API Routes
- RESTful naming conventions
- Consistent response format: `{ data: T }` or `{ error: string }`
- Zod validation for request bodies
- Prisma for database operations

### Styling
- Tailwind CSS utility classes
- No CSS-in-JS or separate CSS files
- Consistent spacing and color tokens

### File Naming
- React components: PascalCase (e.g., `ClientForm.tsx`)
- Utilities and services: camelCase (e.g., `client.service.ts`)
- Routes: kebab-case or entity name (e.g., `task.routes.ts`)
- Tests: Same name with `.test.ts(x)` suffix

## Environment Variables

### API (`pmo/apps/api/.env`)
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/pmo"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
BCRYPT_SALT_ROUNDS=10
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"

# Module flags (optional)
PMO_MODULES="assets,marketing,leads,admin,mcp,chatbot,documentAnalyzer"

# AI Tools - OpenAI Integration (optional, enables AI features)
OPENAI_API_KEY="sk-your-openai-api-key"

# AI Tools - Channel Integrations (optional)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token"
SLACK_BOT_TOKEN="xoxb-your-slack-bot-token"
```

### Web (`pmo/apps/web/.env`)
```bash
VITE_API_BASE_URL="http://localhost:3001/api"
```

## Testing Guidelines

### Unit Tests
- Located alongside source files or in `test/` directories
- Use Vitest with Testing Library for React components
- API tests use Supertest with test database

### E2E Tests
- Located in `pmo/e2e/` directory
- Use Playwright with axe-core for accessibility
- Test complete user workflows

### Running Tests Before Committing
```bash
cd pmo
npm run lint && npm run test
```

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):
1. **foundation-check** job:
   - Runs on push and pull request
   - Sets up PostgreSQL service
   - Installs dependencies
   - Runs lint
   - Runs API unit tests
   - Builds packages

## Deployment

### Production Stack
- **Frontend**: Vercel (static hosting)
- **Backend**: Render Web Service
- **Database**: Render Managed PostgreSQL

### Deployment Checklist
1. Set environment variables in Render and Vercel
2. Deploy API to Render with health check at `/api/healthz`
3. Deploy frontend to Vercel with correct `VITE_API_BASE_URL`
4. Run `npx prisma migrate deploy` for database migrations

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Frontend entry | `pmo/apps/web/src/main.tsx` |
| Frontend routing | `pmo/apps/web/src/App.tsx` |
| API entry | `pmo/apps/api/src/index.ts` |
| API app factory | `pmo/apps/api/src/app.ts` |
| Auth routes | `pmo/apps/api/src/auth/auth.routes.ts` |
| Auth middleware | `pmo/apps/api/src/auth/auth.middleware.ts` |
| Database schema | `pmo/prisma/schema.prisma` |
| Module config | `pmo/apps/api/src/modules/module-config.ts` |
| UI components | `pmo/apps/web/src/ui/index.ts` |
| API hooks | `pmo/apps/web/src/api/hooks/` |
| ESLint config | `pmo/eslint.config.mjs` |
| CI workflow | `.github/workflows/ci.yml` |

**AI Tools Files**:

| Purpose | File Path |
|---------|-----------|
| Chatbot router | `pmo/apps/api/src/modules/chatbot/chatbot.router.ts` |
| Chatbot service | `pmo/apps/api/src/modules/chatbot/chatbot.service.ts` |
| Chatbot widget router | `pmo/apps/api/src/modules/chatbot/widget/widget.router.ts` |
| Chatbot webhooks | `pmo/apps/api/src/modules/chatbot/webhooks/webhook.service.ts` |
| Chatbot channels | `pmo/apps/api/src/modules/chatbot/channels/` |
| Chatbot page (UI) | `pmo/apps/web/src/pages/ai-tools/ChatbotPage.tsx` |
| Widget package | `pmo/packages/chatbot-widget/` |
| Doc analyzer router | `pmo/apps/api/src/modules/document-analyzer/document-analyzer.router.ts` |
| Doc analyzer service | `pmo/apps/api/src/modules/document-analyzer/document-analyzer.service.ts` |
| Doc analyzer templates | `pmo/apps/api/src/modules/document-analyzer/templates/built-in-templates.ts` |
| Doc analyzer page (UI) | `pmo/apps/web/src/pages/ai-tools/DocumentAnalyzerPage.tsx` |

**CRM Files:**

| Purpose | File Path |
|---------|-----------|
| Account service | `pmo/apps/api/src/crm/services/account.service.ts` |
| Account routes | `pmo/apps/api/src/crm/routes/account.routes.ts` |
| Opportunity service | `pmo/apps/api/src/crm/services/opportunity.service.ts` |
| Opportunity routes | `pmo/apps/api/src/crm/routes/opportunity.routes.ts` |
| Activity service | `pmo/apps/api/src/crm/services/activity.service.ts` |
| Activity routes | `pmo/apps/api/src/crm/routes/activity.routes.ts` |
| CRM module exports | `pmo/apps/api/src/crm/index.ts` |
| Pipeline page (UI) | `pmo/apps/web/src/pages/PipelinePage.tsx` |
| Account detail page | `pmo/apps/web/src/pages/crm/AccountDetailPage.tsx` |
| Opportunity detail page | `pmo/apps/web/src/pages/crm/OpportunityDetailPage.tsx` |
| Lead service (with conversion) | `pmo/apps/api/src/services/lead.service.ts` |
| Lead schema (conversion params) | `pmo/apps/api/src/validation/lead.schema.ts` |
| Migration: Leads → CRMContacts | `pmo/apps/api/src/scripts/migrate-leads-to-crm-contacts.ts` |
| Migration: Clients → Accounts | `pmo/apps/api/src/scripts/migrate-clients-to-accounts.ts` |
| Migration: Pipeline → Opportunities | `pmo/apps/api/src/scripts/migrate-project-pipeline-to-opportunities.ts` |
| CRM validation schemas | `pmo/apps/api/src/validation/crm/` |
| Technical Debt Report | `Docs/TECHNICAL-DEBT-REPORT.md` |

## Common Tasks

### Adding a New API Route
1. Create validation schema in `apps/api/src/validation/`
2. Create service in `apps/api/src/services/`
3. Create router in `apps/api/src/routes/`
4. Register router in `apps/api/src/app.ts`

### Adding a New Page
1. Create page component in `apps/web/src/pages/`
2. Add route in `apps/web/src/App.tsx`
3. Add navigation link in `apps/web/src/layouts/Sidebar.tsx`

### Adding a Database Model
1. Add model to `pmo/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <migration-name>`
3. Create corresponding API routes and frontend pages

### Enabling a Module
Set `PMO_MODULES` environment variable with comma-separated module names:
```bash
PMO_MODULES="assets,marketing,leads,admin,mcp,chatbot,documentAnalyzer"
```

### Working with AI Tools
For detailed documentation on the AI Chatbot and Document Analyzer, see [Docs/AI-Tools.md](Docs/AI-Tools.md).

**Quick start for AI Tools:**
1. Enable modules: Add `chatbot` and/or `documentAnalyzer` to `PMO_MODULES`
2. Set `OPENAI_API_KEY` for AI-powered features (optional - falls back to rule-based)
3. Access UI at `/ai-tools/chatbot` or `/ai-tools/document-analyzer`
4. Configure per-client via the Client detail page

### Working with CRM Features
For the comprehensive CRM transformation plan, see [Docs/CRM-TRANSFORMATION-PLAN.md](Docs/CRM-TRANSFORMATION-PLAN.md).

**CRM API Endpoints:**

| Resource | Endpoints |
|----------|-----------|
| **Accounts** | `GET/POST /api/crm/accounts`, `GET/PUT/DELETE /api/crm/accounts/:id` |
| | `GET /api/crm/accounts/stats` - Account statistics |
| | `POST /api/crm/accounts/:id/archive` - Soft delete |
| | `POST /api/crm/accounts/:id/restore` - Restore archived |
| | `GET /api/crm/accounts/:id/hierarchy` - Account hierarchy |
| | `GET /api/crm/accounts/:id/timeline` - Activity timeline |
| | `POST /api/crm/accounts/:id/merge` - Merge accounts |
| **Opportunities** | `GET/POST /api/crm/opportunities`, `GET/PUT/DELETE /api/crm/opportunities/:id` |
| | `GET /api/crm/opportunities/pipeline-stats` - Pipeline statistics |
| | `GET /api/crm/opportunities/closing-soon` - Deals closing soon |
| | `POST /api/crm/opportunities/:id/stage` - Move to stage |
| | `POST /api/crm/opportunities/:id/won` - Mark as won |
| | `POST /api/crm/opportunities/:id/lost` - Mark as lost |
| | `POST/DELETE /api/crm/opportunities/:id/contacts/:contactId` - Manage contacts |
| **Activities** | `GET/POST /api/crm/activities`, `GET/PUT/DELETE /api/crm/activities/:id` |
| | `GET /api/crm/activities/my/upcoming` - User's upcoming activities |
| | `GET /api/crm/activities/my/overdue` - User's overdue activities |
| | `GET /api/crm/activities/stats` - Activity statistics |
| | `POST /api/crm/activities/:id/complete` - Complete activity |
| | `POST /api/crm/activities/:id/cancel` - Cancel activity |
| | `POST /api/crm/activities/log/call` - Quick log call |
| | `POST /api/crm/activities/log/note` - Quick log note |

**Key CRM Features:**
- **Account Hierarchy**: Support for parent/child account relationships
- **Health Scoring**: 0-100 health score with engagement tracking
- **Pipeline Management**: Customizable stages with probability and weighted forecasting
- **Stage History**: Full audit trail of opportunity stage changes with duration tracking
- **Activity Timeline**: Unified view of all interactions across accounts, contacts, and opportunities
- **Merge Accounts**: Combine duplicate accounts (moves all contacts, opportunities, activities)

**Lead Conversion Workflow:**
When converting a lead, the system creates:
- **Account**: Linked to the Client (if exists) via `customFields.legacyClientId`
- **Opportunity**: Sales pipeline tracking with stage, amount, probability
- **Project** (optional): For delivery tracking only - no pipeline fields

Lead conversion parameters:
```typescript
{
  createOpportunity: true,      // Create CRM Opportunity (default: true)
  opportunityName: string,      // Custom opportunity name
  opportunityAmount: number,    // Deal value
  opportunityProbability: number, // Win probability (0-100)
  expectedCloseDate: string,    // Expected close date
  createProject: false,         // Create Project for delivery (default: false)
  // Legacy params (deprecated, mapped to Opportunity):
  pipelineStage: string,        // @deprecated - use Opportunity
  pipelineValue: number,        // @deprecated - use opportunityAmount
}
```

**Data Model Notes:**
- **Project**: Represents delivery/work tracking only. Pipeline fields (pipelineStage, pipelineValue, etc.) have been moved to Opportunity.
- **Opportunity**: Represents sales pipeline tracking with weighted forecasting.
- **Account**: CRM entity linked to legacy Client via `customFields.legacyClientId`.

**Migration Scripts:**
| Script | Purpose |
|--------|---------|
| `migrate-leads-to-crm-contacts.ts` | Migrate InboundLead to CRMContact |
| `migrate-clients-to-accounts.ts` | Migrate Client to Account |
| `migrate-project-pipeline-to-opportunities.ts` | Migrate Project pipeline data to Opportunities |

Run migration scripts from `/pmo/apps/api`:
```bash
npx ts-node src/scripts/migrate-project-pipeline-to-opportunities.ts --dry-run  # Preview
npx ts-node src/scripts/migrate-project-pipeline-to-opportunities.ts            # Execute
```

## Troubleshooting

### Common Issues

1. **Pre-commit hooks not running**
   ```bash
   cd pmo && npm run prepare
   ```

2. **Database connection issues**
   - Verify `DATABASE_URL` in `.env`
   - Ensure PostgreSQL is running
   - Run `npx prisma migrate dev` to apply migrations

3. **CORS errors**
   - Check `CORS_ORIGIN` matches frontend URL
   - Verify `credentials: 'include'` in fetch requests

4. **Module not available errors**
   - Verify module is included in `PMO_MODULES` env var
   - Check both API and frontend module configurations

## Documentation Links

- [CRM Transformation Plan](Docs/CRM-TRANSFORMATION-PLAN.md) - Comprehensive CRM architecture and implementation plan
- [Technical Debt Report](Docs/TECHNICAL-DEBT-REPORT.md) - CRM technical debt tracking (28/28 items resolved)
- [API Versioning Strategy](Docs/API-VERSIONING.md) - API versioning documentation
- [Product Requirements](Docs/ai-consulting-pmo-product-requirements.md) - Original PMO product specs
- [Implementation Codex](Docs/AI_Consulting_PMO_Implementation_Codex.md) - Technical architecture
- [AI Coding Notes](Docs/ai-coding-notes.md) - Legacy quick reference
- [Module System](Docs/MODULES.md) - Feature module configuration
- [AI Tools (Chatbot & Document Analyzer)](Docs/AI-Tools.md) - AI tools documentation
- [Deployment Guide](Docs/deploy-notes-render-vercel.md) - Render + Vercel deployment
- [E2E Test Coverage](pmo/docs/e2e-coverage.md) - End-to-end test documentation
