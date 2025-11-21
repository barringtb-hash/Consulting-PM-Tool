/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Priority, ProjectStatus } from '@prisma/client';

import { hashPassword } from '../src/auth/password';
import { createApp } from '../src/app';
import prisma from '../src/prisma/client';

const app = createApp();

const createAuthenticatedAgent = async () => {
  const password = 'password123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: 'Meeting Owner',
      email: 'meeting-owner@example.com',
      passwordHash,
      timezone: 'UTC',
    },
  });

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password });

  return { agent, user };
};

describe('meeting routes', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/projects/1/meetings');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('validates payloads and params', async () => {
    const { agent } = await createAuthenticatedAgent();

    const invalidProject = await agent
      .post('/api/projects/not-a-number/meetings')
      .send({});
    expect(invalidProject.status).toBe(400);

    const invalidMeeting = await agent
      .post('/api/projects/999/meetings')
      .send({ title: '' });
    expect(invalidMeeting.status).toBe(400);
    expect(invalidMeeting.body.error).toBe('Invalid meeting data');

    const invalidSelection = await agent
      .post('/api/meetings/not-a-number/tasks/from-selection')
      .send({});
    expect(invalidSelection.status).toBe(400);
  });

  it('supports meeting lifecycle operations', async () => {
    const { agent, user } = await createAuthenticatedAgent();

    const client = await prisma.client.create({
      data: { name: 'Meeting Client' },
    });
    const project = await prisma.project.create({
      data: {
        name: 'Meeting Project',
        clientId: client.id,
        ownerId: user.id,
        status: ProjectStatus.PLANNING,
      },
    });

    const createResponse = await agent
      .post(`/api/projects/${project.id}/meetings`)
      .send({
        title: 'Review',
        date: new Date('2024-04-01T00:00:00Z'),
        time: '14:00',
        attendees: ['Alex'],
        notes: 'Discuss roadmap',
      });

    expect(createResponse.status).toBe(201);
    const meetingId = createResponse.body.meeting.id;

    const listResponse = await agent.get(
      `/api/projects/${project.id}/meetings`,
    );
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.meetings).toHaveLength(1);

    const getResponse = await agent.get(`/api/meetings/${meetingId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.meeting.title).toBe('Review');

    const updateResponse = await agent.put(`/api/meetings/${meetingId}`).send({
      title: 'Updated Review',
      notes: 'Updated notes',
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.meeting).toMatchObject({
      title: 'Updated Review',
      notes: 'Updated notes',
    });

    const deleteResponse = await agent.delete(`/api/meetings/${meetingId}`);
    expect(deleteResponse.status).toBe(204);
  });

  it('creates tasks from meeting selection', async () => {
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

    const meeting = await prisma.meeting.create({
      data: {
        projectId: project.id,
        title: 'Task Source Meeting',
        date: new Date('2024-05-01T00:00:00Z'),
        time: '12:00',
        attendees: [],
      },
    });

    const milestone = await prisma.milestone.create({
      data: { projectId: project.id, name: 'Kickoff' },
    });

    const taskResponse = await agent
      .post(`/api/meetings/${meeting.id}/tasks/from-selection`)
      .send({
        projectId: project.id,
        selectionText: 'Send summary email',
        title: 'Send summary',
        description: 'Email attendees after the call',
        status: 'IN_PROGRESS',
        priority: Priority.P2,
        milestoneId: milestone.id,
      });

    expect(taskResponse.status).toBe(201);
    expect(taskResponse.body.task).toMatchObject({
      title: 'Send summary',
      sourceMeetingId: meeting.id,
      projectId: project.id,
    });
  });
});
