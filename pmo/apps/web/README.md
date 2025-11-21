# PMO Web App

This workspace hosts the AI Consulting PMO web shell.

- Start development server: `npm run dev --workspace pmo-web`.
- Lint the source (configured as `eslint src --ext .ts,.tsx`): `npm run lint --workspace pmo-web`.
- After running the Prisma seed from `/pmo`, sign in with `admin@pmo.test` / `AdminDemo123!` (or the demo consultant accounts listed in the root README) to explore the flows end-to-end.

## Environment

- Copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
- In production (Vercel), `VITE_API_BASE_URL` must point at the Render API base URL (e.g., `https://your-api.onrender.com/api`) so requests reach the backend.
