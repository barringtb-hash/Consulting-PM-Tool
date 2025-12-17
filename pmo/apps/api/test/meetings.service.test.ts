/// <reference types="vitest" />
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Priority } from '@prisma/client';

import {
  createMeeting,
  createTaskFromSelection,
  deleteMeeting,
  getMeetingById,
  listMeetingsByProject,
  updateMeeting,
} from '../src/modules/meetings/meeting.service';
import {
  createTestEnvironment,
  cleanupTestEnvironment,
  createTestClient,
  createTestProject,
  getRawPrisma,
  type TestEnvironment,
} from './utils/test-fixtures';
import { withTenant } from './utils/tenant-test-utils';
import { hashPassword } from '../src/auth/password';

const rawPrisma = getRawPrisma();

describe('meeting service', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment(
      `meetings-service-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv.tenant.id);
  });

  // Helper to create project within test tenant
  const createProjectForTest = async () => {
    const client = await createTestClient(testEnv.tenant.id, 'Test Client');
    const project = await createTestProject(
      testEnv.tenant.id,
      client.id,
      testEnv.user.id,
      { name: 'Test Project', status: 'PLANNING' },
    );
    return { client, project };
  };

  it('supports creating, reading, updating, and deleting meetings', async () => {
    const { project } = await createProjectForTest();

    // Wrap service calls in tenant context
    const createResult = await withTenant(testEnv.tenant, () =>
      createMeeting(testEnv.user.id, {
        projectId: project.id,
        title: 'Kickoff',
        date: new Date('2024-01-01T00:00:00Z'),
        time: '10:00',
        attendees: ['A', 'B'],
        notes: 'Initial notes',
        decisions: 'Initial decisions',
        risks: 'Initial risks',
      }),
    );

    expect(createResult.meeting).toMatchObject({
      projectId: project.id,
      title: 'Kickoff',
      attendees: ['A', 'B'],
    });

    const listResult = await withTenant(testEnv.tenant, () =>
      listMeetingsByProject(project.id, testEnv.user.id),
    );
    expect(listResult).toEqual({ meetings: [createResult.meeting] });

    expect(createResult.meeting).toBeDefined();
    const fetched = await withTenant(testEnv.tenant, () =>
      getMeetingById(createResult.meeting!.id, testEnv.user.id),
    );
    expect(fetched.meeting).toMatchObject({ title: 'Kickoff' });

    const updateResult = await withTenant(testEnv.tenant, () =>
      updateMeeting(createResult.meeting!.id, testEnv.user.id, {
        title: 'Updated Kickoff',
        attendees: ['C'],
        notes: 'Updated notes',
      }),
    );

    expect(updateResult.meeting).toMatchObject({
      title: 'Updated Kickoff',
      attendees: ['C'],
      notes: 'Updated notes',
    });

    const deleteResult = await withTenant(testEnv.tenant, () =>
      deleteMeeting(createResult.meeting!.id, testEnv.user.id),
    );
    expect(deleteResult).toEqual({ deleted: true });

    const afterDelete = await withTenant(testEnv.tenant, () =>
      getMeetingById(createResult.meeting!.id, testEnv.user.id),
    );
    expect(afterDelete.error).toBe('not_found');
  });

  it('enforces project ownership and existence checks', async () => {
    const { project } = await createProjectForTest();

    // Create another user in the same tenant (for ownership tests)
    const otherUserPasswordHash = await hashPassword('password456');
    const otherUser = await rawPrisma.user.create({
      data: {
        name: 'Other',
        email: `other-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@example.com`,
        passwordHash: otherUserPasswordHash,
        timezone: 'UTC',
      },
    });

    // Associate other user with the tenant
    await rawPrisma.tenantUser.create({
      data: {
        tenantId: testEnv.tenant.id,
        userId: otherUser.id,
        role: 'MEMBER',
        acceptedAt: new Date(),
      },
    });

    const missingProject = await withTenant(testEnv.tenant, () =>
      createMeeting(testEnv.user.id, {
        projectId: 9999,
        title: 'Missing',
        date: new Date(),
        time: '11:00',
        attendees: [],
      }),
    );
    expect(missingProject.error).toBe('not_found');

    const forbiddenList = await withTenant(testEnv.tenant, () =>
      listMeetingsByProject(project.id, otherUser.id),
    );
    expect(forbiddenList.error).toBe('forbidden');

    const created = await withTenant(testEnv.tenant, () =>
      createMeeting(testEnv.user.id, {
        projectId: project.id,
        title: 'Owner Meeting',
        date: new Date('2024-02-01T00:00:00Z'),
        time: '09:00',
        attendees: [],
      }),
    );

    expect(created.meeting).toBeDefined();
    const forbiddenGet = await withTenant(testEnv.tenant, () =>
      getMeetingById(created.meeting!.id, otherUser.id),
    );
    expect(forbiddenGet.error).toBe('forbidden');
  });

  it('creates tasks from meeting selections and handles validation errors', async () => {
    const { client, project } = await createProjectForTest();

    const meetingResult = await withTenant(testEnv.tenant, () =>
      createMeeting(testEnv.user.id, {
        projectId: project.id,
        title: 'Task Source',
        date: new Date('2024-03-01T00:00:00Z'),
        time: '15:00',
        attendees: [],
      }),
    );
    expect(meetingResult.meeting).toBeDefined();
    const meeting = meetingResult.meeting!;

    // Create milestone with explicit tenantId
    const milestone = await rawPrisma.milestone.create({
      data: {
        projectId: project.id,
        name: 'Milestone 1',
        tenantId: testEnv.tenant.id,
      },
    });

    const taskResult = await withTenant(testEnv.tenant, () =>
      createTaskFromSelection(testEnv.user.id, {
        meetingId: meeting.id,
        projectId: project.id,
        selectionText: 'Follow up with client',
        title: 'Follow up',
        description: 'Send recap',
        status: 'BACKLOG',
        priority: Priority.P1,
        dueDate: new Date('2024-03-10T00:00:00Z'),
        milestoneId: milestone.id,
      }),
    );

    expect(taskResult.task).toMatchObject({
      title: 'Follow up',
      description: 'Send recap',
      projectId: project.id,
      sourceMeetingId: meeting.id,
      milestoneId: milestone.id,
    });

    // Create another project for mismatch test
    const otherProject = await createTestProject(
      testEnv.tenant.id,
      client.id,
      testEnv.user.id,
      { name: 'Other Project', status: 'PLANNING' },
    );

    const mismatch = await withTenant(testEnv.tenant, () =>
      createTaskFromSelection(testEnv.user.id, {
        meetingId: meeting.id,
        projectId: otherProject.id,
        selectionText: 'Bad project',
      }),
    );
    expect(mismatch.error).toBe('project_mismatch');

    // Create milestone in other project
    const invalidMilestone = await rawPrisma.milestone.create({
      data: {
        projectId: otherProject.id,
        name: 'Other Milestone',
        tenantId: testEnv.tenant.id,
      },
    });

    const milestoneError = await withTenant(testEnv.tenant, () =>
      createTaskFromSelection(testEnv.user.id, {
        meetingId: meeting.id,
        projectId: project.id,
        selectionText: 'Wrong milestone',
        milestoneId: invalidMilestone.id,
      }),
    );
    expect(milestoneError.error).toBe('invalid_milestone');
  });
});
