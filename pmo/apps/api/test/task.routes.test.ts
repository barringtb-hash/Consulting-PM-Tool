/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Priority, ProjectStatus, TaskStatus } from '@prisma/client';

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

describe('task routes', () => {
  let testEnv: TestEnvironment;
  const uniqueSuffix = `tasks-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  beforeAll(async () => {
    testEnv = await createTestEnvironment(uniqueSuffix);
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv.tenant.id);
  });

  // Helper to create tenant-aware agent
  const getAgent = () =>
    createTenantAgent(app, testEnv.token, testEnv.tenant.id);

  it('blocks unauthenticated access', async () => {
    const response = await request(app).get('/api/projects/1/tasks');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('supports task lifecycle operations', async () => {
    const agent = getAgent();

    // Create client with explicit tenantId
    const client = await createTestClient(testEnv.tenant.id, 'Task Client');

    // Create project with explicit tenantId
    const project = await createTestProject(
      testEnv.tenant.id,
      client.id,
      testEnv.user.id,
      { name: 'Task Project', status: 'PLANNING' },
    );

    // Create milestone with explicit tenantId
    const milestone = await rawPrisma.milestone.create({
      data: {
        projectId: project.id,
        name: 'Phase 1',
        tenantId: testEnv.tenant.id,
      },
    });

    const createResponse = await agent.post('/api/tasks').send({
      projectId: project.id,
      title: 'Write tests',
      description: 'Add coverage for tasks',
      priority: Priority.P0,
      dueDate: '2024-01-01T00:00:00.000Z',
      milestoneId: milestone.id,
    });

    expect(createResponse.status).toBe(201);
    const taskId = createResponse.body.task.id;

    const listResponse = await agent.get(`/api/projects/${project.id}/tasks`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.tasks).toHaveLength(1);
    expect(listResponse.body.tasks[0]).toMatchObject({
      id: taskId,
      title: 'Write tests',
      priority: Priority.P0,
      milestoneId: milestone.id,
    });

    const updateResponse = await agent.patch(`/api/tasks/${taskId}`).send({
      status: TaskStatus.IN_PROGRESS,
      description: 'Updated description',
      dueDate: null,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.task).toMatchObject({
      id: taskId,
      status: TaskStatus.IN_PROGRESS,
      description: 'Updated description',
      dueDate: null,
    });

    const moveResponse = await agent.patch(`/api/tasks/${taskId}/move`).send({
      status: TaskStatus.BLOCKED,
      milestoneId: milestone.id,
    });

    expect(moveResponse.status).toBe(200);
    expect(moveResponse.body.task.status).toBe(TaskStatus.BLOCKED);
    expect(moveResponse.body.task.milestoneId).toBe(milestone.id);

    const deleteResponse = await agent.delete(`/api/tasks/${taskId}`);
    expect(deleteResponse.status).toBe(204);

    // Verify deletion using raw Prisma (bypasses tenant filtering)
    const stored = await rawPrisma.task.findUnique({ where: { id: taskId } });
    expect(stored).toBeNull();
  });
});
