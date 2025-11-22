# E2E Test Setup Guide

## Prerequisites

The E2E tests require PostgreSQL to be running. The Prisma schema uses PostgreSQL-specific features (array types) that are not compatible with SQLite.

## Setup Instructions

### 1. Start PostgreSQL

You have several options:

**Option A: Using Docker (Recommended)**

```bash
docker run --name pmo-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=pmo \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Local PostgreSQL Installation**
Ensure PostgreSQL is installed and running on localhost:5432

### 2. Configure Environment

The `.env` files should be configured with:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pmo"
```

This should be set in both:

- `/pmo/.env`
- `/pmo/apps/api/.env`

### 3. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed
```

### 4. Run E2E Tests

```bash
npm run test:e2e
```

## Troubleshooting

### Tests fail with "page crashed" or elements not visible

The global setup test has been improved to handle timing issues, but if you still encounter problems:

1. Check that PostgreSQL is running and accessible
2. Verify the database is seeded with test data
3. Ensure the API server can connect to the database

### Database connection errors

- Verify DATABASE_URL is correct in both .env files
- Check PostgreSQL is running: `psql -U postgres -h localhost -c "\l"`
- Ensure the `pmo` database exists

## Recent Changes

The global setup test (`e2e/global.setup.ts`) has been improved to:

- Use more robust selectors (input type selectors instead of labels)
- Add appropriate timeouts for page loading
- Handle the AuthContext initialization properly
