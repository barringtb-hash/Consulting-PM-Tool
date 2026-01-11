# M8 Hardening & Production Readiness - Notes

**Date Started**: 2025-11-21
**Branch**: claude/add-e2e-tests-accessibility-01LC57wBzsGZTtVXuyLZy5F1

---

## Current State Assessment

### Testing Infrastructure

**Unit Tests**:

- ✅ Vitest configured for both API and web apps
- ✅ API has 9 test files covering routes, middleware, and services:
  - `auth.routes.test.ts`, `auth.middleware.test.ts`
  - `clients.routes.test.ts`, `contacts.routes.test.ts`
  - `task.routes.test.ts`, `milestone.routes.test.ts`
  - `meetings.routes.test.ts`, `meetings.service.test.ts`
  - `password.test.ts`
- ✅ Web has 6 test files covering key pages and components:
  - `LoginPage.test.tsx`, `ClientsPage.test.tsx`, `ClientDetailsPage.test.tsx`
  - `ProtectedRoute.test.tsx`, `MeetingDetailPage.test.tsx`, `ProjectMeetingsPanel.test.tsx`
- ✅ CI runs unit tests on every PR/push

**E2E Tests**:

- ❌ Playwright NOT installed
- ❌ No `playwright.config.ts`
- ❌ No E2E test files
- ❌ CI does not run E2E tests

### CI/CD Pipeline

**Current CI** (`.github/workflows/ci.yml`):

- Runs on: push, pull_request
- Jobs:
  1. Lint (ESLint)
  2. API tests (Vitest with PostgreSQL service)
  3. Web tests (Vitest)
  4. Build (currently a placeholder echo)
- PostgreSQL 16 service available in CI
- Node.js 20

**Deployment**:

- ❌ No automated deployment from CI
- ✅ Documentation exists for manual deployment (Render + Vercel)
- ❌ No staging environment defined
- ❌ No smoke tests after deployment

### Environment Configuration

**Current Environments**:

- **dev**: Local only (documented in README)
- **prod**: Manual deployment to Render (API) + Vercel (web)
- ❌ No staging environment

**Environment Variables**:

