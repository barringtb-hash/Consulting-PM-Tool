/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { AiMaturity, CompanySize } from '@prisma/client';

import { createApp } from '../src/app';
import {
  createTestEnvironment,
  createTenantAgent,
  cleanupTestEnvironment,
  getRawPrisma,
  type TestEnvironment,
} from './utils/test-fixtures';

const app = createApp();
const rawPrisma = getRawPrisma();

describe('clients routes', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment('clients');
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv.tenant.id);
  });

  // Helper to create tenant-aware agent
  const getAgent = () =>
    createTenantAgent(app, testEnv.token, testEnv.tenant.id);

  it('blocks unauthenticated access', async () => {
    const response = await request(app).get('/api/clients');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('validates client payloads', async () => {
    const agent = getAgent();

    const response = await agent
      .post('/api/clients')
      .send({ industry: 'Tech' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid client data');
  });

  it('supports CRUD operations with filtering', async () => {
    const agent = getAgent();

    const createResponse = await agent.post('/api/clients').send({
      name: 'Test Corp',
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
      .query({ search: 'test' });
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.clients).toHaveLength(1);
    expect(searchResponse.body.clients[0]).toMatchObject({ name: 'Test Corp' });

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

    // Verify hard delete using raw Prisma (bypasses tenant filtering)
    const stored = await rawPrisma.client.findUnique({
      where: { id: clientId },
    });
    expect(stored).toBeNull();
  });
});
