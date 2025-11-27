# AI Consulting PMO Platform

The AI Consulting PMO Platform is a monorepo for a React + TypeScript frontend and a Node.js + TypeScript API that together deliver a lightweight PMO tailored to solo AI consultants. Dive into the product requirements and technical plan in [Docs/ai-consulting-pmo-product-requirements.md](Docs/ai-consulting-pmo-product-requirements.md) and [Docs/AI_Consulting_PMO_Implementation_Codex.md](Docs/AI_Consulting_PMO_Implementation_Codex.md).

## Monorepo layout
The `pmo` directory is an npm workspace with the following structure:

- `pmo/apps/web`: Vite-powered React + TypeScript SPA frontend
- `pmo/apps/api`: Express + TypeScript API server
- `pmo/prisma`: Prisma schema and database assets
- `pmo/packages`: Shared packages (types, config, and utilities)
  - `pmo/packages/config`: Module configuration system for feature toggles
- `.github/workflows`: Continuous integration definitions

## Quickstart
1. Install dependencies from the workspace root:
   ```bash
   cd pmo
   npm install
   ```
2. Set up API environment variables and database (from `/pmo`):
   ```bash
   # Copy the example env into the API workspace
   cp ../Docs/api.env.example apps/api/.env

   # Apply Prisma migrations (uses SQLite file:./dev.db by default)
   npx prisma migrate dev --name init
   ```
3. Start the frontend and API in watch mode (separate terminals):
   ```bash
   npm run dev --workspace pmo-web
   npm run dev --workspace pmo-api
   ```
4. Common scripts from `/pmo`:
   ```bash
   npm run lint         # Lint TypeScript/JavaScript sources
   npm run test         # Run workspace test suites (unit tests)
   npm run test:e2e     # Run E2E tests with Playwright
   npm run test:e2e:headed  # Run E2E tests with visible browser
   npm run test:e2e:ui  # Run E2E tests with Playwright UI
   npm run build        # Build artifacts (placeholder at present)
   npm run format       # Prettier formatting across the repo
   ```

## Seeded test accounts
Running `npx prisma migrate dev --name init` (or `npx prisma db seed`) from `/pmo` loads sample users for quick logins during manual testing:

- **Testing Admin** — `admin@pmo.test` / `AdminDemo123!` (UTC timezone)
- **Consultant accounts** — `avery.chen@pmo.test`, `priya.desai@pmo.test`, `marco.silva@pmo.test` all use `PmoDemo123!`

Use these credentials when signing into the web app or exercising `/auth/login` directly.

## Shared tooling
- TypeScript is configured via the base `tsconfig.base.json` applied across workspaces.
- ESLint enforces the shared lint rules defined in `eslint.config.mjs` for both React and Node code.
- Prettier handles consistent formatting; `npm run format` applies it across Markdown and source files.
- Husky installs pre-commit hooks that run `lint-staged` to format and lint staged changes. If hooks are missing (e.g., after cloning), reinstall them with:
  ```bash
  cd pmo
  npm run prepare
  ```

## Development workflow
- Lint locally before committing: `npm run lint`.
- Run tests and builds from `/pmo` when available: `npm run test` and `npm run build`.
- Follow contribution etiquette and additional workspace guidance in `pmo/AGENT.md`.

## Frontend environment
- Copy `/pmo/apps/web/.env.example` to `/pmo/apps/web/.env` and set `VITE_API_BASE_URL`.
- In production (Vercel), `VITE_API_BASE_URL` **must** point to the public Render API base, e.g. `https://your-api.onrender.com/api`.

## Testing

### Unit Tests

The project includes comprehensive unit tests for both API and web applications using Vitest.

```bash
# Run all unit tests
cd pmo
npm run test

# Run API tests only
npm run test --workspace pmo-api

# Run web tests only
npm run test --workspace pmo-web
```

**Coverage**:
- API: Routes, middleware, services (15 test files)
- Web: Pages, components, hooks (6 test files)

### E2E Tests

End-to-end tests use Playwright to test complete user workflows across M0-M7.

```bash
cd pmo

# Run E2E tests (headless)
npm run test:e2e

# Run with visible browser
npm run test:e2e:headed

# Run with Playwright UI (recommended for development)
npm run test:e2e:ui
```

**Coverage**: ~57 test cases covering:
- Authentication & authorization
- Clients & contacts management
- Projects creation and management
- Tasks & milestones (Kanban workflow)
- Meetings with task creation
- AI Assets library and linking
- Status & reporting dashboards
- Accessibility (WCAG 2.1 Level AA)

