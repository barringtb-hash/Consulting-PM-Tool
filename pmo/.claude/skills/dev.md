# Start Development Servers

Start the development environment for the PMO application.

## Instructions

Run from the `/pmo` directory:

```bash
# Start API server (port 4000)
npm run dev --workspace pmo-api

# Start Web frontend (port 5173)
npm run dev --workspace pmo-web
```

To run both simultaneously, use two terminal sessions or run them in the background.

## Ports

- API: http://localhost:4000
- Web: http://localhost:5173
- Health check: GET http://localhost:4000/api/healthz

## Environment Files

- API: `apps/api/.env`
- Web: `apps/web/.env`

## Test Accounts

- Admin: `admin@pmo.test` / `AdminDemo123!`
- Consultant: `avery.chen@pmo.test` / `PmoDemo123!`
