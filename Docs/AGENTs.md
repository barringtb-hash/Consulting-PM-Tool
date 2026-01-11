# AGENT.md – AI Agent Guide for the AI CRM Platform

> **Note**: For comprehensive AI assistant documentation including architecture patterns, code conventions, key file references, and common tasks, see [../CLAUDE.md](../CLAUDE.md).

## 1. Purpose

This file describes how automated coding agents, AI assistants, and human contributors should work with this repository.

The goal is to:

- Preserve a clean, maintainable architecture.
- Keep behavior consistent with the product requirements and Implementation Codex.
- Avoid breaking local development, CI, or deployment.

Whenever you work on this repo as an agent, read [CLAUDE.md](../CLAUDE.md) first, then this file and the implementation spec before making substantial changes.

Recommended companion docs:

- [CLAUDE.md](../CLAUDE.md) - Comprehensive onboarding guide for AI assistants
- `CRM-TRANSFORMATION-PLAN.md` - CRM architecture and implementation plan
- `TECHNICAL-DEBT-REPORT.md` - Technical debt tracking (28/28 resolved)
- `AI_Consulting_PMO_Implementation_Codex.md` - Technical architecture
- `deploy-notes-render-vercel.md` - Deployment guide
- `prisma/schema.prisma` - Database schema

---

## 2. Project overview

This project is an **AI CRM Platform** - a comprehensive multi-tenant CRM SaaS platform with AI-powered modules. It evolved from a consulting PMO tool into a full CRM system.

Core goals:

- **CRM Core**: Accounts, Contacts, Opportunities, Pipelines, Activities
- **Multi-Tenant**: Row-level tenant isolation with automatic filtering
- **Lead Conversion**: Convert leads to Accounts + Opportunities with automatic pipeline creation
- **PMO Module** (optional): Project tracking, tasks, milestones, meetings
- **AI Tools**: Chatbot with multi-channel support, Document Analyzer with OCR

Key CRM entities:
- **Account**: Company/organization with hierarchy, health scores, engagement tracking
- **Opportunity**: Sales pipeline with customizable stages, weighted forecasting
- **Activity**: Unified timeline (calls, emails, meetings, tasks, notes)
- **Project**: Delivery/work tracking only (pipeline fields moved to Opportunity)

High-level stack:

- **Frontend**: React + TypeScript, Vite, React Router, React Query, Tailwind (or another component library).
- **Backend**: Node.js + TypeScript, Express, zod for validation, Prisma as ORM.
- **Database**: PostgreSQL.
- **Infra**: GitHub Actions for CI; Render (API + Postgres) and Vercel (web) are the default deployment targets.

---

## 3. Repository layout (expected)

The repository is expected to follow a monorepo-style structure:

```text
/pmo
  /apps
    /web          # React + TS (Vite SPA)
    /api          # Express + TS (REST API)
  /prisma         # Prisma schema and migrations
  /packages       # Shared code (e.g., types, UI) – optional
  /docs           # Documentation – optional
  .github/workflows
  README.md
  AGENT.md
```

If the repo layout differs slightly, preserve the same logical separation:

- Frontend app
- Backend API
- Database schema/migrations
- Shared libraries
- CI configuration

---

## 4. Conventions and rules for agents

When modifying this repo as an AI agent:

1. **Respect TypeScript strictness**
   - Keep types accurate.
   - Extend or refine existing types instead of bypassing with `any`.
   - Prefer zod schemas for runtime validation.

2. **Follow the existing architecture**
   - Do not introduce new frameworks or major dependencies without an explicit task to do so.
   - Keep the separation of concerns:
     - Controllers/routers handle HTTP and validation.
     - Services handle business logic.
     - Prisma is used only in the data access layer.

3. **Avoid leaking secrets**
   - Never commit real secrets or passwords.
   - Modify `.env.example` files when needed, but do not add `.env` to version control.

4. **Keep changes small and coherent**
   - Prefer small, focused changes that are easy to review.
   - If a feature touches multiple layers (API + frontend), keep the changes consistent and well documented.

5. **Update tests and docs**
   - When you change behavior, add or update tests.
   - Update relevant documentation sections, including this file if the process changes.

6. **Preserve API contracts**
   - Do not change request/response shapes for public endpoints unless the task explicitly requires it.
   - If you must change a contract, update:
     - zod schemas
     - TypeScript types
     - API handlers
     - Frontend calls
     - Tests and documentation

---

## 5. Backend guidelines (`/apps/api`)

### 5.1 Structure

Recommended structure inside `apps/api`:

```text
/apps/api
  src/
    index.ts          # App entry, server bootstrap
    config/           # Config, environment
    crm/              # CRM module (Accounts, Opportunities, Activities)
      routes/         # CRM API routes
      services/       # CRM business logic
    routes/           # Express routers (auth, clients, projects, tasks, etc.)
    services/         # Business logic for each domain
    prisma/           # Prisma client instance
    middleware/       # Auth, error handling, logging, tenant
    validation/       # zod schemas for request/response validation
    modules/          # Feature modules (chatbot, document-analyzer)
    tenant/           # Multi-tenant context and middleware
    scripts/          # Migration scripts for data conversion
    utils/            # Shared utilities
```

Agents should:

- Add new routes under the appropriate domain router (e.g., `routes/projects.ts`).
- Define validation schemas in `schemas` and reuse them.
- Put business logic in `services` rather than directly in route handlers.

### 5.2 Database and Prisma

- Prisma schema is defined in `prisma/schema.prisma`.
- To apply changes locally, the recommended flow is:

  ```bash
  # from the repo root or apps/api
  npx prisma migrate dev --name <change-name>
  npx prisma generate
  ```

