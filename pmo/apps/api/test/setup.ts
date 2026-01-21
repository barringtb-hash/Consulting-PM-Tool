import { execSync } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll } from 'vitest';

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
const configPath = path.join(repoRoot, 'prisma.config.ts');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prismaClient: { $disconnect: () => Promise<void> } | undefined;

beforeAll(async () => {
  // In CI, migrations are already applied. Locally, we apply them.
  // Use 'migrate deploy' which is safer and doesn't drop data
  // Prisma 7 requires --config flag to specify the config file with datasource
  try {
    execSync(
      `npx prisma migrate deploy --schema "${schemaPath}" --config "${configPath}"`,
      {
        cwd: repoRoot,
        env: {
          ...process.env,
        },
        stdio: 'inherit',
      },
    );
  } catch (error) {
    // If migrate deploy fails, try reset (for local dev with schema changes)
    // Note: Prisma 7 removed --skip-generate and --skip-seed flags
    // Use migrate reset --force which applies migrations without seed
    console.warn('migrate deploy failed, trying migrate reset...');
    execSync(
      `npx prisma migrate reset --force --schema "${schemaPath}" --config "${configPath}"`,
      {
        cwd: repoRoot,
        env: {
          ...process.env,
        },
        stdio: 'inherit',
      },
    );
  }

  try {
    const prismaModule = await import('../src/prisma/client');
    // Handle both default export and named export, and handle mocked modules
    // that may not have $disconnect
    const client = prismaModule.default ?? prismaModule.prisma;
    if (client && typeof client.$disconnect === 'function') {
      prismaClient = client;
    }
  } catch (error) {
    // Some tests mock the prisma client without proper default export
    // In these cases, we skip the global prisma setup
    console.warn('Prisma client import failed (likely mocked):', error);
  }
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
