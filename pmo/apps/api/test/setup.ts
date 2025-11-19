import { execSync } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import getDatabase from '@databases/pg-test';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ?? '4';

const workerId = process.env.VITEST_WORKER_ID ?? '1';
const testSchema = `test_${workerId}`;

let prismaClient: PrismaClient | null = null;
let pgContainer: Awaited<ReturnType<typeof getDatabase>> | null = null;

const resolveDatabaseUrl = async () => {
  const envDatabaseUrl =
    process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

  if (envDatabaseUrl) return envDatabaseUrl;

  try {
    pgContainer = await getDatabase({
      pgUser: 'postgres',
      pgDb: 'pmo_dev',
      containerName: `pmo-api-test-${workerId}`,
    });

    return pgContainer.databaseURL;
  } catch (error) {
    throw new Error(
      'Failed to start a Postgres database for tests. Provide TEST_DATABASE_URL or ensure Docker is available.',
      { cause: error instanceof Error ? error : undefined },
    );
  }
};

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');

beforeAll(async () => {
  const baseDatabaseUrl = await resolveDatabaseUrl();
  const url = new URL(baseDatabaseUrl);
  url.searchParams.set('schema', testSchema);
  const testDatabaseUrl = url.toString();
  process.env.DATABASE_URL = testDatabaseUrl;

  execSync(
    `npx prisma migrate reset --force --skip-generate --skip-seed --schema "${schemaPath}"`,
    {
      cwd: projectRoot,
      env: {
        ...process.env,
      },
      stdio: 'inherit',
    },
  );

  execSync(`npx prisma generate --schema "${schemaPath}"`, {
    cwd: projectRoot,
    env: {
      ...process.env,
    },
    stdio: 'inherit',
  });

  const { default: prisma } = await import('../src/prisma/client');
  prismaClient = prisma;
});

beforeEach(async () => {
  if (!prismaClient) {
    throw new Error(
      'Prisma client not initialized; ensure the test database is reachable.',
    );
  }

  await prismaClient.contact.deleteMany();
  await prismaClient.client.deleteMany();
  await prismaClient.user.deleteMany();
});

afterAll(async () => {
  if (prismaClient) {
    await prismaClient.$disconnect();
  }

  if (pgContainer) {
    await pgContainer.kill();
  }
});
