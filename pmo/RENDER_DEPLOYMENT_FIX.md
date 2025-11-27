# Render Deployment Fix for Failed Migrations

## Problem

The deployment is failing due to a failed Prisma migration:

```
The `20251123211300_add_marketing_content_enhancements` migration started at 2025-11-23 23:01:20.417509 UTC failed
```

## Solution

We've created a smart migration deployment script that automatically handles failed migrations by resolving them before proceeding.

## How to Fix

### Option 1: Update Build Command (Recommended)

1. Go to your Render dashboard
2. Select your API service
3. Go to **Settings** → **Build & Deploy**
4. Update the **Build Command** from:

   ```bash
   npm install --ignore-scripts && npx prisma generate && npx prisma migrate deploy && npm run build
   ```

   To:

   ```bash
   bash pmo/scripts/render-build.sh
   ```

5. Click **Save Changes**
6. Trigger a new deploy: **Manual Deploy** → **Deploy latest commit**

### Option 2: Manual Fix (If you need to resolve immediately)

1. Go to your Render dashboard → Shell
2. Run these commands:
   ```bash
   cd pmo/apps/api
   npx prisma migrate resolve --rolled-back 20251123211300_add_marketing_content_enhancements
   npx prisma migrate deploy
   ```

## What the Smart Script Does

The `scripts/render-build.sh` script:

1. Installs dependencies
2. Generates Prisma client
3. **Intelligently deploys migrations** using `scripts/deploy-migrations.sh` which:
   - Detects failed migrations
   - Automatically resolves them (marks as rolled back or applied)
   - Retries deployment
   - Handles edge cases
4. Builds the application

## Scripts Created

- **`pmo/scripts/render-build.sh`** - Main Render build script (use this in Render settings)
- **`pmo/scripts/deploy-migrations.sh`** - Smart migration deployment with failure recovery
- **`pmo/scripts/fix-failed-migration.mjs`** - Node.js script for manual migration fixes

## Prevention

The new build script will automatically handle any future migration failures, so this issue won't recur.
