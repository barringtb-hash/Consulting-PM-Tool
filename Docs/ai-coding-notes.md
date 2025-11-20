# AI coding notes for the PMO monorepo

A quick-reference map for future AI contributors working in this repository.

## Orientation and commands
- The npm workspace lives in `pmo/`; install dependencies and run shared scripts from that directory (e.g., `npm install`, `npm run lint`, `npm run test`).
- Create an API `.env` by copying `Docs/api.env.example` into `pmo/apps/api/.env`, then run Prisma migrations from `/pmo` with `npx prisma migrate dev --name init` (uses SQLite `file:./dev.db` by default).
- Follow `pmo/AGENT.md` for repo-wide guidance, including running lint/tests when touching TypeScript files.
- CI-critical scripts live at the workspace root `pmo/package.json` (lint, test, build, format) and each app has its own `package.json` for dev/start commands.
- Local dev commands from `/pmo`:
  - API: `npm run dev --workspace pmo-api` (requires `.env` above)
  - Web: `npm run dev --workspace pmo-web`
  - API tests: `npm run test --workspace pmo-api` (Vitest + Prisma SQLite reset per worker)
  - Web tests: `npm run test --workspace pmo-web` (Vitest + Testing Library)
- Seed data: `npx prisma migrate dev --name init` (or `npx prisma db seed`) hashes and loads sample users. Login credentials:
  - Admin: `admin@pmo.test` / `AdminDemo123!`
  - Consultants: `avery.chen@pmo.test`, `priya.desai@pmo.test`, `marco.silva@pmo.test` all use `PmoDemo123!`

## Backend (apps/api)
- Entry point: `apps/api/src/index.ts` boots the Express app constructed in `apps/api/src/app.ts`, which attaches auth, clients, contacts, documents, projects, and health routers.
- Required env vars (see `Docs/api.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, plus optional `PORT`/`NODE_ENV`.
- Auth: `apps/api/src/auth/auth.routes.ts` exposes `/auth/login`, `/auth/logout`, and `/auth/me`; login issues an httpOnly `token` cookie via `signToken` and `requireAuth` in `auth.middleware.ts` checks it to set `req.userId`.
- Validation: Zod schemas live under `apps/api/src/validation/` (e.g., `client.schema.ts`); routes parse input with `safeParse` and return structured errors when invalid.
- Data layer: Prisma client is configured in `apps/api/src/prisma/client.ts` against the shared `prisma/schema.prisma` models (User, Client, Contact, Project with owner/client relations, Document with client/project/owner links).
- Tests: `apps/api/test/setup.ts` provisions a per-worker SQLite database, runs `prisma migrate reset`, and generates the client before Vitest cases covering auth, clients, contacts, and password hashing.

## Frontend (apps/web)
- Bootstrap: `apps/web/src/main.tsx` wires `AuthProvider`, React Router, and TanStack Query via `QueryClientProvider` before rendering `App`.
- Routing/UI shell: `apps/web/src/App.tsx` defines protected routes for dashboard, clients, client intake, project setup, and project dashboard, and wraps them with `ClientProjectProvider` for cross-page state.
- API access: fetch helpers live in `apps/web/src/api`, with `http.ts` enforcing `credentials: 'include'` requests and typed wrappers for auth, clients, contacts, documents, and projects.
- Shared state: `pages/ClientProjectContext.tsx` stores the currently selected client/project for the multi-step intake/project flow.
- Component entry points for the M3 flow:
  - Client intake form: `pages/ClientIntakePage.tsx`
  - Project setup wizard: `pages/ProjectSetupPage.tsx`
  - Project dashboard + document modal: `pages/ProjectDashboardPage.tsx`

## Data model snapshot (prisma/schema.prisma)
- `User` owns projects/documents and stores name/email/passwordHash/timezone.
- `Client` captures industry, company size, timezone, AI maturity, notes, and maintains contacts/projects/documents.
- `Contact` belongs to a client and has a unique email per client; cascade deletes on client removal.
- `Project` links to a client and owner with status enums and optional start/end dates.
- `Document` ties to client and optional project with owner, type enum, filename, and URL fields plus timestamps.
