import { execSync } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
// JWT_SECRET must be at least 32 characters for security validation
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-key-for-jwt-testing-32chars';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ?? '4';

const workerId = process.env.VITEST_WORKER_ID ?? '1';
const adminDatabaseUrl =
  process.env.POSTGRES_TEST_ADMIN_URL ??
  'postgresql://postgres:postgres@localhost:5432/postgres';
const testDatabaseName =
  process.env.POSTGRES_TEST_DATABASE ?? `pmo_test_${workerId}`;
const testDatabaseUrl = new URL(adminDatabaseUrl);
testDatabaseUrl.pathname = `/${testDatabaseName}`;

const sharedExecOptions = {
  cwd: process.cwd(),
  env: {
    ...process.env,
  },
  stdio: 'inherit' as const,
};

// Check if we're in CI mode (database already created externally)
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// In CI, the test database is created and migrated externally
// Locally, we create the database ourselves
if (!isCI) {
  try {
    execSync(
      `psql "${adminDatabaseUrl}" -c "DROP DATABASE IF EXISTS \\"${testDatabaseName}\\";"`,
      sharedExecOptions,
    );
    execSync(
      `psql "${adminDatabaseUrl}" -c "CREATE DATABASE \\"${testDatabaseName}\\";"`,
      sharedExecOptions,
    );
  } catch (error) {
    console.warn('Database creation skipped (may already exist):', error);
  }
}

process.env.DATABASE_URL = testDatabaseUrl.toString();

const workspaceRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(workspaceRoot, '..', '..');
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');

let prismaClient: PrismaClient;

beforeAll(async () => {
  // In CI, migrations are already applied. Locally, we apply them.
  // Use 'migrate deploy' which is safer and doesn't drop data
  try {
    execSync(`npx prisma migrate deploy --schema "${schemaPath}"`, {
      cwd: workspaceRoot,
      env: {
        ...process.env,
      },
      stdio: 'inherit',
    });
  } catch (error) {
    // If migrate deploy fails, try reset (for local dev with schema changes)
    console.warn('migrate deploy failed, trying migrate reset...');
    execSync(
      `npx prisma migrate reset --force --skip-generate --skip-seed --schema "${schemaPath}"`,
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
        },
        stdio: 'inherit',
      },
    );
  }

  const prismaModule = await import('../src/prisma/client');
  prismaClient = prismaModule.default ?? prismaModule.prisma;
});

beforeEach(async () => {
  // Delete in proper order to respect foreign key constraints
  // Delete dependent records first, then parent records
  //
  // IMPORTANT: Skip deleting data belonging to test tenants (ID/slug starting with
  // 'test-tenant-') as these are managed by tenant-isolation tests which create
  // them in beforeAll and need them to persist across tests.
  //
  // NOTE: We filter directly on tenantId pattern since test tenant IDs follow
  // the pattern 'test-tenant-*' (matching the slug). This is simpler and more
  // reliable than relation-based filtering.

  // Helper: check if tenantId is NOT a test tenant (for tables with required tenantId)
  // Used for CRM models where tenantId is required (String, not String?)
  const isNotTestTenant = {
    AND: [
      { tenantId: { not: { startsWith: 'test-tenant-' } } },
      { tenantId: { not: { startsWith: 'test-tenant-api-' } } },
    ],
  };

  // Helper: include null tenantId (orphaned records)
  // Used for PMO models where tenantId is optional (String?)
  const isOrphanedOrNotTestTenant = {
    OR: [{ tenantId: null }, isNotTestTenant],
  };

  // CRM tables (most dependent first) - skip test tenant data
  // CRM models have REQUIRED tenantId, so we cannot check for null
  await prismaClient.cRMActivity.deleteMany({
    where: isNotTestTenant,
  });
  // OpportunityStageHistory - filter through opportunity relation's tenantId
  await prismaClient.opportunityStageHistory.deleteMany({
    where: {
      opportunity: isNotTestTenant,
    },
  });
  // OpportunityContact - filter through opportunity relation's tenantId
  await prismaClient.opportunityContact.deleteMany({
    where: {
      opportunity: isNotTestTenant,
    },
  });
  await prismaClient.opportunity.deleteMany({
    where: isNotTestTenant,
  });
  await prismaClient.salesPipelineStage.deleteMany({
    where: {
      pipeline: isNotTestTenant,
    },
  });
  await prismaClient.pipeline.deleteMany({
    where: isNotTestTenant,
  });
  await prismaClient.cRMContact.deleteMany({
    where: isNotTestTenant,
  });

  // PMO tables - filter by tenantId pattern
  await prismaClient.task.deleteMany({
    where: isOrphanedOrNotTestTenant,
  });
  await prismaClient.milestone.deleteMany({
    where: isOrphanedOrNotTestTenant,
  });
  await prismaClient.meeting.deleteMany({
    where: isOrphanedOrNotTestTenant,
  });
  await prismaClient.document.deleteMany({
    where: {
      OR: [
        { projectId: null }, // Orphaned documents
        {
          project: isOrphanedOrNotTestTenant,
        },
      ],
    },
  });
  await prismaClient.project.deleteMany({
    where: isOrphanedOrNotTestTenant,
  });
  await prismaClient.contact.deleteMany({
    where: isOrphanedOrNotTestTenant,
  });
  await prismaClient.client.deleteMany({
    where: isOrphanedOrNotTestTenant,
  });

  // CRM Account table - has REQUIRED tenantId
  await prismaClient.account.deleteMany({
    where: isNotTestTenant,
  });

  // Tenant-related tables must be deleted in order
  // First, delete tenant-user associations for non-test tenants
  await prismaClient.tenantUser.deleteMany({
    where: isNotTestTenant,
  });

  // Delete users not associated with any test tenant
  // Query for protected user IDs at delete time to avoid race conditions
  const testTenantUserIds = await prismaClient.tenantUser.findMany({
    where: {
      OR: [
        { tenantId: { startsWith: 'test-tenant-' } },
        { tenantId: { startsWith: 'test-tenant-api-' } },
      ],
    },
    select: { userId: true },
  });
  const protectedUserIds = testTenantUserIds.map((tu) => tu.userId);

  await prismaClient.user.deleteMany({
    where: { id: { notIn: protectedUserIds } },
  });

  // Delete only non-test tenants using ID pattern directly
  await prismaClient.tenant.deleteMany({
    where: isNotTestTenant,
  });
});

afterAll(async () => {
  if (prismaClient) {
    await prismaClient.$disconnect();
  }
});