- When adding or modifying models:
  - Update `schema.prisma`.
  - Create a migration with a descriptive name.
  - Ensure existing data and relations are not accidentally destroyed unless explicitly required.

### 5.3 API design

- Use JSON for all responses.
- Use consistent error format, e.g.:

  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Invalid input", "details": {...} } }
  ```

- Validate all request bodies and query parameters with zod.
- Keep endpoints aligned with the Implementation Codex, including:

  **Auth:**
  - `/auth/login`, `/auth/logout`, `/auth/me`

  **CRM (under `/api/crm/`):**
  - `/crm/accounts`, `/crm/accounts/:id`, `/crm/accounts/stats`
  - `/crm/opportunities`, `/crm/opportunities/:id`, `/crm/opportunities/pipeline-stats`
  - `/crm/activities`, `/crm/activities/:id`, `/crm/activities/my/upcoming`

  **PMO Module:**
  - `/clients`, `/clients/:id`, and `/clients/:id/contacts`
  - `/projects`, `/projects/:id`, `/projects/from-template/:templateId`
  - `/tasks`, `/projects/:id/tasks`, `/tasks/:id/move`
  - `/milestones`, `/projects/:id/milestones`
  - `/meetings`, `/meetings/:id/tasks-from-selection`
  - `/assets`, `/projects/:projectId/assets/:assetId/link`
  - `/projects/:id/status`

  **Lead Conversion:**
  - `/leads/:id/convert` - Converts lead to Account + Opportunity

---

## 6. Frontend guidelines (`/apps/web`)

### 6.1 Structure

A typical structure:

```text
/apps/web
  src/
    main.tsx
    App.tsx
    routes/          # Route-level components / pages
    components/      # Reusable UI components
    api/             # API client wrappers, React Query hooks
    hooks/           # Custom hooks
    types/           # Shared front-end types
    styles/          # Global styles, Tailwind config
```

Agents should:

- Use React Router for navigation.
- Use React Query for data fetching and caching.
- Use forms based on React Hook Form + zod, if available.
- Keep UI consistent with existing patterns (spacing, typography, components).

### 6.2 Data fetching

- All network calls should go through a central API layer (e.g., `api/client.ts`) that uses:

  - A configured `axios` or `fetch` wrapper.
  - `import.meta.env.VITE_API_BASE_URL` as the base URL.

- Prefer React Query hooks like:

  ```ts
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api.getProject(projectId),
  });
  ```

- For mutations, use `useMutation` and invalidate relevant queries on success.

---

## 7. Local development and commands

These commands may live either in the root `package.json` or the individual app directories.

### 7.1 Backend (API)

From `/apps/api`:

- Install dependencies:

  ```bash
  npm install
  ```

- Run the dev server:

  ```bash
  npm run dev
  ```

- Run tests (if configured):

  ```bash
  npm test
  ```

- Run Prisma commands:

  ```bash
  npx prisma migrate dev --name init
  npx prisma generate
  ```

### 7.2 Frontend (Web)

From `/apps/web`:

- Install dependencies:

  ```bash
  npm install
  ```

- Run the dev server (Vite):

  ```bash
  npm run dev
  ```

- Run tests (if configured):

  ```bash
  npm test
  ```

Agents should avoid changing script names without updating documentation and CI workflows.

---

## 8. Testing and CI

### 8.1 Testing expectations

When implementing or modifying features:

- Add or update **unit tests** for:
  - Backend services and helpers.
  - Complex frontend components or hooks.

- Add or update **integration tests** for:
  - Core API flows (auth, clients, projects, tasks, status).

- Maintain **E2E tests** for:
  - The main “happy path” from login to project creation, meeting notes, task creation from selection, asset linking, and status view.

### 8.2 CI (GitHub Actions)

Typical jobs:

- `lint-and-typecheck`
- `test-api`
- `test-web`
- `e2e`
- `build`

Agents must:

- Ensure new code passes existing CI checks.
- Update workflow files only when necessary and in a minimal, well-documented way.

---

## 9. Database migration policy

- All schema changes must go through Prisma migrations.
- Never edit generated migration SQL files by hand unless explicitly required.
- Always commit:
  - `prisma/schema.prisma`
  - `prisma/migrations/*` (generated by Prisma)

If a schema change would break existing data, document the impact and required transition steps.

---

## 10. Safe change workflow for agents

When you (as an AI agent) receive a task on this repo:

1. **Understand the task**
   - Read the relevant sections of the Implementation Codex and this AGENT file.
   - Inspect existing code in affected areas.

2. **Plan the change**
   - Decide which modules, files, and layers will be touched.
   - Confirm whether any API contracts or DB schema need to change.

3. **Implement incrementally**
   - Make small, coherent changes.
   - Keep PRs focused on one feature or fix when possible.

4. **Run checks**
   - Run tests where available.
   - If adding new commands, ensure they work in a fresh clone scenario.

5. **Document**
   - Update comments and docs if behavior changes.
   - Include a clear summary of changes, affected endpoints, and any migration steps in the PR description.

---

## 11. Non-goals

Unless explicitly requested:

- Do not migrate the stack to a different framework (e.g., Next.js, NestJS).
- Do not introduce heavy new dependencies for minor problems.
- Do not redesign the entire UI/UX.
- Do not change deployment targets (Render/Vercel) or database vendor.

---

By following this AGENT guide, contributors and AI assistants can make consistent, safe, and predictable changes to the AI Consulting PMO Platform codebase.
