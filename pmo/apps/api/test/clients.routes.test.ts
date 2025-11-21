/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AiMaturity, CompanySize } from '@prisma/client';

import { hashPassword } from '../src/auth/password';
import { createApp } from '../src/app';
import prisma from '../src/prisma/client';

const app = createApp();

const createAuthenticatedAgent = async () => {
  const password = 'password123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: 'Client Owner',
      email: 'client-owner@example.com',
      passwordHash,
      timezone: 'UTC',
    },
  });

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password });

  return agent;
};

describe('clients routes', () => {
  it('blocks unauthenticated access', async () => {
    const response = await request(app).get('/api/clients');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('validates client payloads', async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .post('/api/clients')
      .send({ industry: 'Tech' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid client data');
  });

  it('supports CRUD operations with filtering', async () => {
    const agent = await createAuthenticatedAgent();

    const createResponse = await agent.post('/api/clients').send({
      name: 'Acme Corp',
      industry: 'Technology',
      companySize: CompanySize.MEDIUM,
      aiMaturity: AiMaturity.LOW,
      notes: 'Key account',
    });

    expect(createResponse.status).toBe(201);
    const clientId = createResponse.body.client.id;

    await agent.post('/api/clients').send({
      name: 'Beta LLC',
      industry: 'Finance',
      companySize: CompanySize.MICRO,
      aiMaturity: AiMaturity.HIGH,
    });

    const searchResponse = await agent
      .get('/api/clients')
      .query({ search: 'acme' });
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.clients).toHaveLength(1);
    expect(searchResponse.body.clients[0]).toMatchObject({ name: 'Acme Corp' });

    const filteredResponse = await agent.get('/api/clients').query({
      companySize: CompanySize.MICRO,
      aiMaturity: AiMaturity.HIGH,
    });
    expect(filteredResponse.status).toBe(200);
    expect(filteredResponse.body.clients).toHaveLength(1);
    expect(filteredResponse.body.clients[0]).toMatchObject({
      name: 'Beta LLC',
    });

    const updateResponse = await agent.put(`/api/clients/${clientId}`).send({
      notes: 'Updated notes',
      aiMaturity: AiMaturity.MEDIUM,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.client).toMatchObject({
      id: clientId,
      notes: 'Updated notes',
      aiMaturity: AiMaturity.MEDIUM,
    });

    const archiveResponse = await agent.patch(
      `/api/clients/${clientId}/archive`,
    );
    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.client.archived).toBe(true);

    const defaultList = await agent.get('/api/clients');
    expect(
      defaultList.body.clients.some(
        (client: { id: number }) => client.id === clientId,
      ),
    ).toBe(false);

    const archivedList = await agent
      .get('/api/clients')
      .query({ archived: 'true' });
    expect(
      archivedList.body.clients.some(
        (client: { id: number }) => client.id === clientId,
      ),
    ).toBe(true);

    const deleteResponse = await agent.delete(`/api/clients/${clientId}`);
    expect(deleteResponse.status).toBe(204);

    const stored = await prisma.client.findUnique({ where: { id: clientId } });
    expect(stored?.archived).toBe(true);
  });
});
