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
  // IMPORTANT: Skip deleting data belonging to test tenants (slug starting with
  // 'test-tenant-' or 'test-tenant-api-') as these are managed by tenant-isolation
  // tests which create them in beforeAll and need them to persist across tests.

  // Get test tenant IDs to exclude from cleanup
  const testTenants = await prismaClient.tenant.findMany({
    where: {
      OR: [
        { slug: { startsWith: 'test-tenant-' } },
        { slug: { startsWith: 'test-tenant-api-' } },
      ],
    },
    select: { id: true },
  });
  const testTenantIds = testTenants.map((t) => t.id);

  // CRM tables (most dependent first) - skip test tenant data
  await prismaClient.cRMActivity.deleteMany({
    where: { tenantId: { notIn: testTenantIds } },
  });
  await prismaClient.opportunityStageHistory.deleteMany({
    where: { tenantId: { notIn: testTenantIds } },
  });
  await prismaClient.opportunityContact.deleteMany({
    where: { tenantId: { notIn: testTenantIds } },
  });
  await prismaClient.opportunity.deleteMany({
    where: { tenantId: { notIn: testTenantIds } },
  });
  await prismaClient.salesPipelineStage.deleteMany({
    where: { pipeline: { tenantId: { notIn: testTenantIds } } },
  });
  await prismaClient.pipeline.deleteMany({
    where: { tenantId: { notIn: testTenantIds } },
  });
  await prismaClient.cRMContact.deleteMany({
    where: { tenantId: { notIn: testTenantIds } },
  });

  // PMO tables (not tenant-scoped in legacy schema, delete all)
  await prismaClient.task.deleteMany();
  await prismaClient.milestone.deleteMany();
  await prismaClient.meeting.deleteMany();
  await prismaClient.document.deleteMany();
  await prismaClient.project.deleteMany();
  await prismaClient.contact.deleteMany();
  await prismaClient.client.deleteMany();

  // Shared tables - skip test tenant data
  await prismaClient.account.deleteMany({
    where: { tenantId: { notIn: testTenantIds } },
  });

  // Tenant-related tables must be deleted in order
  // First, delete tenant-user associations for non-test tenants
  await prismaClient.tenantUser.deleteMany({
    where: { tenantId: { notIn: testTenantIds } },
  });

  // Delete users not associated with test tenants
  const testTenantUserIds = await prismaClient.tenantUser.findMany({
    where: { tenantId: { in: testTenantIds } },
    select: { userId: true },
  });
  const protectedUserIds = testTenantUserIds.map((tu) => tu.userId);

  await prismaClient.user.deleteMany({
    where: { id: { notIn: protectedUserIds } },
  });

  // Delete only non-test tenants
  await prismaClient.tenant.deleteMany({
    where: { id: { notIn: testTenantIds } },
  });
});

afterAll(async () => {
  if (prismaClient) {
    await prismaClient.$disconnect();
  }
});
