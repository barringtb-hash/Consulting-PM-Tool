# Render Platform Guide for AI Coding

## Overview
Render is a cloud platform that builds and deploys web services directly from linked Git repositories. On each push to the configured branch, Render rebuilds your service and hosts it at an onrender.com subdomain, with options for custom domains and private networking.

Supported runtimes include Node.js (Express), Python (Django/FastAPI), Go, Ruby, Rust, and other languages, plus Docker images.

Key capabilities:
- Automatic builds and deploys per push; failed builds keep the previous version running (zero downtime).
- Free managed TLS certificates and custom domains.
- Environment configuration for secrets, disks, health checks, and scaling.
- Persistent disks, WebSocket support, edge caching, and private networking.
- Managed PostgreSQL and Key-Value stores, background workers, and cron jobs (up to 12 hours).
- Long-running HTTP responses (up to ~100 minutes) useful for AI workloads.

## Internal deployment workflow (Consulting-PM-Tool)
The backend API and PostgreSQL database run on Render; the frontend deploys separately on Vercel.

1. **Set up the database on Render**
   - Create a PostgreSQL instance and save its connection string as `DATABASE_URL`.
   - Migrations run automatically during the API build step (no manual intervention needed).

2. **Set up the API service**
   - Create a Web Service from the GitHub repo pointing to `/apps/api`.
   - Build: `cd apps/api && npm install && npm run build` (includes `prisma migrate deploy`).
   - Start: `cd apps/api && npm run start`.
   - Configure environment variables:
     - `DATABASE_URL` – Render Postgres connection string.
     - `JWT_SECRET` – long random secret for JWT auth.
     - `CORS_ORIGIN` – allowed web origin (e.g., Vercel URL).
     - `NODE_ENV=production`.
     - `PORT` – optional; Render injects this, but the app must listen on `process.env.PORT`.
   - Deploy; Render builds and starts automatically. Migrations run during the build step.

3. **Set up the web app on Vercel**
   - Create a project from the repo; set root to `pmo`.
   - Build settings: install `npm install`; build `npm run build --workspace pmo-web`; output `apps/web/dist`.
   - Set `VITE_API_BASE_URL` to the Render API base URL (e.g., `https://your-api.onrender.com/api`). The frontend falls back to `/api` when empty.

4. **Local development**
   - Create env files: copy `Docs/api.env.example` to `apps/api/.env` and `apps/web/.env.example` to `apps/web/.env`.
   - From `/pmo`, run in separate terminals:
     - `npm run dev --workspace pmo-api`
     - `npm run dev --workspace pmo-web`
   - Visit `http://localhost:5173` for the web app.

5. **Deployment checklist**
   - Render Postgres created; `DATABASE_URL` configured.
   - API service deployed with env vars (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `NODE_ENV=production`, optional `PORT`, `CORS_ORIGIN` to Vercel URL).
   - Vercel project root `pmo`; build `npm run build --workspace pmo-web`; output `apps/web/dist`.
   - `VITE_API_BASE_URL` set to the Render API base.

## Render features useful for AI projects
- Broad runtime support and Git-based auto-deploys keep backends updated on every push.
- Zero-downtime deploys with health checks and deploy logs.
- Free TLS, custom domains, and private networking for secure services.
- Manual/automatic scaling with persistent disks for stateful AI workloads.
- Managed Postgres and KV stores reduce ops overhead.
- Background workers and cron jobs support long-running pipelines (up to 12 hours) and HTTP responses up to ~100 minutes.
- Full-stack coverage enables hosting APIs, databases, and supporting services alongside AI tasks.

## When to choose Render vs Vercel
- **Choose Render** for complex/stateful backends, multi-service architectures, long-running tasks, or when you need persistent disks and managed databases.
- **Choose Vercel** for frontend-centric or Next.js apps that benefit from optimized edge delivery and serverless functions (noting shorter timeouts and limited cron options).
- **Use both** by hosting the API/database on Render and the frontend on Vercel (current project setup). The frontend calls the Render API via `VITE_API_BASE_URL`, while CORS on the API allows the Vercel domain.

## Best practices for AI projects on Render
- Store secrets (e.g., `JWT_SECRET`, `DATABASE_URL`) and `CORS_ORIGIN` in Render env settings; do not commit them.
- Bind the server to `process.env.PORT || 4000` and host `0.0.0.0` so Render can route traffic.
- Migrations run automatically during the build step (`npm run build` includes `prisma migrate deploy`). For manual migrations, run `npx prisma migrate deploy` via Render shell.
- Use auto-scaling and persistent disks for workloads needing burst capacity or durable storage; leverage generous timeouts for long-running AI jobs.
- Pair with Vercel for the frontend, passing `VITE_API_BASE_URL` to point at the Render-hosted API.

This guide consolidates internal deployment steps with Render platform features to support reliable AI-focused services.
