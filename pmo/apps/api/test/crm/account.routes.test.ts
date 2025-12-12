/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { hashPassword } from '../../src/auth/password';
import { createApp } from '../../src/app';
import prisma from '../../src/prisma/client';

const app = createApp();

async function setupTenant() {
  const user = await prisma.user.create({
    data: {
      name: 'Test',
      email: `test-${Date.now()}@test.com`,
      passwordHash: await hashPassword('pass'),
      timezone: 'UTC',
    },
  });
  const tenant = await prisma.tenant.create({
    data: { name: 'T', slug: `t-${Date.now()}`, plan: 'PROFESSIONAL', status: 'ACTIVE' },
  });
  await prisma.tenantUser.create({
    data: { userId: user.id, tenantId: tenant.id, role: 'OWNER' },
  });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password: 'pass' });
  return { agent, user, tenant };
}

describe('CRM Accounts', () => {
  it('requires auth', async () => {
    expect((await request(app).get('/api/crm/accounts')).status).toBe(401);
  });

  it('CRUD works', async () => {
    const { agent } = await setupTenant();
    const { body, status } = await agent.post('/api/crm/accounts').send({ name: 'Acme', type: 'PROSPECT' });
    expect(status).toBe(201);
    expect(body.data.name).toBe('Acme');

    const id = body.data.id;
    expect((await agent.get(`/api/crm/accounts/${id}`)).status).toBe(200);
    expect((await agent.put(`/api/crm/accounts/${id}`).send({ type: 'CUSTOMER' })).body.data.type).toBe('CUSTOMER');
    expect((await agent.delete(`/api/crm/accounts/${id}`)).status).toBe(204);
  });

  it('isolates tenants', async () => {
    const { agent: a1, tenant: t1 } = await setupTenant();
    const { agent: a2 } = await setupTenant();

    const { body } = await a1.post('/api/crm/accounts').send({ name: 'T1 Only', type: 'PROSPECT' });
    const acct = await prisma.account.findUnique({ where: { id: body.data.id } });
    expect(acct?.tenantId).toBe(t1.id);

    const list = await a2.get('/api/crm/accounts');
    expect(list.body.data.map((a: { id: number }) => a.id)).not.toContain(body.data.id);
  });
});
