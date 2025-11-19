import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ?? '4';

const workspaceRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(workspaceRoot, '..', '..');
const schemaBasePath = path.join(repoRoot, 'prisma', 'schema.prisma');
let schemaPath = schemaBasePath;
let sqliteSchemaPath: string | undefined;
let sqliteDatabasePath: string | undefined;

const workerId = process.env.VITEST_WORKER_ID ?? '1';
const adminDatabaseUrl = process.env.POSTGRES_TEST_ADMIN_URL;
const usePostgres = Boolean(adminDatabaseUrl);

if (usePostgres) {
  const testDatabaseName =
    process.env.POSTGRES_TEST_DATABASE ?? `pmo_test_${workerId}`;
  const testDatabaseUrl = new URL(adminDatabaseUrl!);
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
  sqliteDatabasePath = path.join(workspaceRoot, `test-${workerId}.db`);
  if (fs.existsSync(sqliteDatabasePath)) {
    fs.rmSync(sqliteDatabasePath);
  }

  process.env.DATABASE_URL = `file:${sqliteDatabasePath}`;

  sqliteSchemaPath = path.join(
    workspaceRoot,
    `schema.sqlite.${workerId}.prisma`,
  );
  const schemaContents = fs.readFileSync(schemaBasePath, 'utf8');
  const patchedSchema = schemaContents
    .replace('provider = "postgresql"', 'provider = "sqlite"')
    .replace(/attendees\s+String\[\]/, 'attendees     String');
  fs.writeFileSync(sqliteSchemaPath, patchedSchema);
  schemaPath = sqliteSchemaPath;
}

let prismaClient: PrismaClient;

const runPrismaReset = () => {
  const schemaArg = `--schema "${schemaPath}"`;
  if (usePostgres) {
    execSync(
      `npx prisma migrate reset --force --skip-generate --skip-seed ${schemaArg}`,
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
        },
        stdio: 'inherit',
      },
    );
  } else {
    execSync(`npx prisma db push --force-reset --skip-generate ${schemaArg}`, {
      cwd: workspaceRoot,
      env: {
        ...process.env,
      },
      stdio: 'inherit',
    });
  }
};

beforeAll(async () => {
  runPrismaReset();

  execSync(`npx prisma generate --schema "${schemaPath}"`, {
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
  if (sqliteSchemaPath && fs.existsSync(sqliteSchemaPath)) {
    fs.rmSync(sqliteSchemaPath);
  }
  if (sqliteDatabasePath && fs.existsSync(sqliteDatabasePath)) {
    fs.rmSync(sqliteDatabasePath);
  }
});
