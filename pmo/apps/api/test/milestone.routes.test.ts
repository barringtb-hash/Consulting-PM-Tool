/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { MilestoneStatus, ProjectStatus } from '@prisma/client';

import { hashPassword } from '../src/auth/password';
import { createApp } from '../src/app';
import prisma from '../src/prisma/client';

const app = createApp();

const createAuthenticatedAgent = async () => {
  const password = 'password123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: 'Milestone Owner',
      email: 'milestone-owner@example.com',
      passwordHash,
      timezone: 'UTC',
    },
  });

  const agent = request.agent(app);
  await agent.post('/auth/login').send({ email: user.email, password });

  return { agent, user };
};

describe('milestone routes', () => {
  it('blocks unauthenticated access', async () => {
    const response = await request(app).get('/api/projects/1/milestones');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('supports milestone lifecycle operations', async () => {
    const { agent, user } = await createAuthenticatedAgent();

    const client = await prisma.client.create({
      data: { name: 'Milestone Client' },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Milestone Project',
        clientId: client.id,
        ownerId: user.id,
        status: ProjectStatus.PLANNING,
      },
    });

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

    const stored = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    });
    expect(stored).toBeNull();
  });
});
