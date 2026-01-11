#!/usr/bin/env node

/**
 * Fix Failed Migration Script
 *
 * This script resolves failed Prisma migrations by marking them as rolled back
 * and allowing new migrations to proceed. It should be run when a migration
 * partially applies and leaves the database in a failed state.
 *
 * Usage: node scripts/fix-failed-migration.mjs
 */

import { execSync } from 'child_process';

console.log('🔧 Fixing failed migration...\n');

try {
  // Step 1: Mark the failed migration as rolled back
  console.log('Step 1: Marking failed migration as rolled back...');
  execSync(
    'npx prisma migrate resolve --rolled-back 20251123211300_add_marketing_content_enhancements',
    {
      stdio: 'inherit',
      cwd: process.cwd()
    }
  );
  console.log('✅ Failed migration marked as rolled back\n');

  // Step 2: Deploy pending migrations
  console.log('Step 2: Deploying pending migrations...');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Migrations deployed successfully\n');

  console.log('🎉 Migration fix completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Error fixing migration:', error.message);
  console.error('\nIf the issue persists, you may need to manually inspect the database.');
  console.error('Run: npx prisma studio to view the database state');
  process.exit(1);
}
