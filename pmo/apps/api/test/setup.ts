import { execSync } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
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

execSync(
  `psql "${adminDatabaseUrl}" -c "DROP DATABASE IF EXISTS \"${testDatabaseName}\";"`,
  sharedExecOptions,
);
execSync(
  `psql "${adminDatabaseUrl}" -c "CREATE DATABASE \"${testDatabaseName}\";"`,
  sharedExecOptions,
);

process.env.DATABASE_URL = testDatabaseUrl.toString();

const workspaceRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(workspaceRoot, '..', '..');
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');

let prismaClient: PrismaClient;

beforeAll(async () => {
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

  const prismaModule = await import('../src/prisma/client');
  prismaClient = prismaModule.default ?? prismaModule.prisma;
});

beforeEach(async () => {
  await prismaClient.contact.deleteMany();
  await prismaClient.client.deleteMany();
  await prismaClient.user.deleteMany();
});

afterAll(async () => {
  if (prismaClient) {
    await prismaClient.$disconnect();
  }
});
