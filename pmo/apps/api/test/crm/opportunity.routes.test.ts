/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { hashPassword } from '../../src/auth/password';
import { createApp } from '../../src/app';
import prisma from '../../src/prisma/client';

const app = createApp();

async function setupWithPipeline() {
  const user = await prisma.user.create({
    data: {
      name: 'Test',
      email: `opp-${Date.now()}@test.com`,
      passwordHash: await hashPassword('pass'),
      timezone: 'UTC',
    },
  });
  const tenant = await prisma.tenant.create({
    data: { name: 'T', slug: `opp-${Date.now()}`, plan: 'PROFESSIONAL', status: 'ACTIVE' },
  });
  await prisma.tenantUser.create({ data: { userId: user.id, tenantId: tenant.id, role: 'OWNER' } });

  const pipeline = await prisma.pipeline.create({
    data: {
      tenantId: tenant.id,
      name: 'Pipeline',
      isDefault: true,
      stages: {
        create: [
          { name: 'Open', order: 1, probability: 20 },
          { name: 'Won', order: 2, probability: 100, type: 'WON' },
        ],
      },
    },
    include: { stages: { orderBy: { order: 'asc' } } },
  });

  const account = await prisma.account.create({
    data: { tenantId: tenant.id, name: 'Acct', type: 'PROSPECT', ownerId: user.id },
  });

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password: 'pass' });
  return { agent, account, pipeline };
}

describe('CRM Opportunities', () => {
  it('manages pipeline flow', async () => {
    const { agent, account, pipeline } = await setupWithPipeline();
    const stageId = pipeline.stages[0].id;

    const create = await agent.post('/api/crm/opportunities').send({
      name: 'Deal',
      accountId: account.id,
      stageId,
      amount: 1000,
    });
    expect(create.status).toBe(201);
    expect(create.body.data.status).toBe('OPEN');

    const won = await agent.post(`/api/crm/opportunities/${create.body.data.id}/won`).send({});
    expect(won.body.data.status).toBe('WON');
  });

  it('validates input', async () => {
    const { agent } = await setupWithPipeline();
    const res = await agent.post('/api/crm/opportunities').send({});
    expect(res.status).toBe(400);
  });
});
