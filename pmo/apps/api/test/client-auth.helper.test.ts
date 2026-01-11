/// <reference types="vitest" />
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { hashPassword } from '../src/auth/password';
import prisma from '../src/prisma/client';
import {
  getAccessibleClientIds,
  hasLeadAccess,
  getLeadAccessFilter,
} from '../src/auth/client-auth.helper';

describe('client-auth.helper', () => {
  // Track created entities for cleanup
  const createdUserIds: number[] = [];
  const createdLeadIds: number[] = [];
  const createdTenantIds: string[] = [];

  // Test tenant for leads
  let testTenantId: string;

  beforeAll(async () => {
    // Create a test tenant for leads
    const tenant = await prisma.tenant.create({
      data: {
        name: `Test Tenant ${Date.now()}`,
        slug: `test-tenant-${Date.now()}`,
        status: 'ACTIVE',
        plan: 'STARTER',
      },
    });
    testTenantId = tenant.id;
    createdTenantIds.push(tenant.id);
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    if (createdLeadIds.length > 0) {
      await prisma.inboundLead.deleteMany({
        where: { id: { in: createdLeadIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    if (createdTenantIds.length > 0) {
      await prisma.tenant.deleteMany({
        where: { id: { in: createdTenantIds } },
      });
    }
  });

  const createUserWithRole = async (role: 'USER' | 'ADMIN' | 'SUPER_ADMIN') => {
    const passwordHash = await hashPassword('password123');
    const uniqueEmail = `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

    const user = await prisma.user.create({
      data: {
        name: `Test ${role} User`,
        email: uniqueEmail,
        passwordHash,
        timezone: 'UTC',
        role,
      },
    });

    createdUserIds.push(user.id);
    return user;
  };

  const createTestLead = async (ownerUserId?: number) => {
    const lead = await prisma.inboundLead.create({
      data: {
        name: 'Test Lead',
        email: `lead-${Date.now()}@example.com`,
        tenantId: testTenantId,
        ownerUserId,
      },
    });

    createdLeadIds.push(lead.id);
    return lead;
  };

  describe('getAccessibleClientIds', () => {
    it('returns null for ADMIN users (full access)', async () => {
      const adminUser = await createUserWithRole('ADMIN');
      const result = await getAccessibleClientIds(adminUser.id);
      expect(result).toBeNull();
    });

    it('returns null for SUPER_ADMIN users (full access)', async () => {
      const superAdminUser = await createUserWithRole('SUPER_ADMIN');
      const result = await getAccessibleClientIds(superAdminUser.id);
      expect(result).toBeNull();
    });

    it('returns array for regular USER (filtered access)', async () => {
      const regularUser = await createUserWithRole('USER');
      const result = await getAccessibleClientIds(regularUser.id);
      // Regular users get an array (possibly empty) instead of null
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('hasLeadAccess', () => {
    it('returns true for ADMIN users regardless of lead ownership', async () => {
      const adminUser = await createUserWithRole('ADMIN');
      const lead = await createTestLead(); // No owner assigned

      const result = await hasLeadAccess(adminUser.id, lead.id);
      expect(result).toBe(true);
    });

    it('returns true for SUPER_ADMIN users regardless of lead ownership', async () => {
      const superAdminUser = await createUserWithRole('SUPER_ADMIN');
      const lead = await createTestLead(); // No owner assigned

      const result = await hasLeadAccess(superAdminUser.id, lead.id);
      expect(result).toBe(true);
    });

    it('returns false for regular USER on unowned lead', async () => {
      const regularUser = await createUserWithRole('USER');
      const lead = await createTestLead(); // No owner assigned

      const result = await hasLeadAccess(regularUser.id, lead.id);
      expect(result).toBe(false);
    });

    it('returns true for regular USER on their own lead', async () => {
      const regularUser = await createUserWithRole('USER');
      const lead = await createTestLead(regularUser.id); // Owned by user

      const result = await hasLeadAccess(regularUser.id, lead.id);
      expect(result).toBe(true);
    });
  });

  describe('getLeadAccessFilter', () => {
    it('returns empty object for ADMIN users (no filter)', async () => {
      const adminUser = await createUserWithRole('ADMIN');
      const result = await getLeadAccessFilter(adminUser.id);
      expect(result).toEqual({});
    });

    it('returns empty object for SUPER_ADMIN users (no filter)', async () => {
      const superAdminUser = await createUserWithRole('SUPER_ADMIN');
      const result = await getLeadAccessFilter(superAdminUser.id);
      expect(result).toEqual({});
    });

    it('returns OR filter for regular USER', async () => {
      const regularUser = await createUserWithRole('USER');
      const result = await getLeadAccessFilter(regularUser.id);

      // Regular users get an OR filter with ownerUserId condition
      expect(result).toHaveProperty('OR');
      expect(Array.isArray((result as { OR: unknown[] }).OR)).toBe(true);
      expect((result as { OR: unknown[] }).OR).toContainEqual({
        ownerUserId: regularUser.id,
      });
    });
  });
});
