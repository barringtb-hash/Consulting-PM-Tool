# Render Deployment Configuration

## Current Issue: Failed Migration

The migration `20251123211300_add_marketing_content_enhancements` failed in the production database and needs to be resolved.

## Solution

### Option 1: Update Render Build Command (Recommended)

Update your Render build command to use the migration script that handles failed migrations:

**Current command:**

```bash
npm install --ignore-scripts && npx prisma generate && npx prisma migrate deploy && npm run build
```

**New command:**

```bash
npm install --ignore-scripts && npx prisma generate && cd apps/api && npm run prisma:migrate:deploy && cd ../.. && npm run build
```

This uses the `scripts/deploy-migrations.sh` script which automatically:

1. Detects failed migrations
2. Attempts to mark them as rolled back
3. If that fails, marks them as applied (for cases where tables already exist)
4. Re-runs the migration deployment

### Option 2: Manual Resolution via Render Shell

If you have access to the Render shell, you can manually resolve the migration:

1. Open a shell in your Render service
2. Navigate to the API directory:

   ```bash
   cd pmo/apps/api
   ```

3. Mark the failed migration as applied (if tables exist) or rolled back:

   ```bash
   # Option A: If the tables already exist, mark as applied
   npx prisma migrate resolve --applied "20251123211300_add_marketing_content_enhancements"

   # Option B: If tables don't exist, mark as rolled back
   npx prisma migrate resolve --rolled-back "20251123211300_add_marketing_content_enhancements"
   ```

4. Run migrations again:
   ```bash
   npx prisma migrate deploy
   ```

### Option 3: Update Build Command to Skip Failed Migration

If the above doesn't work, you can temporarily update the build command to handle the specific migration:

```bash
npm install --ignore-scripts && npx prisma generate && (npx prisma migrate resolve --applied "20251123211300_add_marketing_content_enhancements" || true) && npx prisma migrate deploy && npm run build
```

## Understanding the Issue

The migration failed because:

1. It started executing (`2025-11-23 23:01:20.417509 UTC`)
2. Something went wrong mid-execution (possibly a database connection issue or constraint violation)
3. Prisma marked it as failed and won't proceed with new migrations until resolved

The migration creates these tables:

- `MarketingContent` - Main marketing content table
- Related enums: `ContentType`, `ContentStatus`, `ContentChannel`

## After Resolution

Once the migration is resolved, subsequent deployments will work normally. The improved `deploy-migrations.sh` script will handle any future migration failures automatically.

## Verification

After deploying with the updated build command, verify:

1. Build completes successfully
2. Migration status shows all migrations applied:
   ```bash
   npx prisma migrate status
   ```
3. Application starts without errors

## Support

If issues persist, check:

- Database connectivity
- Database user permissions
- Prisma schema syntax
- Migration files for SQL errors
