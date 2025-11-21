/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Priority, ProjectStatus, TaskStatus } from '@prisma/client';

import { hashPassword } from '../src/auth/password';
import { createApp } from '../src/app';
import prisma from '../src/prisma/client';

const app = createApp();

const createAuthenticatedAgent = async () => {
  const password = 'password123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: 'Task Owner',
      email: 'task-owner@example.com',
      passwordHash,
      timezone: 'UTC',
    },
  });

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password });

  return { agent, user };
};

describe('task routes', () => {
  it('blocks unauthenticated access', async () => {
    const response = await request(app).get('/api/projects/1/tasks');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('supports task lifecycle operations', async () => {
    const { agent, user } = await createAuthenticatedAgent();

    const client = await prisma.client.create({
      data: { name: 'Task Client' },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Task Project',
        clientId: client.id,
        ownerId: user.id,
        status: ProjectStatus.PLANNING,
      },
    });

    const milestone = await prisma.milestone.create({
      data: { projectId: project.id, name: 'Phase 1' },
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

    const stored = await prisma.task.findUnique({ where: { id: taskId } });
    expect(stored).toBeNull();
  });
});
