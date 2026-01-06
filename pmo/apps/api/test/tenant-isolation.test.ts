/**
 * Tenant Isolation Tests
 *
 * Comprehensive tests to verify that tenant isolation cannot be bypassed.
 * These tests ensure that data from one tenant is never accessible by another.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { prisma } from '../src/prisma/client';
import * as accountService from '../src/crm/services/account.service';
import * as opportunityService from '../src/crm/services/opportunity.service';
import * as activityService from '../src/crm/services/activity.service';
import {
  createTestTenant,
  createTestUser,
  addUserToTenant,
  createDefaultPipeline,
  createTestAccount,
  createTestOpportunity,
  createTestContact,
  withTenant,
  getTestPrisma,
  disconnectTestPrisma,
} from './utils/tenant-test-utils';

describe('Tenant Isolation', () => {
  let tenantA: Awaited<ReturnType<typeof createTestTenant>>;
  let tenantB: Awaited<ReturnType<typeof createTestTenant>>;
  let userA: Awaited<ReturnType<typeof createTestUser>>;
  let userB: Awaited<ReturnType<typeof createTestUser>>;
  let pipelineA: Awaited<ReturnType<typeof createDefaultPipeline>>;
  let pipelineB: Awaited<ReturnType<typeof createDefaultPipeline>>;

  beforeAll(async () => {
    // Create two separate tenants
    tenantA = await createTestTenant('A');
    tenantB = await createTestTenant('B');

    // Create users and add to tenants
    userA = await createTestUser(
      `user-a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@test.com`,
    );
    userB = await createTestUser(
      `user-b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@test.com`,
    );

    await addUserToTenant(tenantA.id, userA.id, 'ADMIN');
    await addUserToTenant(tenantB.id, userB.id, 'ADMIN');

    // Create default pipelines
    pipelineA = await createDefaultPipeline(tenantA.id);
    pipelineB = await createDefaultPipeline(tenantB.id);
  });

  afterAll(async () => {
    // Clean up only the specific tenants created by this test file
    // Do NOT use cleanupAll() as it deletes ALL test tenants including those from parallel tests
    const rawPrisma = getTestPrisma();
    const tenantIds = [tenantA?.id, tenantB?.id].filter(Boolean);

    for (const tenantId of tenantIds) {
      try {
        // Delete in order to respect foreign key constraints
        await rawPrisma.account.deleteMany({ where: { tenantId } });
        await rawPrisma.salesPipelineStage.deleteMany({
          where: { pipeline: { tenantId } },
        });
        await rawPrisma.pipeline.deleteMany({ where: { tenantId } });
        await rawPrisma.tenantUser.deleteMany({ where: { tenantId } });
        await rawPrisma.tenant.delete({ where: { id: tenantId } });
      } catch {
        // Ignore cleanup errors
      }
    }

    // Clean up users
    const userIds = [userA?.id, userB?.id].filter(Boolean);
    for (const userId of userIds) {
      try {
        await rawPrisma.user.delete({ where: { id: userId } });
      } catch {
        // User may have other associations
      }
    }

    await disconnectTestPrisma();
  });

  // ============================================================================
  // ACCOUNT ISOLATION TESTS
  // ============================================================================

  describe('Account Isolation', () => {
    let accountA: Awaited<ReturnType<typeof createTestAccount>>;
    let accountB: Awaited<ReturnType<typeof createTestAccount>>;

    beforeEach(async () => {
      // Create account in tenant A
      accountA = await createTestAccount(
        tenantA.id,
        userA.id,
        'Tenant A Account',
      );

      // Create account in tenant B
      accountB = await createTestAccount(
        tenantB.id,
        userB.id,
        'Tenant B Account',
      );
    });

    afterEach(async () => {
      // Cleanup accounts
      const testPrisma = getTestPrisma();
      await testPrisma.account.deleteMany({
        where: { name: { contains: 'Tenant' } },
      });
    });

    it('should not allow tenant A to see tenant B accounts via listAccounts', async () => {
      const accounts = await withTenant(tenantA, () =>
        accountService.listAccounts({}, { page: 1, limit: 100 }),
      );

      // Tenant A should only see their own accounts
      const hasOwnAccount = accounts.data.some((a) => a.id === accountA.id);
      const hasTenantBAccount = accounts.data.some((a) => a.id === accountB.id);

      expect(hasOwnAccount).toBe(true);
      expect(hasTenantBAccount).toBe(false);
    });

    it('should return null when tenant A tries to get tenant B account by ID', async () => {
      const account = await withTenant(tenantA, () =>
        accountService.getAccountById(accountB.id),
      );

      expect(account).toBeNull();
    });

    it('should not allow tenant A to update tenant B account', async () => {
      await expect(
        withTenant(tenantA, () =>
          accountService.updateAccount(accountB.id, {
            name: 'Hacked Account!',
          }),
        ),
      ).rejects.toThrow();
    });

    it('should not allow tenant A to archive tenant B account', async () => {
      await expect(
        withTenant(tenantA, () => accountService.archiveAccount(accountB.id)),
      ).rejects.toThrow();
    });

    it('should not allow tenant A to delete tenant B account', async () => {
      await expect(
        withTenant(tenantA, () => accountService.deleteAccount(accountB.id)),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // OPPORTUNITY ISOLATION TESTS
  // ============================================================================

  describe('Opportunity Isolation', () => {
    let accountA: Awaited<ReturnType<typeof createTestAccount>>;
    let accountB: Awaited<ReturnType<typeof createTestAccount>>;
    let oppA: Awaited<ReturnType<typeof createTestOpportunity>>;
    let oppB: Awaited<ReturnType<typeof createTestOpportunity>>;

    beforeEach(async () => {
      // Create accounts
      accountA = await createTestAccount(tenantA.id, userA.id);
      accountB = await createTestAccount(tenantB.id, userB.id);

      // Create opportunities
      const stageA = pipelineA.stages[0];
      const stageB = pipelineB.stages[0];

      oppA = await createTestOpportunity(
        tenantA.id,
        accountA.id,
        stageA.id,
        userA.id,
        'Tenant A Deal',
      );

      oppB = await createTestOpportunity(
        tenantB.id,
        accountB.id,
        stageB.id,
        userB.id,
        'Tenant B Deal',
      );
    });

    afterEach(async () => {
      const testPrisma = getTestPrisma();
      await testPrisma.opportunity.deleteMany({
        where: { name: { contains: 'Tenant' } },
      });
      await testPrisma.account.deleteMany({
        where: { name: { contains: 'Test Account' } },
      });
    });

    it('should not leak opportunities across tenants in list', async () => {
      const opportunities = await withTenant(tenantA, () =>
        opportunityService.listOpportunities({}, { page: 1, limit: 100 }),
      );

      expect(opportunities.data.some((o) => o.id === oppA.id)).toBe(true);
      expect(opportunities.data.some((o) => o.id === oppB.id)).toBe(false);
    });

    it('should not allow tenant A to get tenant B opportunity by ID', async () => {
      const opp = await withTenant(tenantA, () =>
        opportunityService.getOpportunityById(oppB.id),
      );

      expect(opp).toBeNull();
    });

    it('should not allow tenant A to update tenant B opportunity', async () => {
      await expect(
        withTenant(tenantA, () =>
          opportunityService.updateOpportunity(oppB.id, {
            name: 'Hacked Deal!',
          }),
        ),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // CRM CONTACT ISOLATION TESTS
  // ============================================================================

  describe('CRMContact Isolation', () => {
    let accountA: Awaited<ReturnType<typeof createTestAccount>>;
    let accountB: Awaited<ReturnType<typeof createTestAccount>>;
    let contactA: Awaited<ReturnType<typeof createTestContact>>;
    let contactB: Awaited<ReturnType<typeof createTestContact>>;

    beforeEach(async () => {
      accountA = await createTestAccount(tenantA.id, userA.id);
      accountB = await createTestAccount(tenantB.id, userB.id);

      contactA = await createTestContact(tenantA.id, accountA.id, 'Alice', 'A');
      contactB = await createTestContact(tenantB.id, accountB.id, 'Bob', 'B');
    });

    afterEach(async () => {
      const testPrisma = getTestPrisma();
      await testPrisma.cRMContact.deleteMany({
        where: {
          OR: [{ firstName: 'Alice' }, { firstName: 'Bob' }],
        },
      });
      await testPrisma.account.deleteMany({
        where: { name: { contains: 'Test Account' } },
      });
    });

    it('should not allow tenant A to see tenant B contacts', async () => {
      const testPrisma = getTestPrisma();

      // Query within tenant A context using the extended prisma client
      const contacts = await withTenant(tenantA, async () => {
        return prisma.cRMContact.findMany({
          where: {
            id: { in: [contactA.id, contactB.id] },
          },
        });
      });

      // Only tenant A's contact should be visible
      expect(contacts.length).toBe(1);
      expect(contacts[0].id).toBe(contactA.id);
    });
  });

  // ============================================================================
  // PIPELINE ISOLATION TESTS
  // ============================================================================

  describe('Pipeline Isolation', () => {
    it('should not allow tenant A to see tenant B pipelines', async () => {
      const pipelines = await withTenant(tenantA, async () => {
        return prisma.pipeline.findMany({});
      });

      // All pipelines should belong to tenant A
      expect(pipelines.every((p) => p.tenantId === tenantA.id)).toBe(true);
      expect(pipelines.some((p) => p.id === pipelineB.id)).toBe(false);
    });

    it('should not allow tenant A to access tenant B pipeline by ID', async () => {
      const pipeline = await withTenant(tenantA, async () => {
        return prisma.pipeline.findFirst({
          where: { id: pipelineB.id },
        });
      });

      expect(pipeline).toBeNull();
    });
  });

  // ============================================================================
  // ACTIVITY ISOLATION TESTS
  // ============================================================================

  describe('Activity Isolation', () => {
    let accountA: Awaited<ReturnType<typeof createTestAccount>>;
    let accountB: Awaited<ReturnType<typeof createTestAccount>>;

    beforeEach(async () => {
      accountA = await createTestAccount(tenantA.id, userA.id);
      accountB = await createTestAccount(tenantB.id, userB.id);
    });

    afterEach(async () => {
      const testPrisma = getTestPrisma();
      await testPrisma.cRMActivity.deleteMany({
        where: { subject: { contains: 'Test Activity' } },
      });
      await testPrisma.account.deleteMany({
        where: { name: { contains: 'Test Account' } },
      });
    });

    it('should not leak activities across tenants', async () => {
      // Create activity in tenant A
      await withTenant(tenantA, () =>
        activityService.createActivity({
          type: 'CALL',
          accountId: accountA.id,
          subject: 'Test Activity A',
          ownerId: userA.id,
          createdById: userA.id,
        }),
      );

      // Create activity in tenant B
      await withTenant(tenantB, () =>
        activityService.createActivity({
          type: 'CALL',
          accountId: accountB.id,
          subject: 'Test Activity B',
          ownerId: userB.id,
          createdById: userB.id,
        }),
      );

      // List activities from tenant A
      const activitiesA = await withTenant(tenantA, () =>
        activityService.listActivities({}, { page: 1, limit: 100 }),
      );

      // Only tenant A's activity should be visible
      expect(
        activitiesA.data.some((a) => a.subject === 'Test Activity A'),
      ).toBe(true);
      expect(
        activitiesA.data.some((a) => a.subject === 'Test Activity B'),
      ).toBe(false);
    });
  });

  // ============================================================================
  // DIRECT DATABASE ACCESS TESTS
  // ============================================================================

  describe('Direct Database Query Protection', () => {
    let accountA: Awaited<ReturnType<typeof createTestAccount>>;

    beforeEach(async () => {
      accountA = await createTestAccount(tenantA.id, userA.id);
    });

    afterEach(async () => {
      const testPrisma = getTestPrisma();
      await testPrisma.account.deleteMany({
        where: { name: { contains: 'Test Account' } },
      });
    });

    it('should filter accounts even with findMany without explicit tenantId', async () => {
      // When querying within tenant context, even if we don't specify tenantId,
      // the extension should add it automatically
      const accounts = await withTenant(tenantA, async () => {
        return prisma.account.findMany({});
      });

      // All accounts should belong to tenant A
      expect(accounts.every((a) => a.tenantId === tenantA.id)).toBe(true);
    });

    it('should protect findFirst queries', async () => {
      // Try to find account that belongs to tenant A while in tenant B context
      const account = await withTenant(tenantB, async () => {
        return prisma.account.findFirst({
          where: { id: accountA.id },
        });
      });

      // Should not find the account
      expect(account).toBeNull();
    });

    it('should protect count queries', async () => {
      // Count accounts from tenant A context
      const countA = await withTenant(tenantA, async () => {
        return prisma.account.count({});
      });

      // Count accounts from tenant B context
      const countB = await withTenant(tenantB, async () => {
        return prisma.account.count({});
      });

      // Counts should be independent
      expect(countA).toBeGreaterThanOrEqual(1);
      // Tenant B was created without accounts (beyond what's in beforeEach)
      // The counts should differ
      expect(countA).not.toBe(countB);
    });
  });

  // ============================================================================
  // ACCOUNT HIERARCHY ISOLATION TESTS
  // ============================================================================

  describe('Account Hierarchy Isolation', () => {
    let accountA: Awaited<ReturnType<typeof createTestAccount>>;
    let accountB: Awaited<ReturnType<typeof createTestAccount>>;
    let childAccountA: Awaited<ReturnType<typeof createTestAccount>>;

    beforeEach(async () => {
      // Create parent account in tenant A
      accountA = await createTestAccount(
        tenantA.id,
        userA.id,
        'Parent Account A',
      );

      // Create child account in tenant A with parent
      const testPrisma = getTestPrisma();
      childAccountA = await testPrisma.account.create({
        data: {
          tenantId: tenantA.id,
          name: 'Child Account A',
          type: 'PROSPECT',
          ownerId: userA.id,
          parentAccountId: accountA.id,
        },
      });

      // Create account in tenant B
      accountB = await createTestAccount(tenantB.id, userB.id, 'Account B');
    });

    afterEach(async () => {
      const testPrisma = getTestPrisma();
      await testPrisma.account.deleteMany({
        where: {
          OR: [
            { name: { contains: 'Parent Account' } },
            { name: { contains: 'Child Account' } },
            { name: { contains: 'Account B' } },
          ],
        },
      });
    });

    it('should not leak parent account from another tenant', async () => {
      // Get account with hierarchy from tenant A
      const account = await withTenant(tenantA, () =>
        accountService.getAccountById(childAccountA.id),
      );

      expect(account).not.toBeNull();
      expect(account?.parentAccount).not.toBeNull();
      expect(account?.parentAccount?.id).toBe(accountA.id);
    });

    it('should not leak child accounts from another tenant', async () => {
      // Get account with hierarchy from tenant A
      const account = await withTenant(tenantA, () =>
        accountService.getAccountById(accountA.id),
      );

      expect(account).not.toBeNull();
      expect(account?.childAccounts).toBeDefined();
      expect(account?.childAccounts?.length).toBe(1);
      expect(account?.childAccounts?.[0]?.id).toBe(childAccountA.id);
    });

    it('should not allow creating account with cross-tenant parent', async () => {
      // Try to create account in tenant A with parent from tenant B
      await expect(
        withTenant(tenantA, () =>
          accountService.createAccount({
            name: 'Cross-Tenant Child',
            type: 'PROSPECT',
            ownerId: userA.id,
            parentAccountId: accountB.id, // Parent from tenant B
          }),
        ),
      ).rejects.toThrow('Parent account not found or does not belong to this tenant');
    });

    it('should not allow updating account to use cross-tenant parent', async () => {
      // Try to update tenant A account to have parent from tenant B
      await expect(
        withTenant(tenantA, () =>
          accountService.updateAccount(accountA.id, {
            parentAccountId: accountB.id, // Parent from tenant B
          }),
        ),
      ).rejects.toThrow('Parent account not found or does not belong to this tenant');
    });

    it('should prevent circular parent reference', async () => {
      // Try to set account as its own parent
      await expect(
        withTenant(tenantA, () =>
          accountService.updateAccount(accountA.id, {
            parentAccountId: accountA.id,
          }),
        ),
      ).rejects.toThrow('An account cannot be its own parent');
    });
  });

  // ============================================================================
  // CROSS-TENANT UPDATE/DELETE PREVENTION
  // ============================================================================

  describe('Cross-Tenant Modification Prevention', () => {
    let accountA: Awaited<ReturnType<typeof createTestAccount>>;

    beforeEach(async () => {
      accountA = await createTestAccount(
        tenantA.id,
        userA.id,
        'Protected Account',
      );
    });

    afterEach(async () => {
      const testPrisma = getTestPrisma();
      await testPrisma.account.deleteMany({
        where: { name: { contains: 'Protected Account' } },
      });
    });

    it('should prevent update from wrong tenant context', async () => {
      // Attempt to update tenant A account while in tenant B context
      await expect(
        withTenant(tenantB, async () => {
          return prisma.account.update({
            where: { id: accountA.id },
            data: { name: 'Hacked!' },
          });
        }),
      ).rejects.toThrow();

      // Verify account was not modified
      const testPrisma = getTestPrisma();
      const account = await testPrisma.account.findUnique({
        where: { id: accountA.id },
      });
      expect(account?.name).toBe('Protected Account');
    });

    it('should prevent delete from wrong tenant context', async () => {
      // Attempt to delete tenant A account while in tenant B context
      await expect(
        withTenant(tenantB, async () => {
          return prisma.account.delete({
            where: { id: accountA.id },
          });
        }),
      ).rejects.toThrow();

      // Verify account still exists
      const testPrisma = getTestPrisma();
      const account = await testPrisma.account.findUnique({
        where: { id: accountA.id },
      });
      expect(account).not.toBeNull();
    });
  });
});
