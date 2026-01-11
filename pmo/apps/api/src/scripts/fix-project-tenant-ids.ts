/**
 * Migration Script: Fix Project Tenant IDs
 *
 * This script fixes projects that have NULL tenantId by:
 * 1. Finding the project owner's tenant membership
 * 2. Setting the project's tenantId to match the owner's tenant
 *
 * Run with: npx tsx src/scripts/fix-project-tenant-ids.ts [--dry-run]
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

  console.log('=== Fix Project Tenant IDs ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // Find all projects with NULL tenantId
  const projectsWithNullTenant = await prisma.project.findMany({
    where: { tenantId: null },
    select: {
      id: true,
      name: true,
      ownerId: true,
      tenantId: true,
    },
  });

  console.log(
    `Found ${projectsWithNullTenant.length} projects with NULL tenantId\n`,
  );

  if (projectsWithNullTenant.length === 0) {
    console.log('No projects need fixing. Exiting.');
    return;
  }

  // Get unique owner IDs
  const ownerIds = [...new Set(projectsWithNullTenant.map((p) => p.ownerId))];

  // Find tenant memberships for these owners
  const tenantMemberships = await prisma.tenantUser.findMany({
    where: { userId: { in: ownerIds } },
    select: {
      userId: true,
      tenantId: true,
      tenant: { select: { name: true } },
    },
  });

  // Create a map of userId -> tenantId
  const ownerToTenant = new Map<number, string>();
  for (const membership of tenantMemberships) {
    // If user has multiple tenant memberships, use the first one
    if (!ownerToTenant.has(membership.userId)) {
      ownerToTenant.set(membership.userId, membership.tenantId);
      console.log(
        `  User ${membership.userId} -> Tenant "${membership.tenant.name}" (${membership.tenantId})`,
      );
    }
  }

  console.log('\n--- Processing Projects ---\n');

  let fixed = 0;
  let skipped = 0;

  for (const project of projectsWithNullTenant) {
    const tenantId = ownerToTenant.get(project.ownerId);

    if (!tenantId) {
      console.log(
        `  SKIP: Project "${project.name}" (ID: ${project.id}) - Owner ${project.ownerId} has no tenant membership`,
      );
      skipped++;
      continue;
    }

    console.log(
      `  ${isDryRun ? 'WOULD FIX' : 'FIXING'}: Project "${project.name}" (ID: ${project.id}) -> tenantId: ${tenantId}`,
    );

    if (!isDryRun) {
      await prisma.project.update({
        where: { id: project.id },
        data: { tenantId },
      });
    }

    fixed++;
  }

  console.log('\n=== Summary ===');
  console.log(`  ${isDryRun ? 'Would fix' : 'Fixed'}: ${fixed} projects`);
  console.log(`  Skipped: ${skipped} projects (owner has no tenant)`);

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
