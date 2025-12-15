/**
 * Shared Test Fixtures
 *
 * Provides standardized test environment setup with proper tenant context.
 * This ensures all legacy PMO tests properly establish tenant associations.
 */

import { PrismaClient } from '@prisma/client';
import type { Application } from 'express';
import request from 'supertest';
import { hashPassword } from '../../src/auth/password';
import { signToken } from '../../src/auth/jwt';

// Raw Prisma client for test setup/cleanup (bypasses tenant filtering)
const rawPrisma = new PrismaClient();

/**
 * Test environment containing tenant, user, token, and pipeline
 */
export interface TestEnvironment {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
  };
  token: string;
  password: string;
  pipeline: {
    id: number;
    stages: Array<{ id: number; name: string; order: number }>;
  } | null;
}

/**
 * Create a complete test environment with tenant, user, and proper associations.
 *
 * This is the standard way to set up tests for tenant-scoped models:
 * - Creates a tenant
 * - Creates a user
 * - Associates user with tenant via TenantUser
 * - Generates JWT token
 * - Optionally creates a default pipeline for CRM tests
 *
 * @param suffix - Unique suffix for this test environment (default: timestamp)
 * @param options - Configuration options
 */
export async function createTestEnvironment(
  suffix: string = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  options: { createPipeline?: boolean } = { createPipeline: false },
): Promise<TestEnvironment> {
  // 1. Create tenant
  const tenant = await rawPrisma.tenant.create({
    data: {
      id: `test-tenant-${suffix}`,
      name: `Test Tenant ${suffix}`,
      slug: `test-tenant-${suffix}`,
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
  });

  // 2. Create user with unique email
  const password = 'password123';
  const passwordHash = await hashPassword(password);
  const user = await rawPrisma.user.create({
    data: {
      name: `Test User ${suffix}`,
      email: `test-${suffix}@example.com`,
      passwordHash,
      timezone: 'UTC',
    },
  });

  // 3. Associate user with tenant (CRITICAL for tenant middleware)
  await rawPrisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'ADMIN',
      acceptedAt: new Date(),
    },
  });

  // 4. Generate JWT token
  const token = signToken({ userId: user.id });

  // 5. Optionally create default pipeline for CRM tests
  let pipeline: TestEnvironment['pipeline'] = null;
  if (options.createPipeline) {
    const createdPipeline = await rawPrisma.pipeline.create({
      data: {
        tenantId: tenant.id,
        name: 'Default Pipeline',
        isDefault: true,
        isActive: true,
        stages: {
          create: [
            { name: 'Lead', order: 0, probability: 10, type: 'OPEN' },
            { name: 'Qualified', order: 1, probability: 25, type: 'OPEN' },
            { name: 'Won', order: 2, probability: 100, type: 'WON' },
            { name: 'Lost', order: 3, probability: 0, type: 'LOST' },
          ],
        },
      },
      include: { stages: true },
    });
    pipeline = {
      id: createdPipeline.id,
      stages: createdPipeline.stages.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
      })),
    };
  }

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token,
    password,
    pipeline,
  };
}

/**
 * Create a supertest agent wrapper that automatically includes tenant headers.
 *
 * All requests made through this agent will have:
 * - Cookie: token=<jwt>
 * - X-Tenant-ID: <tenantId>
 *
 * @param app - Express application
 * @param token - JWT token
 * @param tenantId - Tenant ID
 */
export function createTenantAgent(
  app: Application,
  token: string,
  tenantId: string,
) {
  const setHeaders = (req: request.Test) =>
    req.set('Cookie', `token=${token}`).set('X-Tenant-ID', tenantId);

  return {
    get: (url: string) => setHeaders(request(app).get(url)),
    post: (url: string) => setHeaders(request(app).post(url)),
    put: (url: string) => setHeaders(request(app).put(url)),
    patch: (url: string) => setHeaders(request(app).patch(url)),
    delete: (url: string) => setHeaders(request(app).delete(url)),
  };
}

/**
 * Clean up a test environment and all associated data.
 *
 * Deletes in proper order to respect foreign key constraints:
 * 1. Tasks (depends on Project, Milestone)
 * 2. Milestones (depends on Project)
 * 3. Meetings (depends on Project)
 * 4. Documents (depends on Project)
 * 5. Projects (depends on Client, Account)
 * 6. Clients (depends on Tenant)
 * 7. CRMActivities (explicitly cleaned, cascade would also handle via Tenant)
 * 8. CRMContacts (explicitly cleaned, cascade would also handle via Tenant)
 * 9. Accounts (depends on Tenant)
 * 10. Pipelines (stages cascade-deleted automatically)
 * 11. TenantUser (depends on Tenant, User)
 * 12. Users created for this tenant
 * 13. Tenant
 *
 * @param tenantId - The tenant ID to clean up
 */