- API: `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `DATABASE_URL`
- Web: `VITE_API_BASE_URL`
- `.env.example` files exist in both apps/api and apps/web

### Accessibility

- ❌ No axe-core or accessibility testing tools
- ❌ No accessibility tests or scans
- ❌ No documented accessibility standards

### Performance

- ❌ No Lighthouse CI or performance testing
- ❌ No bundle analysis
- ❌ No performance budgets
- Vite is used for bundling (good baseline)

### Observability & Reliability

**Logging**:

- ❌ No structured logging library (pino/winston)
- ❌ No error tracking (Sentry, etc.)

**Monitoring**:

- ❌ No health check endpoint
- ❌ No uptime monitoring
- ❌ No metrics collection

**Backups**:

- ❌ No documented backup strategy
- ❌ No restore procedures
- Uses PostgreSQL (Render provides backups, but not documented)

### Monorepo Structure

```
pmo/
├── apps/
│   ├── api/         (Express + TypeScript, port 4000)
│   └── web/         (Vite + React + TypeScript, port 5173)
├── packages/        (Shared code)
├── prisma/          (Schema + migrations + seed)
├── docs/            (Documentation - currently empty except .gitkeep)
└── scripts/         (Build scripts)
```

**Key Scripts** (from `/pmo`):

- `npm run dev --workspace pmo-web` - Start frontend dev server
- `npm run dev --workspace pmo-api` - Start backend dev server
- `npm run lint` - Lint all workspaces
- `npm run test` - Run all workspace tests
- `npm run format` - Prettier formatting

---

## M8 Implementation Plan

### Phase 1: E2E Testing (M8-T1 through M8-T4)

**T1: Repo & CI Recon** ✅

- Status: COMPLETE
- This document created

**T2: E2E Scaffolding & Happy-Path**

- Install Playwright in root workspace
- Create `playwright.config.ts`
- Add scripts: `e2e`, `e2e:headed`
- Implement basic happy-path test covering:
  - Login → Create Client → Create Project → Add Meeting → Create Task from Notes

**T3: Full E2E Coverage for M0-M7**

- Create comprehensive test suites:
  - `e2e/auth.spec.ts` - M1 Auth flows
  - `e2e/clients.spec.ts` - M2 Clients & Contacts
  - `e2e/projects.spec.ts` - M3 Projects
  - `e2e/tasks-milestones.spec.ts` - M4 Tasks & Milestones
  - `e2e/meetings.spec.ts` - M5 Meetings
  - `e2e/ai-assets.spec.ts` - M6 AI Assets
  - `e2e/status-reporting.spec.ts` - M7 Status & Reporting
- Create `docs/e2e-coverage.md` documenting all covered flows

**T4: E2E CI Integration**

- Update `.github/workflows/ci.yml` to run E2E tests
- Install Playwright browsers in CI
- Fix any flaky tests
- Ensure 3 consecutive green runs

### Phase 2: Accessibility (M8-T5)

- Install `axe-core` and Playwright axe integration
- Create `e2e/_helpers/accessibility.ts` with scan helper
- Run scans on key pages (dashboard, clients, projects, tasks, assets)
- Fix critical and serious violations
- Document findings in `docs/accessibility-report-m8.md`

### Phase 3: Performance (M8-T6)

- Run Lighthouse on key authenticated pages
- Document baseline metrics in `docs/performance-report-m8.md`
- Apply optimizations:
  - Route-based code splitting with React.lazy
  - Check for N+1 queries
  - Add database indexes
  - Optimize images/assets
- Target: Lighthouse Performance ≥ 80

### Phase 4: Production Deploy (M8-T7)

- Define staging environment
- Create `docs/environments.md`
- Automate deployment pipeline:
  - Build + migrate + deploy workflow
  - Smoke tests post-deploy
- Update environment variable management

### Phase 5: Observability (M8-T8)

- Add health check endpoint: `GET /healthz`
- Implement structured logging (pino)
- Configure DB backup automation
- Set up uptime monitoring
- Document restore procedure in `docs/db-backup-restore.md`

### Phase 6: Documentation & Handoff (M8-T9)

- Update README with testing and deployment sections
- Verify all DoD criteria met
- Final smoke test of entire system

---

## Implementation Progress

### 2025-11-21: M8-T2 & T3 - E2E Testing Infrastructure ✅

**Accomplished**:

1. ✅ Installed Playwright (`@playwright/test@^1.56.1`)
2. ✅ Created `playwright.config.ts` with:
   - Auto-start of API and web servers via `webServer` configuration
   - Chromium browser testing (Firefox/WebKit commented out but available)
   - Global authentication setup using `e2e/global.setup.ts`
   - Authenticated state saved to `e2e/.auth/user.json`
   - Proper timeouts and retry logic for CI
3. ✅ Added npm scripts to `package.json`:
   - `npm run test:e2e` - Run E2E tests headless
   - `npm run test:e2e:headed` - Run with visible browser
   - `npm run test:e2e:ui` - Run with Playwright UI
4. ✅ Created global authentication setup (`e2e/global.setup.ts`)
   - Logs in once before all tests using `admin@pmo.test`
   - All tests inherit authenticated state
5. ✅ Created comprehensive E2E test suites:
   - `e2e/auth.spec.ts` - 6 tests for M1 Authentication
   - `e2e/clients.spec.ts` - 7 tests for M2 Clients & Contacts
   - `e2e/projects.spec.ts` - 6 tests for M3 Projects
   - `e2e/tasks-milestones.spec.ts` - 7 tests for M4 Tasks & Milestones
   - `e2e/meetings.spec.ts` - 8 tests for M5 Meetings
   - `e2e/ai-assets.spec.ts` - 10 tests for M6 AI Assets
   - `e2e/status-reporting.spec.ts` - 11 tests for M7 Status & Reporting
   - `e2e/happy-path.spec.ts` - 2 end-to-end workflow tests
   - **Total: ~57 E2E test cases**
6. ✅ Created `docs/e2e-coverage.md` documenting all covered flows
7. ✅ Updated `.gitignore` to exclude:
   - `pmo/e2e/.auth/` (authentication state)
   - `pmo/test-results/` (test results)
   - `pmo/playwright-report/` (HTML reports)

**Test Coverage Highlights**:

- All core user journeys from M0-M7 covered
- Tests use flexible selectors with graceful degradation
- Dynamic test data using timestamps to avoid conflicts
- Tests can run repeatedly without cleanup
- Comprehensive coverage of CRUD operations across all modules

### 2025-11-21: M8-T4 - CI Integration ✅

**CI Workflow Updates** (`.github/workflows/ci.yml`):

Added new `e2e` job that:

1. ✅ Runs after `lint-test` job passes (using `needs: lint-test`)
2. ✅ Spins up PostgreSQL 16 service
3. ✅ Sets environment variables for test database
4. ✅ Installs Playwright browsers (`npx playwright install --with-deps chromium`)
5. ✅ Creates API `.env` file with test database connection
6. ✅ Runs Prisma migrations (`npx prisma migrate deploy`)
7. ✅ Seeds test database with test accounts
8. ✅ Runs E2E tests (`npm run test:e2e`)
9. ✅ Uploads Playwright HTML report as artifact (30-day retention)

**Environment Configuration**:

```yaml
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/pmo_test?schema=public
JWT_SECRET: test-jwt-secret-for-ci
JWT_EXPIRES_IN: 1h
BCRYPT_SALT_ROUNDS: 10
NODE_ENV: test
```

**CI Job Flow**:

```
1. lint-test (runs lint, API tests, web tests, build)
   ↓
