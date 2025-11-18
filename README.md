# AI Consulting PMO Platform

The AI Consulting PMO Platform is a monorepo for a React + TypeScript frontend and a Node.js + TypeScript API that together deliver a lightweight PMO tailored to solo AI consultants. Dive into the product requirements and technical plan in [Docs/ai-consulting-pmo-product-requirements.md](Docs/ai-consulting-pmo-product-requirements.md) and [Docs/AI_Consulting_PMO_Implementation_Codex.md](Docs/AI_Consulting_PMO_Implementation_Codex.md).

## Monorepo layout
The `pmo` directory is an npm workspace with the following structure:

- `pmo/apps/web`: Vite-powered React + TypeScript SPA frontend
- `pmo/apps/api`: Express + TypeScript API server
- `pmo/prisma`: Prisma schema and database assets
- `pmo/packages`: Shared packages (types, UI, and utilities)
- `.github/workflows`: Continuous integration definitions

## Quickstart
1. Install dependencies from the workspace root:
   ```bash
   cd pmo
   npm install
   ```
2. Set up and run the API (from `/pmo/apps/api`):
   ```bash
   cd pmo/apps/api
   cp .env.example .env
   # update DATABASE_URL to point to your Postgres instance and set JWT_SECRET
   npx prisma migrate dev --name init_postgres_mvp
   npx prisma db seed
   npm run dev
   ```
   The API listens on port 4000 by default and exposes routes under `/api` (e.g., `/api/health`).
3. Start the frontend (from `/pmo/apps/web`):
   ```bash
   cd pmo/apps/web
   cp .env.example .env
   # ensure VITE_API_BASE_URL matches your API base, e.g., http://localhost:4000/api
   npm run dev
   ```
4. Common scripts from `/pmo`:
   ```bash
   npm run lint    # Lint TypeScript/JavaScript sources
   npm run test    # Run workspace test suites
   npm run build   # Build artifacts (placeholder at present)
   npm run format  # Prettier formatting across Markdown and source files
   ```

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

## Deployment overview
- Runtime code lives under the `pmo/` workspace; configure Vercel or other hosts to treat `pmo` as the project root when building the web app.
- For step-by-step Render + Vercel guidance (including required environment variables), see [Docs/deploy-notes-render-vercel.md](Docs/deploy-notes-render-vercel.md).

For fast onboarding tips, see `Docs/ai-coding-notes.md`, which summarizes key entry points, required env vars, and common commands for both apps.

For architecture, data model, and feature scope details, refer to the linked product requirements and implementation codex in the `Docs` directory.
