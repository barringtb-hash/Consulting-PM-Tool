# Render Deployment Configuration

## IMPORTANT: Correct Render Configuration

For the build to work correctly, Render must be configured with the correct root directory.

### Current Issue: Build Fails with "Cannot find module '@prisma/client'"

This error occurs when Render's Root Directory is set to `pmo/apps/api` instead of `pmo`. When running from `apps/api` directly, npm and Prisma install dependencies to different locations, causing TypeScript to fail.

### Solution: Update Render Settings

1. Go to **Render Dashboard** → Your API Service → **Settings** → **Build & Deploy**

2. Update the following settings:
   - **Root Directory**: `pmo` (NOT `pmo/apps/api`)
   - **Build Command**: `bash scripts/render-build.sh`
   - **Start Command**: `cd apps/api && npm run start`

3. Click **Save Changes** and trigger a manual deploy

### Alternative: If You Must Use apps/api as Root Directory

If you can't change the root directory, use this build command instead:

```bash
cd ../.. && npm install --include=dev && npx prisma generate --schema ./prisma/schema.prisma && cd apps/api && npm run prisma:migrate:deploy && npm run build
```

This navigates to the workspace root for npm install and prisma generate, ensuring:

1. Proper dependency hoisting with dev dependencies for TypeScript types
2. Prisma client is generated with the correct schema path
3. Migrations are deployed before building

---

## Previous Issue: Failed Migration

The migration `20251123211300_add_marketing_content_enhancements` failed in the production database and needs to be resolved.

## Solution

### Option 1: Update Render Build Command (Recommended)

Update your Render build command to use the migration script that handles failed migrations:

**Old (broken) command:**

```bash
npm install --ignore-scripts && npx prisma generate && npx prisma migrate deploy && npm run build
```

**New (correct) command:**

```bash
bash scripts/render-build.sh
```

Or if you prefer a single-line command:

```bash
npm install --include=dev && npx prisma generate --schema ./prisma/schema.prisma && npm run prisma:migrate:deploy && npm run build --workspace pmo-api
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
npm install --include=dev && npx prisma generate --schema ./prisma/schema.prisma && (npx prisma migrate resolve --applied "MIGRATION_NAME_HERE" --schema ./prisma/schema.prisma || true) && npx prisma migrate deploy --schema ./prisma/schema.prisma && npm run build --workspace pmo-api
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
