import { execSync } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ?? '4';

const workerId = process.env.VITEST_WORKER_ID ?? '1';
const testSchema = `test_${workerId}`;
const baseDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/pmo_dev';
const url = new URL(baseDatabaseUrl);
url.searchParams.set('schema', testSchema);
const testDatabaseUrl = url.toString();
process.env.DATABASE_URL = testDatabaseUrl;

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');

let prismaClient: PrismaClient;

beforeAll(async () => {
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
  await prismaClient.contact.deleteMany();
  await prismaClient.client.deleteMany();
  await prismaClient.user.deleteMany();
});

afterAll(async () => {
  await prismaClient.$disconnect();
});
