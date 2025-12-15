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

// NOTE: We intentionally do NOT run any cleanup in beforeEach.
//
// Each test file creates its own isolated test environment with unique tenant IDs
// (e.g., 'test-tenant-projects', 'test-tenant-meetings-123456') and cleans up
// after itself in afterAll via cleanupTestEnvironment().
//
// Running cleanup in beforeEach causes race conditions when tests run in parallel
// across files - one file's cleanup can interfere with another file's test data.
//
// Test isolation is achieved through unique tenant IDs, not global cleanup.

afterAll(async () => {
  if (prismaClient) {
    await prismaClient.$disconnect();
  }
});
