/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Priority } from '@prisma/client';

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

describe('meeting routes', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment('meetings');
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv.tenant.id);
  });

  // Helper to create tenant-aware agent
  const getAgent = () =>
    createTenantAgent(app, testEnv.token, testEnv.tenant.id);

  it('requires authentication', async () => {
    const response = await request(app).get('/api/projects/1/meetings');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('validates payloads and params', async () => {
    const agent = getAgent();

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
    const agent = getAgent();

    // Create client with explicit tenantId
    const client = await createTestClient(testEnv.tenant.id, 'Meeting Client');

    // Create project with explicit tenantId
    const project = await createTestProject(
      testEnv.tenant.id,
      client.id,
      testEnv.user.id,
      { name: 'Meeting Project', status: 'PLANNING' },
    );

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
    expect(createResponse.body.meeting).toMatchObject({
      title: 'Review',
      notes: 'Discuss roadmap',
    });
    const meetingId = createResponse.body.meeting.id;

    const listResponse = await agent.get(
      `/api/projects/${project.id}/meetings`,
    );
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.meetings).toHaveLength(1);
    expect(listResponse.body.meetings[0]).toMatchObject({
      title: 'Review',
      notes: 'Discuss roadmap',
    });

    const getResponse = await agent.get(`/api/meetings/${meetingId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.meeting).toMatchObject({
      title: 'Review',
      notes: 'Discuss roadmap',
    });

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

    // Create meeting with explicit tenantId
    const meeting = await rawPrisma.meeting.create({
      data: {
        projectId: project.id,
        title: 'Task Source Meeting',
        date: new Date('2024-05-01T00:00:00Z'),
        time: '12:00',
        attendees: [],
        tenantId: testEnv.tenant.id,
      },
    });

    // Create milestone with explicit tenantId
    const milestone = await rawPrisma.milestone.create({
      data: {
        projectId: project.id,
        name: 'Kickoff',
        tenantId: testEnv.tenant.id,
      },
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
