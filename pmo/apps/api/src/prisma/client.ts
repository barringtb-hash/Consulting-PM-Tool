import dotenv from 'dotenv';
// Ensure dotenv is loaded before Prisma tries to read DATABASE_URL
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createTenantExtension } from './tenant-extension';

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createExtendedPrismaClient>;
  pgPool?: Pool;
};

/**
 * Parse DATABASE_URL into pg Pool config options.
 * Handles various URL formats to avoid parsing issues with the Prisma adapter.
 */
function parseDbUrl(url: string | undefined): import('pg').PoolConfig {
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
      database: parsed.pathname.replace(/^\//, '') || undefined,
      user: parsed.username || parsed.searchParams.get('user') || undefined,
      password: parsed.password || undefined,
    };
  } catch {
    // Fallback to connectionString if URL parsing fails
    return { connectionString: url };
  }
}

/**
 * Create a Prisma client with tenant isolation extension and RLS support.
 * The extension automatically filters queries by tenantId when tenant context is available.
 * RLS context is set within the tenant extension's query handlers.
 *
 * Prisma 7 uses the adapter pattern with @prisma/adapter-pg for PostgreSQL connections.
 */
function createExtendedPrismaClient() {
  // Create a PostgreSQL connection pool (reuse existing if available)
  const pool =
    globalForPrisma.pgPool ?? new Pool(parseDbUrl(process.env.DATABASE_URL));

  // Cache the pool in all environments to prevent memory leaks from multiple pool instances
  globalForPrisma.pgPool = pool;

  // Create the Prisma adapter
  const adapter = new PrismaPg(pool);

  const baseClient = new PrismaClient({
    adapter,
    // Disable Prisma's built-in stdout logging - our error middleware handles all error logging
    // In development, we keep warning logs enabled for debugging schema issues
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn']
        : // Production: no logging - errors are handled by error.middleware.ts
          [],
  });

  // Return client with tenant extension
  // RLS context setting is now handled within the tenant extension
  return baseClient.$extends(createTenantExtension(baseClient));
}

export const prisma = globalForPrisma.prisma ?? createExtendedPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handler to close database connections
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
