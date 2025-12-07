# AI Coding Notes for the PMO Monorepo

A quick-reference guide for AI contributors working in this repository.

> **Note**: For comprehensive documentation including architecture patterns, code conventions, key file references, and common tasks, see [../CLAUDE.md](../CLAUDE.md).

## Quick Start

```bash
cd pmo
npm install
cp ../Docs/api.env.example apps/api/.env
npx prisma migrate dev --name init
```

## Essential Commands

| Command | Description |
|---------|-------------|
| `npm run dev --workspace pmo-web` | Start frontend (http://localhost:5173) |
| `npm run dev --workspace pmo-api` | Start API (http://localhost:3001) |
| `npm run lint` | Run ESLint |
| `npm run test` | Run all unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run format` | Format with Prettier |

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pmo.test | AdminDemo123! |
| Consultant | avery.chen@pmo.test | PmoDemo123! |
| Consultant | priya.desai@pmo.test | PmoDemo123! |
| Consultant | marco.silva@pmo.test | PmoDemo123! |

## Backend Overview (apps/api)

- **Entry**: `src/index.ts` boots Express app from `src/app.ts`
- **Auth**: JWT cookies via `src/auth/auth.routes.ts` (`/auth/login`, `/auth/logout`, `/auth/me`)
- **Validation**: Zod schemas in `src/validation/`
- **Database**: Prisma client in `src/prisma/client.ts`
- **Modules**: Feature modules in `src/modules/` with router + service pattern

### Required Environment Variables

```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
JWT_EXPIRES_IN="7d"
BCRYPT_SALT_ROUNDS=10
PORT=3001
CORS_ORIGIN="http://localhost:5173"
```

## Frontend Overview (apps/web)

- **Entry**: `src/main.tsx` with AuthProvider, React Router, TanStack Query
- **Routing**: `src/App.tsx` with protected routes and module guards
- **API Layer**: `src/api/` with fetch helpers and React Query hooks
- **UI Components**: `src/ui/` (Button, Input, Modal, Card, etc.)
- **Layouts**: `src/layouts/` (Sidebar, TopBar, AppLayout)

### Required Environment Variables

```bash
VITE_API_BASE_URL="http://localhost:3001/api"
```

## Database Models (Key Entities)

- **User**: Consultants/admins with role-based access
- **Client**: Companies with industry, size, AI maturity
- **Contact**: Client contacts (cascade delete)
- **Project**: Projects with status tracking
- **Task**: Kanban tasks with priority and assignee
- **Milestone**: Project milestones
- **Meeting**: Client/project meetings
- **AIAsset**: Reusable AI assets
- **MarketingContent**: Content with publishing workflow

## Module System

Enable modules via `PMO_MODULES` environment variable:

```bash
PMO_MODULES="assets,marketing,leads,admin,mcp,chatbot"
```

See [MODULES.md](MODULES.md) for full module documentation.

## Additional Resources

- [CLAUDE.md](../CLAUDE.md) - Comprehensive AI assistant guide
- [pmo/AGENT.md](../pmo/AGENT.md) - Contributor guide
- [Product Requirements](ai-consulting-pmo-product-requirements.md)
- [Implementation Codex](AI_Consulting_PMO_Implementation_Codex.md)
- [Module System](MODULES.md)
