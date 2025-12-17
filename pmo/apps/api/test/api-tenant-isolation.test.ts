/**
 * API-Level Tenant Isolation Tests
 *
 * Tests that verify tenant isolation at the HTTP API level using supertest.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { signToken } from '../src/auth/jwt';
import {
  createTestTenant,
  createTestUser,
  addUserToTenant,
  createDefaultPipeline,
  getTestPrisma,
  disconnectTestPrisma,
} from './utils/tenant-test-utils';

describe('API Tenant Isolation', () => {
  const app = createApp();
  let tenantA: Awaited<ReturnType<typeof createTestTenant>>;
  let tenantB: Awaited<ReturnType<typeof createTestTenant>>;
  let userA: Awaited<ReturnType<typeof createTestUser>>;
  let userB: Awaited<ReturnType<typeof createTestUser>>;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Create tenants
    tenantA = await createTestTenant('api-A');
    tenantB = await createTestTenant('api-B');

    // Create users
    userA = await createTestUser(
      `api-user-a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@test.com`,
    );
    userB = await createTestUser(
      `api-user-b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@test.com`,
    );

    // Add users to tenants
    await addUserToTenant(tenantA.id, userA.id, 'ADMIN');
    await addUserToTenant(tenantB.id, userB.id, 'ADMIN');

    // Create default pipelines
    await createDefaultPipeline(tenantA.id);
    await createDefaultPipeline(tenantB.id);

    // Generate JWT tokens
    tokenA = signToken({ userId: userA.id });
    tokenB = signToken({ userId: userB.id });
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
  // ACCOUNT API ISOLATION
  // ============================================================================

  describe('Account API Isolation', () => {
    let accountAId: number;

    it('should create account in tenant A', async () => {
      const res = await request(app)
        .post('/api/crm/accounts')
        .set('Cookie', `token=${tokenA}`)
        .set('X-Tenant-ID', tenantA.id)
        .send({ name: 'API Isolated Account A', ownerId: userA.id });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('API Isolated Account A');
      expect(res.body.data.tenantId).toBe(tenantA.id);
      accountAId = res.body.data.id;
    });

    it('should return 404 when tenant B tries to access tenant A account', async () => {
      const res = await request(app)
        .get(`/api/crm/accounts/${accountAId}`)
        .set('Cookie', `token=${tokenB}`)
        .set('X-Tenant-ID', tenantB.id);

      expect(res.status).toBe(404);
    });

    it('should return 404 when tenant B tries to update tenant A account', async () => {
      const res = await request(app)
        .put(`/api/crm/accounts/${accountAId}`)
        .set('Cookie', `token=${tokenB}`)
        .set('X-Tenant-ID', tenantB.id)
        .send({ name: 'Hacked Account!' });

      expect(res.status).toBe(404);
    });

    it('should not include tenant A accounts in tenant B list', async () => {
      // Create account in tenant B
      await request(app)
        .post('/api/crm/accounts')
        .set('Cookie', `token=${tokenB}`)
        .set('X-Tenant-ID', tenantB.id)
        .send({ name: 'API Isolated Account B', ownerId: userB.id });

      // List accounts from tenant B
      const res = await request(app)
        .get('/api/crm/accounts')
        .set('Cookie', `token=${tokenB}`)
        .set('X-Tenant-ID', tenantB.id);

      expect(res.status).toBe(200);
      // All accounts should belong to tenant B
      expect(
        res.body.data.every(
          (a: { tenantId: string }) => a.tenantId === tenantB.id,
        ),
      ).toBe(true);
      // Should not include tenant A's account
      expect(
        res.body.data.some(
          (a: { name: string }) => a.name === 'API Isolated Account A',
        ),
      ).toBe(false);
    });

    it('should return 404 when tenant B tries to delete tenant A account', async () => {
      const res = await request(app)
        .delete(`/api/crm/accounts/${accountAId}`)
        .set('Cookie', `token=${tokenB}`)
        .set('X-Tenant-ID', tenantB.id);

      expect(res.status).toBe(404);

      // Verify account still exists via tenant A
      const verifyRes = await request(app)
        .get(`/api/crm/accounts/${accountAId}`)
        .set('Cookie', `token=${tokenA}`)
        .set('X-Tenant-ID', tenantA.id);

      expect(verifyRes.status).toBe(200);
    });
  });

  // ============================================================================
  // OPPORTUNITY API ISOLATION
  // ============================================================================

  describe('Opportunity API Isolation', () => {
    let accountAId: number;
    let opportunityAId: number;
    let pipelineA: {
      id: number;
      stages: Array<{ id: number; name: string; order: number }>;
    } | null = null;

    beforeAll(async () => {
      // Get pipeline for tenant A
      const testPrisma = getTestPrisma();
      const pipeline = await testPrisma.pipeline.findFirst({
        where: { tenantId: tenantA.id, isDefault: true },
        include: { stages: true },
      });
      pipelineA = pipeline;

      // Create account in tenant A
      const accountRes = await request(app)
        .post('/api/crm/accounts')
        .set('Cookie', `token=${tokenA}`)
        .set('X-Tenant-ID', tenantA.id)
        .send({ name: 'Opp Test Account A', ownerId: userA.id });

      accountAId = accountRes.body.data.id;
    });

    it('should create opportunity in tenant A', async () => {
      const res = await request(app)
        .post('/api/crm/opportunities')
        .set('Cookie', `token=${tokenA}`)
        .set('X-Tenant-ID', tenantA.id)
        .send({
          name: 'API Isolated Opportunity A',
          accountId: accountAId,
          pipelineId: pipelineA?.id,
          stageId: pipelineA?.stages[0].id,
          amount: 50000,
          ownerId: userA.id,
        });

      expect(res.status).toBe(201);
      opportunityAId = res.body.data.id;
    });

    it('should return 404 when tenant B tries to access tenant A opportunity', async () => {
      const res = await request(app)
        .get(`/api/crm/opportunities/${opportunityAId}`)
        .set('Cookie', `token=${tokenB}`)
        .set('X-Tenant-ID', tenantB.id);

      expect(res.status).toBe(404);
    });

    it('should not leak opportunity data in list endpoint', async () => {
      const res = await request(app)
        .get('/api/crm/opportunities')
        .set('Cookie', `token=${tokenB}`)
        .set('X-Tenant-ID', tenantB.id);

      expect(res.status).toBe(200);
      // Should not include tenant A's opportunity
      expect(
        res.body.data.some((o: { id: number }) => o.id === opportunityAId),
      ).toBe(false);
    });
  });

  // ============================================================================
  // ACTIVITY API ISOLATION
  // ============================================================================

  describe('Activity API Isolation', () => {
    let accountAId: number;
    let activityAId: number;

    beforeAll(async () => {
      // Create account in tenant A
      const accountRes = await request(app)
        .post('/api/crm/accounts')
        .set('Cookie', `token=${tokenA}`)
        .set('X-Tenant-ID', tenantA.id)
        .send({ name: 'Activity Test Account A', ownerId: userA.id });

      accountAId = accountRes.body.data.id;
    });

    it('should create activity in tenant A', async () => {
      const res = await request(app)
        .post('/api/crm/activities')
        .set('Cookie', `token=${tokenA}`)
        .set('X-Tenant-ID', tenantA.id)
        .send({
          type: 'CALL',
          accountId: accountAId,
          subject: 'API Isolated Activity A',
          ownerId: userA.id,
        });

      expect(res.status).toBe(201);
      activityAId = res.body.data.id;
    });

    it('should return 404 when tenant B tries to access tenant A activity', async () => {
      const res = await request(app)
        .get(`/api/crm/activities/${activityAId}`)
        .set('Cookie', `token=${tokenB}`)
        .set('X-Tenant-ID', tenantB.id);

      expect(res.status).toBe(404);
    });

    it('should not leak activities in list endpoint', async () => {
      const res = await request(app)
        .get('/api/crm/activities')
        .set('Cookie', `token=${tokenB}`)
        .set('X-Tenant-ID', tenantB.id);

      expect(res.status).toBe(200);
      // Should not include tenant A's activity
      expect(
        res.body.data.some((a: { id: number }) => a.id === activityAId),
      ).toBe(false);
    });
  });

  // ============================================================================
  // CROSS-TENANT HEADER MANIPULATION
  // ============================================================================

  describe('Cross-Tenant Header Manipulation Prevention', () => {
    let accountAId: number;

    beforeAll(async () => {
      // Create account in tenant A
      const accountRes = await request(app)
        .post('/api/crm/accounts')
        .set('Cookie', `token=${tokenA}`)
        .set('X-Tenant-ID', tenantA.id)
        .send({ name: 'Header Test Account A', ownerId: userA.id });

      accountAId = accountRes.body.data.id;
    });

    it('should not allow user A to access tenant B by setting X-Tenant-ID header', async () => {
      // User A tries to pretend they're in tenant B
      // The middleware should verify user has access to the tenant
      const res = await request(app)
        .get('/api/crm/accounts')
        .set('Cookie', `token=${tokenA}`)
        .set('X-Tenant-ID', tenantB.id);

      // Should either return 403 or empty list (depending on middleware implementation)
      // Most importantly, should NOT return tenant B's data
      if (res.status === 200) {
        // If allowed, should not see tenant B data (user not a member)
        expect(
          res.body.data.every(
            (a: { tenantId: string }) => a.tenantId !== tenantB.id,
          ),
        ).toBe(true);
      } else {
        // Otherwise, should be forbidden
        expect([401, 403]).toContain(res.status);
      }
    });

    it('should not allow accessing another tenant account even with correct ID', async () => {
      // User B has valid token for tenant B, tries to access tenant A account by ID
      const res = await request(app)
        .get(`/api/crm/accounts/${accountAId}`)
        .set('Cookie', `token=${tokenB}`)
        .set('X-Tenant-ID', tenantB.id);

      expect(res.status).toBe(404);
    });
  });
});
