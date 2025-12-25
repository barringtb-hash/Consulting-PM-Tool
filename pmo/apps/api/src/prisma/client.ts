import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createTenantExtension } from './tenant-extension';

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createExtendedPrismaClient>;
  pgPool?: Pool;
};

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
    globalForPrisma.pgPool ??
    new Pool({
      connectionString: process.env.DATABASE_URL,
    });

  // Cache the pool in all environments to prevent memory leaks from multiple pool instances
  globalForPrisma.pgPool = pool;

  // Create the Prisma adapter
  const adapter = new PrismaPg(pool);

  const baseClient = new PrismaClient({
    adapter,
    // Disable Prisma's built-in stdout logging - our error middleware handles all error logging
    // In development, we still want query logs for debugging if needed
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
