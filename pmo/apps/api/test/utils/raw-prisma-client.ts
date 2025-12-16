/**
 * Raw Prisma Client for Tests
 *
 * Provides a PrismaClient instance using Prisma 7's adapter pattern
 * WITHOUT the tenant extension. This is used for:
 * - Test setup and cleanup
 * - Cross-tenant data verification
 * - Direct database operations that bypass tenant filtering
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Global storage for singleton pattern
const globalForTestPrisma = globalThis as unknown as {
  testPrisma?: PrismaClient;
  testPgPool?: Pool;
};

/**
 * Create a raw PrismaClient with the Prisma 7 adapter pattern.
 * This client bypasses tenant filtering for test setup/cleanup.
 */
function createRawPrismaClient(): PrismaClient {
  // Reuse existing pool if available
  const pool =
    globalForTestPrisma.testPgPool ??
    new Pool({
      connectionString: process.env.DATABASE_URL,
    });

  // Cache the pool to prevent multiple pools during tests
  globalForTestPrisma.testPgPool = pool;

  // Create the Prisma adapter
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ['error'],
  });
}

/**
 * Singleton raw Prisma client for tests.
 * Use this for test setup, cleanup, and cross-tenant verification.
 */
export const rawPrisma =
  globalForTestPrisma.testPrisma ?? createRawPrismaClient();

// Cache the client
globalForTestPrisma.testPrisma = rawPrisma;

/**
 * Disconnect the raw Prisma client and close the pool.
 * Call this in afterAll for cleanup.
 */
export async function disconnectRawPrisma(): Promise<void> {
  await rawPrisma.$disconnect();
  if (globalForTestPrisma.testPgPool) {
    await globalForTestPrisma.testPgPool.end();
    globalForTestPrisma.testPgPool = undefined;
  }
}

export default rawPrisma;