export async function cleanupTestEnvironment(tenantId: string): Promise<void> {
  try {
    // Delete tasks first (they depend on projects and milestones)
    await rawPrisma.task.deleteMany({
      where: { project: { tenantId } },
    });

    // Delete milestones (they depend on projects)
    await rawPrisma.milestone.deleteMany({
      where: { project: { tenantId } },
    });

    // Delete meetings (they depend on projects)
    await rawPrisma.meeting.deleteMany({
      where: { project: { tenantId } },
    });

    // Delete documents (they depend on projects)
    await rawPrisma.document.deleteMany({
      where: { project: { tenantId } },
    });

    // Delete projects (they depend on clients and accounts)
    await rawPrisma.project.deleteMany({
      where: { tenantId },
    });

    // Delete clients
    await rawPrisma.client.deleteMany({
      where: { tenantId },
    });

    // Delete CRM activities (explicitly for clarity; cascade via Tenant would also work)
    await rawPrisma.cRMActivity.deleteMany({
      where: { tenantId },
    });

    // Delete CRM contacts (explicitly for clarity; cascade via Tenant would also work)
    await rawPrisma.cRMContact.deleteMany({
      where: { tenantId },
    });

    // Delete accounts
    await rawPrisma.account.deleteMany({
      where: { tenantId },
    });

    // Delete pipelines (stages are cascade-deleted automatically via onDelete: Cascade)
    await rawPrisma.pipeline.deleteMany({
      where: { tenantId },
    });

    // Get user IDs associated with this tenant before deleting TenantUser records
    const tenantUsers = await rawPrisma.tenantUser.findMany({
      where: { tenantId },
      select: { userId: true },
    });
    const userIds = tenantUsers.map((tu) => tu.userId);

    // Delete tenant-user associations
    await rawPrisma.tenantUser.deleteMany({
      where: { tenantId },
    });

    // Delete users that were created for this tenant
    // (only if they're not associated with other tenants)
    for (const userId of userIds) {
      const otherTenantAssociations = await rawPrisma.tenantUser.count({
        where: { userId },
      });
      if (otherTenantAssociations === 0) {
        await rawPrisma.user.delete({ where: { id: userId } }).catch(() => {
          // User might have been deleted already or have other dependencies
        });
      }
    }

    // Finally delete the tenant
    await rawPrisma.tenant.delete({
      where: { id: tenantId },
    });
  } catch (error) {
    // Log but don't throw - cleanup failures shouldn't fail tests
    console.warn(`Cleanup warning for tenant ${tenantId}:`, error);
  }
}

/**
 * Create a client within a test environment.
 *
 * @param tenantId - Tenant ID
 * @param name - Client name (default: "Test Client")
 */
export async function createTestClient(tenantId: string, name = 'Test Client') {
  return rawPrisma.client.create({
    data: {
      name,
      tenantId,
    },
  });
}

/**
 * Create an account within a test environment.
 *
 * @param tenantId - Tenant ID
 * @param ownerId - Owner user ID
 * @param name - Account name (default: "Test Account")
 */
export async function createTestAccount(
  tenantId: string,
  ownerId: number,
  name = 'Test Account',
) {
  return rawPrisma.account.create({
    data: {
      name,
      tenantId,
      ownerId,
    },
  });
}

/**
 * Create a project within a test environment.
 *
 * @param tenantId - Tenant ID
 * @param clientId - Client ID
 * @param ownerId - Owner user ID
 * @param options - Additional project options
 */
export async function createTestProject(
  tenantId: string,
  clientId: number,
  ownerId: number,
  options: {
    name?: string;
    accountId?: number;
    status?: 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  } = {},
) {
  return rawPrisma.project.create({
    data: {
      name: options.name ?? 'Test Project',
      tenantId,
      clientId,
      ownerId,
      accountId: options.accountId,
      status: options.status ?? 'PLANNING',
    },
  });
}

/**
 * Get the raw Prisma client for direct database operations.
 * Use this for setup/cleanup operations that need to bypass tenant filtering.
 */
export function getRawPrisma() {
  return rawPrisma;
}

/**
 * Disconnect the raw Prisma client.
 * Call this in afterAll if you're managing the client lifecycle manually.
 */
export async function disconnectRawPrisma() {
  await rawPrisma.$disconnect();
}

export { rawPrisma };
