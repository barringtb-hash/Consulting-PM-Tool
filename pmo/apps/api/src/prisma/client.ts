import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './tenant-extension';
import { hasTenantContext, getTenantId } from '../tenant/tenant.context';

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createExtendedPrismaClient>;
};

/**
 * Create a Prisma client with tenant isolation extension and RLS support.
 * The extension automatically filters queries by tenantId when tenant context is available.
 * Additionally, sets PostgreSQL session variable for Row-Level Security (RLS) enforcement.
 */
function createExtendedPrismaClient() {
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // Add middleware to set RLS context before each query
  baseClient.$use(async (params, next) => {
    if (hasTenantContext()) {
      const tenantId = getTenantId();
      // Set PostgreSQL session variable for RLS
      // Using transaction-local setting (true) so it only applies to this query
      await baseClient.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant', $1, true)`,
        tenantId,
      );
    } else {
      // Clear tenant context for system operations (migrations, seeds, admin)
      await baseClient.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant', '', true)`,
      );
    }
    return next(params);
  });

  return baseClient.$extends(createTenantExtension());
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
