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
const usePostgres = Boolean(process.env.POSTGRES_TEST_ADMIN_URL);

process.env.DATABASE_PROVIDER = usePostgres ? 'postgresql' : 'sqlite';

const workspaceRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(workspaceRoot, '..', '..');
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');

let prismaClient: PrismaClient;
let activeSchemaPath = schemaPath;
let sqliteSchemaPath: string | undefined;
let sqliteDatabasePath: string | undefined;

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
  sqliteDatabasePath = path.join(__dirname, `test-${workerId}.db`);
  fs.rmSync(sqliteDatabasePath, { force: true });
  process.env.DATABASE_URL = `file:${sqliteDatabasePath}`;

  sqliteSchemaPath = path.join(
    repoRoot,
    'prisma',
    `schema.test.${workerId}.prisma`,
  );
  const schemaContents = fs.readFileSync(schemaPath, 'utf8');
  const sqliteSchema = schemaContents.replace(
    'provider = "postgresql"',
    'provider = "sqlite"',
  );
  if (sqliteSchema === schemaContents) {
    throw new Error('Unable to derive SQLite schema from prisma/schema.prisma');
  }
  fs.writeFileSync(sqliteSchemaPath, sqliteSchema);
  activeSchemaPath = sqliteSchemaPath;
}

beforeAll(async () => {
  if (usePostgres) {
    execSync(
      `npx prisma migrate reset --force --skip-generate --skip-seed --schema "${activeSchemaPath}"`,
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
        },
        stdio: 'inherit',
      },
    );
  } else {
    execSync(
      `npx prisma db push --force-reset --skip-generate --schema "${activeSchemaPath}"`,
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
        },
        stdio: 'inherit',
      },
    );
  }

  execSync(`npx prisma generate --schema "${activeSchemaPath}"`, {
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

  if (!usePostgres) {
    if (sqliteSchemaPath && fs.existsSync(sqliteSchemaPath)) {
      fs.rmSync(sqliteSchemaPath, { force: true });
    }
    if (sqliteDatabasePath && fs.existsSync(sqliteDatabasePath)) {
      fs.rmSync(sqliteDatabasePath, { force: true });
    }
  }
});
