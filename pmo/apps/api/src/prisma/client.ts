import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './tenant-extension';

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createExtendedPrismaClient>;
};

/**
 * Create a Prisma client with tenant isolation extension.
 * The extension automatically filters queries by tenantId when tenant context is available.
 */
function createExtendedPrismaClient() {
  const baseClient = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
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
