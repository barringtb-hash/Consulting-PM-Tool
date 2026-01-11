/**
 * Tenant User Role Update Tests
 *
 * Tests for tenant user role management functionality,
 * including proper error handling for non-existent members.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as tenantService from '../src/tenant/tenant.service';
import * as tenantAdminService from '../src/admin/tenant-admin.service';
import {
  createTestTenant,
  createTestUser,
  addUserToTenant,
  getTestPrisma,
  disconnectTestPrisma,
  uniqueId,
} from './utils/tenant-test-utils';

describe('Tenant User Role Update', () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let existingUser: Awaited<ReturnType<typeof createTestUser>>;
  let nonMemberUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    // Create a test tenant
    tenant = await createTestTenant(`role-test-${uniqueId()}`);

    // Create users
    existingUser = await createTestUser(`existing-user-${uniqueId()}@test.com`);
    nonMemberUser = await createTestUser(`non-member-${uniqueId()}@test.com`);

    // Add only existingUser to the tenant
    await addUserToTenant(tenant.id, existingUser.id, 'MEMBER');
    // Note: nonMemberUser is NOT added to the tenant
  });

  afterAll(async () => {
    const rawPrisma = getTestPrisma();

    try {
      // Clean up tenant users first
      await rawPrisma.tenantUser.deleteMany({ where: { tenantId: tenant.id } });
      // Delete tenant
      await rawPrisma.tenant.delete({ where: { id: tenant.id } });
      // Delete test users
      await rawPrisma.user.delete({ where: { id: existingUser.id } });
      await rawPrisma.user.delete({ where: { id: nonMemberUser.id } });
    } catch {
      // Ignore cleanup errors
    }

    await disconnectTestPrisma();
  });

  describe('tenantService.updateUserRole', () => {
    it('should successfully update role for existing member', async () => {
      const result = await tenantService.updateUserRole(
        tenant.id,
        existingUser.id,
        'ADMIN',
      );

      expect(result).toBeDefined();
      expect(result.role).toBe('ADMIN');
      expect(result.userId).toBe(existingUser.id);
    });

    it('should throw "Member not found" error for non-member user', async () => {
      await expect(
        tenantService.updateUserRole(tenant.id, nonMemberUser.id, 'ADMIN'),
      ).rejects.toThrow('Member not found in this tenant');
    });

    it('should throw "Member not found" error for non-existent user ID', async () => {
      const nonExistentUserId = 999999;

      await expect(
        tenantService.updateUserRole(tenant.id, nonExistentUserId, 'ADMIN'),
      ).rejects.toThrow('Member not found in this tenant');
    });
  });

  describe('tenantAdminService.updateTenantUserRoleByAdmin', () => {
    it('should successfully update role for existing member', async () => {
      // First reset to MEMBER for this test
      await tenantService.updateUserRole(tenant.id, existingUser.id, 'MEMBER');

      const result = await tenantAdminService.updateTenantUserRoleByAdmin(
        tenant.id,
        existingUser.id,
        'ADMIN',
      );

      expect(result).toBeDefined();
      expect(result.role).toBe('ADMIN');
      expect(result.userId).toBe(existingUser.id);
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(existingUser.id);
    });

    it('should throw "Member not found" error for non-member user', async () => {
      await expect(
        tenantAdminService.updateTenantUserRoleByAdmin(
          tenant.id,
          nonMemberUser.id,
          'ADMIN',
        ),
      ).rejects.toThrow('Member not found in this tenant');
    });

    it('should throw "Member not found" error for non-existent user ID', async () => {
      const nonExistentUserId = 999999;

      await expect(
        tenantAdminService.updateTenantUserRoleByAdmin(
          tenant.id,
          nonExistentUserId,
          'ADMIN',
        ),
      ).rejects.toThrow('Member not found in this tenant');
    });
  });
});
