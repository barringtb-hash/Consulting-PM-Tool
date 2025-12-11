/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { hashPassword } from '../../src/auth/password';
import { createApp } from '../../src/app';
import prisma from '../../src/prisma/client';

const app = createApp();

/**
 * Helper to create authenticated agent with tenant context.
 * Creates user, tenant, and tenant membership in one operation.
 */
const createAuthenticatedAgentWithTenant = async () => {
  const password = 'password123';
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      name: 'CRM Test User',
      email: `crm-test-${Date.now()}@example.com`,
      passwordHash,
      timezone: 'UTC',
    },
  });

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Tenant',
      slug: `test-tenant-${Date.now()}`,
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
  });

  // Create tenant membership
  await prisma.tenantUser.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      role: 'OWNER',
    },
  });

  // Create default pipeline for tenant
  const pipeline = await prisma.pipeline.create({
    data: {
      tenantId: tenant.id,
      name: 'Default Pipeline',
      isDefault: true,
      stages: {
        create: [
          { name: 'Prospecting', order: 1, probability: 10 },
          { name: 'Qualification', order: 2, probability: 25 },
          { name: 'Proposal', order: 3, probability: 50 },
          { name: 'Closed Won', order: 4, probability: 100, type: 'WON' },
          { name: 'Closed Lost', order: 5, probability: 0, type: 'LOST' },
        ],
      },
    },
    include: { stages: true },
  });

  // Login
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password });

  return { agent, user, tenant, pipeline };
};

describe('CRM Account Routes', () => {
  it('blocks unauthenticated access', async () => {
    const response = await request(app).get('/api/crm/accounts');
    expect(response.status).toBe(401);
  });

  it('performs basic CRUD operations on accounts', async () => {
    const { agent, user } = await createAuthenticatedAgentWithTenant();

    // CREATE
    const createResponse = await agent.post('/api/crm/accounts').send({
      name: 'Acme Corporation',
      website: 'https://acme.com',
      type: 'PROSPECT',
      industry: 'Technology',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data).toMatchObject({
      name: 'Acme Corporation',
      type: 'PROSPECT',
    });
    const accountId = createResponse.body.data.id;

    // READ
    const getResponse = await agent.get(`/api/crm/accounts/${accountId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.name).toBe('Acme Corporation');
    expect(getResponse.body.data.ownerId).toBe(user.id);

    // UPDATE
    const updateResponse = await agent.put(`/api/crm/accounts/${accountId}`).send({
      type: 'CUSTOMER',
      healthScore: 85,
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.type).toBe('CUSTOMER');
    expect(updateResponse.body.data.healthScore).toBe(85);

    // LIST
    const listResponse = await agent.get('/api/crm/accounts');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.length).toBeGreaterThanOrEqual(1);

    // ARCHIVE
    const archiveResponse = await agent.post(`/api/crm/accounts/${accountId}/archive`);
    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.data.archived).toBe(true);

    // DELETE
    const deleteResponse = await agent.delete(`/api/crm/accounts/${accountId}`);
    expect(deleteResponse.status).toBe(204);
  });

  it('enforces tenant isolation', async () => {
    // Create two separate tenant contexts
    const { agent: agent1, tenant: tenant1 } = await createAuthenticatedAgentWithTenant();
    const { agent: agent2 } = await createAuthenticatedAgentWithTenant();

    // Create account in tenant 1
    const createResponse = await agent1.post('/api/crm/accounts').send({
      name: 'Tenant 1 Account',
      type: 'PROSPECT',
    });
    expect(createResponse.status).toBe(201);
    const accountId = createResponse.body.data.id;

    // Verify account belongs to tenant 1
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    expect(account?.tenantId).toBe(tenant1.id);

    // Tenant 2 should NOT see tenant 1's account
    const tenant2List = await agent2.get('/api/crm/accounts');
    expect(tenant2List.status).toBe(200);
    const accountIds = tenant2List.body.data.map((a: { id: number }) => a.id);
    expect(accountIds).not.toContain(accountId);
  });
});
