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
2. Build command (example):

   ```bash
   cd apps/api && npm install && npm run build
   ```

3. Start command (example):

   ```bash
   cd apps/api && npm run start
   ```

4. Add environment variables in Render (Settings → Environment):
   - `DATABASE_URL` – value from the Render Postgres instance.
   - `JWT_SECRET` – a long random secret.
   - `CORS_ORIGIN` – your web origin (e.g. `http://localhost:5173` in dev, `https://your-app.vercel.app` in prod).
   - `NODE_ENV` – `production`.
   - `PORT` – Render usually injects this automatically; ensure your app listens on `process.env.PORT`.

5. After the first deploy, run Prisma migrations:
   - Option A: add a `postdeploy` command in package.json to run `prisma migrate deploy`.
   - Option B: open a shell on the service and run:

     ```bash
     cd apps/api
     npx prisma migrate deploy
     ```

---

## 3. Set up the web app on Vercel

1. Create a new Vercel project from the same GitHub repo.
2. Set the **root directory** to `/apps/web`.
3. Build command:

   ```bash
   npm install && npm run build
   ```

   (or the pnpm/yarn equivalent)

4. Output directory: `dist`.

5. Set environment variables in Vercel (Project → Settings → Environment Variables):
   - `VITE_API_BASE_URL` – the base URL of your Render API, e.g. `https://your-api.onrender.com/api`.

6. The web app should use `import.meta.env.VITE_API_BASE_URL` when configuring React Query / fetch.

---

## 4. Local development

1. Create `.env` files:
   - `/apps/api/.env` based on `api.env.example`.
   - `/apps/web/.env` containing `VITE_API_BASE_URL="http://localhost:4000/api"`.

2. Start services:

   ```bash
   # in one terminal
   cd apps/api
   npm install
   npx prisma migrate dev --name init
   npm run dev

   # in another terminal
   cd apps/web
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173` for the web app.

---

## 5. Post-deploy checklist

- [ ] Health checks passing on Render API.
- [ ] Prisma migrations applied (`prisma migrate deploy`).
- [ ] Web app loads from Vercel and can:
  - [ ] Login.
  - [ ] Create a client.
  - [ ] Create a project from a template.
  - [ ] Add a meeting and create a task from notes.
  - [ ] Link an AI asset.
  - [ ] View the project status snapshot.

Once these steps are green, your AI Consulting PMO MVP is live.
