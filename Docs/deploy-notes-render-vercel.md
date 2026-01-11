# Deployment Notes – Render (API + Postgres) and Vercel (Web)

This guide assumes:
- API + PostgreSQL hosted on **Render**
- React web app hosted on **Vercel**
- Prisma as the ORM

---

## 1. Set up the database on Render

1. In Render, create a **PostgreSQL** instance.
2. Copy the connection string and plug it into `DATABASE_URL` in your `.env` or Render environment.
   - Example: `postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public`

---

## 2. Set up the API service on Render

1. Create a new **Web Service** from your GitHub repo pointing to the `/apps/api` directory.
2. Build command:

   ```bash
   cd pmo && npm install && npm run prisma:migrate:deploy && cd apps/api && npm run build
   ```

   > **Note**: Migrations must run from the workspace root (`pmo/`) where `prisma.config.ts` is located. The `prisma:migrate:deploy` script handles this correctly. The API build step only compiles TypeScript.

3. Start command:

   ```bash
   cd apps/api && npm run start
   ```

4. Add environment variables in Render (Settings → Environment):
   - `DATABASE_URL` – value from the Render Postgres instance.
   - `JWT_SECRET` – a long random secret.
   - `CORS_ORIGIN` – your web origin (e.g. `http://localhost:5173` in dev, `https://your-app.vercel.app` in prod).
   - `NODE_ENV` – `production`.
   - `PORT` – Render usually injects this automatically; ensure your app listens on `process.env.PORT`.

5. Migrations run automatically during the build phase of each deploy. If you need to manually trigger migrations:
   - Open a shell on the Render service and run:

     ```bash
     cd pmo
     npm run prisma:migrate:deploy
     ```

   - Or trigger a redeploy, which will run migrations as part of the build step.

---

## 3. Set up the web app on Vercel

1. Create a new Vercel project from the same GitHub repo.
2. Set the **root directory** to `pmo` so the workspace package.json is detected.
3. Build settings:

   - Install command: `npm install` (default).
   - Build command:

     ```bash
     npm run build --workspace pmo-web
     ```

   - Output directory: `apps/web/dist`.
   - The repo root includes a `vercel.json` mirroring these commands for Vercel CLI users.

4. Environment variables in Vercel (Project → Settings → Environment Variables):
   - `VITE_API_BASE_URL` – **required**. Point this to the Render API base (e.g., `https://your-api.onrender.com/api`) so production traffic reaches the backend instead of falling back to relative paths.

5. The frontend reads `import.meta.env.VITE_API_BASE_URL` via a small helper and falls back to relative `/api/...` calls when the variable is empty (useful for local proxies). In production, the app logs an error if this value is missing to help catch misconfigured deployments.

---

## 4. Local development

1. Create `.env` files:
   - `/apps/api/.env` based on `Docs/api.env.example`.
   - `/apps/web/.env` from `/apps/web/.env.example` (contains `VITE_API_BASE_URL="http://localhost:4000/api"`).
     - With `VITE_API_BASE_URL` set, the frontend calls the API directly at that base.
     - If you leave it blank, the frontend falls back to relative `/api/...` paths so you can use a Vite dev proxy or same-origin API.

2. Start services from `/pmo`:

   ```bash
   # in one terminal
   npm run dev --workspace pmo-api

   # in another terminal
   npm run dev --workspace pmo-web
   ```

3. Open `http://localhost:5173` for the web app.

---

## 5. Deployment checklist

- [ ] Render PostgreSQL database created and `DATABASE_URL` configured.
- [ ] Render API service healthy with required env vars (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `NODE_ENV=production`, optional `PORT`, and `CORS_ORIGIN` pointing to the Vercel URL).
- [ ] Vercel project set to root `pmo` with build command `npm run build --workspace pmo-web` and output `apps/web/dist`.
- [ ] `VITE_API_BASE_URL` set in Vercel to the Render API base (e.g., `https://your-api.onrender.com/api`).
- [ ] Deployments succeed and the Vercel app passes basic smoke tests (load app, login, CRUD clients/projects/contacts/documents).

---

## 6. Post-deploy smoke test

- [ ] Web app loads from Vercel and can:
  - [ ] Login.
  - [ ] Create a client.
  - [ ] Create a project from a template.
  - [ ] Add a meeting and create a task from notes.
  - [ ] Link an AI asset.
  - [ ] View the project status snapshot.

Once these steps are green, your AI Consulting PMO MVP is live.
