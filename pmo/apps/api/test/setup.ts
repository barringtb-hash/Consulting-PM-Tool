import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ?? '4';

const workerId = process.env.VITEST_WORKER_ID ?? '1';
const requestedProvider = (
  process.env.DATABASE_PROVIDER ?? 'sqlite'
).toLowerCase();
const isPostgresRequested = requestedProvider.startsWith('postgres');
const hasPostgresEnv = Boolean(process.env.POSTGRES_TEST_ADMIN_URL);
const usePostgres = isPostgresRequested && hasPostgresEnv;
const databaseProvider = usePostgres ? 'postgresql' : 'sqlite';
process.env.DATABASE_PROVIDER = databaseProvider;

if (usePostgres) {
  const adminDatabaseUrl = process.env.POSTGRES_TEST_ADMIN_URL!;
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
} else {
  const databasePath = path.join(__dirname, `test-${workerId}.db`);
  if (fs.existsSync(databasePath)) {
    fs.rmSync(databasePath);
  }

  process.env.DATABASE_URL = `file:${databasePath}`;
}

const workspaceRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(workspaceRoot, '..', '..');
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');
const tempSchemaPath = path.join(
  workspaceRoot,
  `.schema.${databaseProvider}.${workerId}.prisma`,
);

let prismaSchemaPath = schemaPath;

if (!usePostgres) {
  let schemaContents = fs.readFileSync(schemaPath, 'utf8');
  schemaContents = schemaContents.replace(
    /provider\s*=\s*"postgresql"/,
    'provider = "sqlite"',
  );
  schemaContents = schemaContents
    .replace(/\(sort:\s*Desc\)/g, '')
    .replace(/\(sort:\s*Asc\)/g, '');
  fs.writeFileSync(tempSchemaPath, schemaContents);
  prismaSchemaPath = tempSchemaPath;
} else if (fs.existsSync(tempSchemaPath)) {
  fs.rmSync(tempSchemaPath);
}

process.env.PRISMA_SCHEMA_PATH = prismaSchemaPath;

let prismaClient: PrismaClient;

beforeAll(async () => {
  const schemaCommand = usePostgres
    ? `npx prisma migrate reset --force --skip-generate --skip-seed --schema "${prismaSchemaPath}"`
    : `npx prisma db push --force-reset --skip-generate --schema "${prismaSchemaPath}"`;

  execSync(schemaCommand, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
    },
    stdio: 'inherit',
  });

  execSync(`npx prisma generate --schema "${prismaSchemaPath}"`, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
    },
    stdio: 'inherit',
  });

  const { default: prisma } = await import('../src/prisma/client');
  prismaClient = prisma;
});

beforeEach(async () => {
  await prismaClient.contact.deleteMany();
  await prismaClient.client.deleteMany();
  await prismaClient.user.deleteMany();
});

afterAll(async () => {
  await prismaClient.$disconnect();
  if (!usePostgres && fs.existsSync(tempSchemaPath)) {
    fs.rmSync(tempSchemaPath);
  }
});
