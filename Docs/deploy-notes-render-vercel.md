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

1. Create a new **Web Service** from your GitHub repo pointing to the `/pmo/apps/api` directory.
2. Build command (example):

   ```bash
   cd pmo/apps/api && npm install && npm run build
   ```

3. Start command (example):

   ```bash
   cd pmo/apps/api && npm run start
   ```

4. Add environment variables in Render (Settings → Environment):
   - `DATABASE_URL` – value from the Render Postgres instance.
   - `JWT_SECRET` – a long random secret.
   - `JWT_EXPIRES_IN` – e.g. `1h`.
   - `BCRYPT_SALT_ROUNDS` – e.g. `10`.
   - `NODE_ENV` – `production`.
   - `PORT` – Render usually injects this automatically; ensure your app listens on `process.env.PORT`.

5. After the first deploy, run Prisma migrations:
   - Option A: run the `npm run prisma:migrate:deploy` script defined in `apps/api/package.json`.
   - Option B: open a shell on the service and run:

     ```bash
     cd pmo/apps/api
     npm run prisma:migrate:deploy
     ```

---

## 3. Set up the web app on Vercel

1. Create a new Vercel project from the same GitHub repo.
2. Set the **root directory** to `pmo/apps/web`.
3. Build settings:

   - Install command: `npm install` (default).
   - Build command:

     ```bash
     npm run build
     ```

   - Output directory: `dist`.

4. Environment variables in Vercel (Project → Settings → Environment Variables):
   - `VITE_API_BASE_URL` – the base URL of your Render API, e.g. `https://your-api.onrender.com/api`.

The frontend reads `import.meta.env.VITE_API_BASE_URL` centrally and issues all requests through the shared API client.

---

## 4. Local development

1. Create `.env` files:
   - `/pmo/apps/api/.env` from `/pmo/apps/api/.env.example` and set `DATABASE_URL` to your local Postgres instance plus `JWT_SECRET`.
   - `/pmo/apps/web/.env` from `/pmo/apps/web/.env.example` (defaults to `VITE_API_BASE_URL="http://localhost:4000/api"`).

2. Prepare the database from `/pmo`:

   ```bash
   export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
   npx prisma migrate dev --name init_postgres_mvp --schema prisma/schema.prisma
   npx prisma db seed --schema prisma/schema.prisma
   ```

3. Start services:

   ```bash
   # API (from pmo/apps/api)
   npm run dev

   # Frontend (from pmo/apps/web)
   npm run dev
   ```

4. Open `http://localhost:5173` for the web app.

---

## 5. Deployment checklist

- [ ] Render PostgreSQL database created and `DATABASE_URL` configured.
- [ ] Render API service healthy with required env vars (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `NODE_ENV=production`, optional `PORT`).
- [ ] Vercel project set to root `pmo/apps/web` with build command `npm run build` and output `dist`.
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
