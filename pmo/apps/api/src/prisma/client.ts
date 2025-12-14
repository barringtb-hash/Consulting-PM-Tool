import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './tenant-extension';

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createExtendedPrismaClient>;
};

/**
 * Create a Prisma client with tenant isolation extension and RLS support.
 * The extension automatically filters queries by tenantId when tenant context is available.
 * RLS context is set within the tenant extension's query handlers.
 */
function createExtendedPrismaClient() {
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
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
