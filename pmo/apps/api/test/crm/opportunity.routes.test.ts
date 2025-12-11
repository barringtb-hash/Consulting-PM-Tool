/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { hashPassword } from '../../src/auth/password';
import { createApp } from '../../src/app';
import prisma from '../../src/prisma/client';

const app = createApp();

/**
 * Helper to create authenticated agent with tenant, account, and pipeline.
 */
const createTestContext = async () => {
  const password = 'password123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: 'Opportunity Test User',
      email: `opp-test-${Date.now()}@example.com`,
      passwordHash,
      timezone: 'UTC',
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Opportunity Test Tenant',
      slug: `opp-tenant-${Date.now()}`,
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
  });

  await prisma.tenantUser.create({
    data: { userId: user.id, tenantId: tenant.id, role: 'OWNER' },
  });

  const pipeline = await prisma.pipeline.create({
    data: {
      tenantId: tenant.id,
      name: 'Sales Pipeline',
      isDefault: true,
      stages: {
        create: [
          { name: 'Qualification', order: 1, probability: 20 },
          { name: 'Proposal', order: 2, probability: 50 },
          { name: 'Negotiation', order: 3, probability: 75 },
          { name: 'Closed Won', order: 4, probability: 100, type: 'WON' },
          { name: 'Closed Lost', order: 5, probability: 0, type: 'LOST' },
        ],
      },
    },
    include: { stages: { orderBy: { order: 'asc' } } },
  });

  const account = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      name: 'Test Account',
      type: 'PROSPECT',
      ownerId: user.id,
    },
  });

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password });

  return { agent, user, tenant, pipeline, account };
};

describe('CRM Opportunity Routes', () => {
  it('creates and manages opportunities through pipeline stages', async () => {
    const { agent, account, pipeline } = await createTestContext();
    const qualificationStage = pipeline.stages[0];
    const proposalStage = pipeline.stages[1];

    // CREATE opportunity
    const createResponse = await agent.post('/api/crm/opportunities').send({
      name: 'Big Deal',
      accountId: account.id,
      pipelineId: pipeline.id,
      stageId: qualificationStage.id,
      amount: 50000,
      expectedCloseDate: '2025-03-15',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data).toMatchObject({
      name: 'Big Deal',
      amount: '50000',
      status: 'OPEN',
    });
    const oppId = createResponse.body.data.id;

    // MOVE to next stage
    const moveResponse = await agent
      .post(`/api/crm/opportunities/${oppId}/stage`)
      .send({ stageId: proposalStage.id });
    expect(moveResponse.status).toBe(200);
    expect(moveResponse.body.data.stageId).toBe(proposalStage.id);

    // MARK as won (API finds WON stage automatically)
    const wonResponse = await agent
      .post(`/api/crm/opportunities/${oppId}/won`)
      .send({});
    expect(wonResponse.status).toBe(200);
    expect(wonResponse.body.data.status).toBe('WON');
    expect(wonResponse.body.data.actualCloseDate).toBeTruthy();

    // GET pipeline stats
    const statsResponse = await agent.get('/api/crm/opportunities/pipeline-stats');
    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.data).toHaveProperty('totalValue');
  });

  it('validates required fields', async () => {
    const { agent } = await createTestContext();

    const response = await agent.post('/api/crm/opportunities').send({
      // Missing required fields: name, accountId, stageId
    });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });
});
