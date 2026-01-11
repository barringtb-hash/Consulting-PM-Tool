/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { MilestoneStatus } from '@prisma/client';

import { createApp } from '../src/app';
import {
  createTestEnvironment,
  createTenantAgent,
  cleanupTestEnvironment,
  createTestClient,
  createTestProject,
  getRawPrisma,
  type TestEnvironment,
} from './utils/test-fixtures';

const app = createApp();
const rawPrisma = getRawPrisma();

describe('milestone routes', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment('milestones');
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv.tenant.id);
  });

  // Helper to create tenant-aware agent
  const getAgent = () =>
    createTenantAgent(app, testEnv.token, testEnv.tenant.id);

  it('blocks unauthenticated access', async () => {
    const response = await request(app).get('/api/projects/1/milestones');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('supports milestone lifecycle operations', async () => {
    const agent = getAgent();

    // Create client with explicit tenantId
    const client = await createTestClient(
      testEnv.tenant.id,
      'Milestone Client',
    );

    // Create project with explicit tenantId
    const project = await createTestProject(
      testEnv.tenant.id,
      client.id,
      testEnv.user.id,
      { name: 'Milestone Project', status: 'PLANNING' },
    );

    const createResponse = await agent.post('/api/milestones').send({
      projectId: project.id,
      name: 'Kickoff',
      description: 'Align on goals',
      dueDate: '2024-02-01T00:00:00.000Z',
    });

    expect(createResponse.status).toBe(201);
    const milestoneId = createResponse.body.milestone.id;

    const listResponse = await agent.get(
      `/api/projects/${project.id}/milestones`,
    );
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.milestones).toHaveLength(1);
    expect(listResponse.body.milestones[0]).toMatchObject({
      id: milestoneId,
      name: 'Kickoff',
    });

    const updateResponse = await agent
      .patch(`/api/milestones/${milestoneId}`)
      .send({
        status: MilestoneStatus.IN_PROGRESS,
        dueDate: null,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.milestone).toMatchObject({
      id: milestoneId,
      status: MilestoneStatus.IN_PROGRESS,
      dueDate: null,
    });

    const deleteResponse = await agent.delete(`/api/milestones/${milestoneId}`);
    expect(deleteResponse.status).toBe(204);

    // Verify deletion using raw Prisma (bypasses tenant filtering)
    const stored = await rawPrisma.milestone.findUnique({
      where: { id: milestoneId },
    });
    expect(stored).toBeNull();
  });
});
