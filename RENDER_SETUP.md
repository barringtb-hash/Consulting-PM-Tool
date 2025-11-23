# Render Deployment Configuration

This guide provides the exact configuration needed to deploy the Consulting PM Tool on Render.

## Build Command Configuration

### For API Service

Update your Render API service with the following build command:

```bash
cd pmo/apps/api && npm install --ignore-scripts && npx prisma generate && npm run prisma:migrate:deploy && npm run build
```

This build command:
1. ✅ Navigates to the API directory
2. ✅ Installs dependencies (skipping scripts for security)
3. ✅ Generates Prisma Client
4. ✅ **Automatically handles failed migrations** using the `deploy-migrations.sh` script
5. ✅ Builds the TypeScript API

### Start Command

```bash
cd pmo/apps/api && node dist/index.js
```

## Environment Variables

Ensure these environment variables are set in your Render dashboard:

```bash
DATABASE_URL=<your-postgres-database-url>
JWT_SECRET=<your-secret-key>
BCRYPT_SALT_ROUNDS=10
NODE_ENV=production
PORT=4000
```

## Migration Error Recovery

The build command now includes automatic recovery from failed Prisma migrations (Error P3009).

### How It Works

The `pmo/scripts/deploy-migrations.sh` script:
1. Checks for failed migrations
2. Automatically marks them as rolled back
3. Re-applies the migrations cleanly

This prevents deployment failures caused by partially-applied migrations.

### What Changed

**Old build command (would fail on migration errors):**
```bash
npm install --ignore-scripts && npx prisma generate && npx prisma migrate deploy && npm run build
```

**New build command (auto-recovers from migration errors):**
```bash
cd pmo/apps/api && npm install --ignore-scripts && npx prisma generate && npm run prisma:migrate:deploy && npm run build
```

## First Deployment / Database Setup

After your first successful deployment, seed the database with demo users:

1. Go to Render Dashboard → Your API Service → Shell
2. Run:
```bash
cd /opt/render/project/src/pmo/apps/api
npx prisma db seed
```

This creates 4 demo users (see DEPLOYMENT.md for credentials).

## Troubleshooting

### Build fails with "P3009: failed migrations"

✅ **This should now be fixed automatically** by the new build command.

If you still see this error:
1. Check that your build command matches exactly: `cd pmo/apps/api && npm install --ignore-scripts && npx prisma generate && npm run prisma:migrate:deploy && npm run build`
2. Review the build logs to ensure the deploy-migrations.sh script ran
3. Contact support if the issue persists

### Build fails with "Cannot find module"

Ensure:
- Your build command starts with `cd pmo/apps/api`
- All dependencies are listed in `pmo/apps/api/package.json`
- Run a manual deployment to see full error logs

### Database connection errors

- Verify `DATABASE_URL` is set correctly in environment variables
- Check that your Postgres database is running and accessible
- Ensure the connection string includes all required parameters (host, port, database, user, password)

## Complete Service Configuration

Here's a checklist for your Render service:

- [ ] **Build Command:** `cd pmo/apps/api && npm install --ignore-scripts && npx prisma generate && npm run prisma:migrate:deploy && npm run build`
- [ ] **Start Command:** `cd pmo/apps/api && node dist/index.js`
- [ ] **Environment Variables:** All required vars set (see above)
- [ ] **Branch:** Set to `main` or your production branch
- [ ] **Root Directory:** Leave blank (or set to repository root)
- [ ] **Node Version:** 22.x or later

## Resources

- Full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Migration script: [pmo/scripts/deploy-migrations.sh](./pmo/scripts/deploy-migrations.sh)
- Prisma schema: [pmo/prisma/schema.prisma](./pmo/prisma/schema.prisma)