**Documentation**: See [pmo/docs/e2e-coverage.md](pmo/docs/e2e-coverage.md) for complete test coverage details.

### Accessibility Testing

Automated accessibility testing is integrated into the E2E test suite using axe-core.

```bash
# Run accessibility tests
npx playwright test accessibility
```

Tests check for WCAG 2.1 Level AA compliance on key pages. See [pmo/docs/accessibility-report-m8.md](pmo/docs/accessibility-report-m8.md) for details.

### CI/CD

All tests run automatically in GitHub Actions on every push and pull request:

1. **lint-test** job: Linting, unit tests, build
2. **e2e** job: E2E tests with Playwright

## Deployment & Environments

The platform supports three environments: development, staging, and production.

### Development (Local)

See [Quickstart](#quickstart) section above.

### Staging & Production

**Recommended Stack**:
- **Frontend**: Vercel (static hosting)
- **Backend**: Render Web Service (Node.js)
- **Database**: Render Managed PostgreSQL

**Documentation**:
- **Deployment Guide**: [Docs/deploy-notes-render-vercel.md](Docs/deploy-notes-render-vercel.md) - Step-by-step deployment instructions
- **Environments**: [pmo/docs/environments.md](pmo/docs/environments.md) - Environment configuration and management
- **Backups**: [pmo/docs/db-backup-restore.md](pmo/docs/db-backup-restore.md) - Database backup and restore procedures

**Quick Deploy Checklist**:
- [ ] Configure environment variables in Render and Vercel
- [ ] Set up PostgreSQL database on Render
- [ ] Deploy API to Render with health check at `/api/healthz`
- [ ] Deploy frontend to Vercel with `VITE_API_BASE_URL` pointing to API
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Seed initial data if needed
- [ ] Verify health checks pass
- [ ] Run smoke tests

## Documentation

### For Developers

- **Testing**:
  - [E2E Test Coverage](pmo/docs/e2e-coverage.md) - Comprehensive E2E test documentation
  - [Accessibility Report](pmo/docs/accessibility-report-m8.md) - Accessibility testing guide
  - [Performance Report](pmo/docs/performance-report-m8.md) - Performance optimization guide

- **Deployment**:
  - [Environments](pmo/docs/environments.md) - Environment configuration
  - [Deploy Notes](Docs/deploy-notes-render-vercel.md) - Render + Vercel deployment
  - [Backup & Restore](pmo/docs/db-backup-restore.md) - Database operations

- **Implementation**:
  - [M8 Hardening Notes](pmo/docs/m8-hardening-notes.md) - Production readiness implementation
  - [AI Coding Notes](Docs/ai-coding-notes.md) - Quick reference for AI assistants
  - [Product Requirements](Docs/ai-consulting-pmo-product-requirements.md) - Feature specifications
  - [Implementation Codex](Docs/AI_Consulting_PMO_Implementation_Codex.md) - Technical architecture

For fast onboarding tips, see `Docs/ai-coding-notes.md`, which summarizes key entry points, required env vars, and common commands for both apps.

For architecture, data model, and feature scope details, refer to the linked product requirements and implementation codex in the `Docs` directory.

## Modular Architecture

The platform supports modular feature configuration, allowing customers to enable only the features they need.

### Available Modules

| Module | Description |
|--------|-------------|
| **core** | Authentication, dashboard (always required) |
| **tasks** | Personal task management with Kanban board |
| **clients** | Client CRM with contacts |
| **projects** | Project management with milestones and meetings |
| **assets** | AI asset library (prompts, workflows, datasets) |
| **marketing** | Marketing content, campaigns, publishing |
| **sales** | Lead management and sales pipeline |
| **admin** | User administration |

### Configuration

Enable modules via environment variables:

```bash
# Enable specific modules
ENABLED_MODULES=core,tasks,clients,projects

# Or use a preset
MODULE_PRESET=project-management
```

### Presets

| Preset | Description | Modules |
|--------|-------------|---------|
| `full` | All features | core, tasks, clients, projects, assets, marketing, sales, admin |
| `project-management` | Project delivery focus | core, tasks, clients, projects |
| `marketing-focus` | Content marketing | core, clients, marketing |
| `sales-focus` | Business development | core, clients, projects, sales |
| `minimal` | Simple task tracking | core, tasks |

For implementation details, see [MODULARIZATION_PLAN.md](MODULARIZATION_PLAN.md).