2. e2e (runs Playwright E2E tests)
   ↓
3. Playwright report artifact uploaded
```

**Flakiness Mitigation**:

- Playwright's built-in auto-waiting for elements
- Proper health checks for API (`/api/healthz`) and web servers
- Retry logic (2 retries in CI, 0 locally)
- Sequential execution in CI (`workers: 1`)
- Deterministic test data using timestamps
- Independent tests (no shared state)

**Known Considerations**:

- E2E tests will only run if `lint-test` job passes
- Tests run in Chromium only in CI (can expand to Firefox/WebKit)
- Playwright report available as downloadable artifact
- Tests use seeded accounts from `prisma/seed.ts`

## Notes & Decisions

### 2025-11-21: Initial Assessment

**Key Findings**:

1. Strong unit test coverage already exists for both API and web
2. CI pipeline is functional but missing E2E and deployment automation
3. Deployment process is documented but manual
4. No accessibility or performance testing in place
5. Observability and backup systems need to be implemented

**Risks**:

- No E2E tests means core user journeys aren't validated end-to-end
- Manual deployment increases risk of configuration errors
- Lack of staging environment means no pre-production validation
- No automated backups could lead to data loss

**Quick Wins**:

- Playwright setup should be straightforward (monorepo structure is clean)
- Existing Vitest setup shows team is comfortable with testing
- Vite gives us good baseline performance
- PostgreSQL in CI means we can run realistic E2E tests

---

## Appendix: Module Coverage Requirements

Based on M0-M7 implementation:

- **M0**: Foundation (DB, Auth scaffolding)
- **M1**: Authentication & Authorization
- **M2**: Clients & Contacts Management
- **M3**: Projects Management
- **M4**: Tasks & Milestones (Kanban view, Global tasks)
- **M5**: Meetings (Notes, task creation from notes)
- **M6**: AI Assets (Templates, client-specific, linking to projects)
- **M7**: Status & Reporting (Project health, RAG status, dashboard)

Each module needs E2E coverage validating:

- Happy path works end-to-end
- Data persistence across page navigation
- Integration between modules (e.g., meeting → tasks → project)
