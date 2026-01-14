/**
 * Migration Script: Fix Task Tenant IDs
 *
 * This script fixes tasks that have mismatched tenantId by:
 * 1. Finding all tasks where tenantId doesn't match their project's tenantId
 * 2. Updating each task's tenantId to match their parent project's tenantId
 *
 * This ensures tasks inherit tenant context from their parent project,
 * maintaining proper multi-tenant isolation.
 *
 * Run with: npx tsx src/scripts/fix-task-tenant-ids.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('=== Fix Task Tenant IDs ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // Find all tasks with their project's tenantId
  const tasksWithProjects = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      tenantId: true,
      projectId: true,
      project: {
        select: {
          id: true,
          name: true,
          tenantId: true,
        },
      },
    },
  });

  // Filter tasks where tenantId doesn't match project's tenantId
  const mismatchedTasks = tasksWithProjects.filter(
    (task) => task.tenantId !== task.project.tenantId,
  );

  console.log(`Total tasks: ${tasksWithProjects.length}`);
  console.log(`Tasks with mismatched tenantId: ${mismatchedTasks.length}\n`);

  if (mismatchedTasks.length === 0) {
    console.log('No tasks need fixing. Exiting.');
    return;
  }

  // Group by mismatch type for reporting
  const nullTenantTasks = mismatchedTasks.filter((t) => t.tenantId === null);
  const wrongTenantTasks = mismatchedTasks.filter(
    (t) => t.tenantId !== null && t.tenantId !== t.project.tenantId,
  );

  console.log(`  - Tasks with NULL tenantId: ${nullTenantTasks.length}`);
  console.log(`  - Tasks with wrong tenantId: ${wrongTenantTasks.length}\n`);

  console.log('--- Processing Tasks ---\n');

  let fixed = 0;
  let skipped = 0;

  for (const task of mismatchedTasks) {
    const projectTenantId = task.project.tenantId;

    if (!projectTenantId) {
      console.log(
        `  SKIP: Task "${task.title}" (ID: ${task.id}) - Project "${task.project.name}" has no tenantId`,
      );
      skipped++;
      continue;
    }

    const currentTenantDisplay = task.tenantId ?? 'NULL';
    console.log(
      `  ${isDryRun ? 'WOULD FIX' : 'FIXING'}: Task "${task.title}" (ID: ${task.id})`,
    );
    console.log(`    Project: "${task.project.name}" (ID: ${task.projectId})`);
    console.log(`    tenantId: ${currentTenantDisplay} -> ${projectTenantId}`);

    if (!isDryRun) {
      await prisma.task.update({
        where: { id: task.id },
        data: { tenantId: projectTenantId },
      });
    }

    fixed++;
  }

  console.log('\n=== Summary ===');
  console.log(`  ${isDryRun ? 'Would fix' : 'Fixed'}: ${fixed} tasks`);
  console.log(`  Skipped: ${skipped} tasks (project has no tenantId)`);

  if (isDryRun) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
