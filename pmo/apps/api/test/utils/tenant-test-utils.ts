/**
 * Tenant Test Utilities
 *
 * Helper functions for testing multi-tenant functionality.
 *
 * IMPORTANT: This module provides TWO types of Prisma clients:
 *
 * 1. `rawPrisma` (via getTestPrisma()) - Raw PrismaClient WITHOUT tenant extension
 *    Use for: Test setup, cleanup, cross-tenant data verification
 *    Example: Creating test tenants, users, cleaning up after tests
 *
 * 2. Extended Prisma (via getTenantAwarePrisma()) - Client WITH tenant filtering
 *    Use for: Testing actual service behavior with tenant isolation
 *    Example: Verifying tenant isolation works correctly
 */

import { PrismaClient } from '@prisma/client';
import { runWithTenantContextAsync } from '../../src/tenant/tenant.context';
import type { TenantContext } from '../../src/tenant/tenant.types';
import { prisma as extendedPrisma } from '../../src/prisma/client';

// Raw Prisma client for test setup/cleanup (bypasses tenant filtering)
// Use this for creating test data, tenants, users, and cross-tenant verification
const rawPrisma = new PrismaClient();

// Legacy alias for backward compatibility
const testPrisma = rawPrisma;

// Track tenants created by this module for targeted cleanup
const createdTenantIds: string[] = [];

/**
 * Create a test tenant with a unique slug.
 * Tracks the tenant ID for cleanup.
 */
export async function createTestTenant(suffix: string) {
  const tenant = await testPrisma.tenant.create({
    data: {
      name: `Test Tenant ${suffix}`,
      slug: `test-tenant-${suffix}-${Date.now()}`,
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
  });
  createdTenantIds.push(tenant.id);
  return tenant;
}

/**
 * Create a test user with a unique email.
 */
export async function createTestUser(email?: string) {
  const uniqueEmail = email || `test-user-${Date.now()}@test.com`;
  return testPrisma.user.create({
    data: {
      name: 'Test User',
      email: uniqueEmail,
      passwordHash: '$2a$10$test-hash-for-testing',
      role: 'USER',
      timezone: 'UTC',
    },
  });
}

/**
 * Add a user to a tenant.
 */
export async function addUserToTenant(
  tenantId: string,
  userId: number,
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' = 'MEMBER',
) {
  return testPrisma.tenantUser.create({
    data: {
      tenantId,
      userId,
      role,
      acceptedAt: new Date(),
    },
  });
}

/**
 * Create a default pipeline for a tenant.
 */
export async function createDefaultPipeline(tenantId: string) {
  return testPrisma.pipeline.create({
    data: {
      tenantId,
      name: 'Default Pipeline',
      isDefault: true,
      isActive: true,
      stages: {
        create: [
          { name: 'Lead', order: 0, probability: 10, type: 'OPEN' },
          { name: 'Qualified', order: 1, probability: 25, type: 'OPEN' },
          { name: 'Proposal', order: 2, probability: 50, type: 'OPEN' },
          { name: 'Negotiation', order: 3, probability: 75, type: 'OPEN' },
          { name: 'Won', order: 4, probability: 100, type: 'WON' },
          { name: 'Lost', order: 5, probability: 0, type: 'LOST' },
        ],
      },
    },
    include: {
      stages: true,
    },
  });
}

/**
 * Run a function within a specific tenant context.
 */
export function withTenant<T>(
  tenant: { id: string; slug: string; plan: string },
  fn: () => Promise<T>,
): Promise<T> {
  const context: TenantContext = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantPlan: tenant.plan as
      | 'TRIAL'
      | 'STARTER'
      | 'PROFESSIONAL'
      | 'ENTERPRISE',
  };
  return runWithTenantContextAsync(context, fn);
}

/**
 * Create an account within a tenant context.
 */
export async function createTestAccount(
  tenantId: string,
  ownerId: number,
  name?: string,
) {
  return testPrisma.account.create({
    data: {
      tenantId,
      name: name || `Test Account ${Date.now()}`,
      ownerId,
    },
  });
}

/**
 * Create an opportunity within a tenant context.
 */
export async function createTestOpportunity(
  tenantId: string,
  accountId: number,
  stageId: number,
  ownerId: number,
  name?: string,
) {
  return testPrisma.opportunity.create({
    data: {
      tenantId,
      name: name || `Test Opportunity ${Date.now()}`,
      accountId,
      stageId,
      ownerId,
      amount: 10000,
      probability: 50,
    },
  });
}

/**
 * Create a CRM contact within a tenant context.
 */
export async function createTestContact(
  tenantId: string,
  accountId: number,
  firstName?: string,
  lastName?: string,
) {
  return testPrisma.cRMContact.create({
    data: {
      tenantId,
      accountId,
      firstName: firstName || 'Test',
      lastName: lastName || `Contact-${Date.now()}`,
      email: `contact-${Date.now()}@test.com`,
    },
  });
}

/**
 * Cleanup test tenants and all related data.
 * Only cleans up tenants created by this module to avoid race conditions
 * with other test files running in parallel.
 */
export async function cleanupTestTenants() {
  if (createdTenantIds.length === 0) {
    return;
  }
  // Only delete tenants that were created by this module
  await testPrisma.tenant.deleteMany({
    where: { id: { in: createdTenantIds } },
  });
  // Clear the tracking array
  createdTenantIds.length = 0;
}

/**
 * Cleanup test users.
 */
export async function cleanupTestUsers() {
  await testPrisma.user.deleteMany({
    where: { email: { contains: '@test.com' } },
  });
}

/**
 * Full cleanup for test suite.
 */
export async function cleanupAll() {
  // Clean up in order to respect foreign key constraints
  await cleanupTestTenants();
  await cleanupTestUsers();
}

/**
 * Get raw Prisma client for direct queries (bypasses tenant extension).
 * Use this for test setup, cleanup, and cross-tenant verification.
 */
export function getTestPrisma() {
  return rawPrisma;
}

/**
 * Get tenant-aware Prisma client (with tenant extension).
 * Use this when testing service behavior that should respect tenant isolation.
 * Queries through this client will automatically filter by tenant context.
 */
export function getTenantAwarePrisma() {
  return extendedPrisma;
}

/**
 * Disconnect test Prisma client.
 */
export async function disconnectTestPrisma() {
  await rawPrisma.$disconnect();
}

// Export both clients for explicit usage
export { rawPrisma, extendedPrisma };
