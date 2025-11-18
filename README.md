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
   npm run lint    # Lint TypeScript/JavaScript sources
   npm run test    # Run workspace test suites
   npm run build   # Build artifacts (placeholder at present)
   npm run format  # Prettier formatting across the repo
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
