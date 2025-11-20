/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';
import { Priority, ProjectStatus } from '@prisma/client';

import { hashPassword } from '../src/auth/password';
import prisma from '../src/prisma/client';
import {
  createMeeting,
  createTaskFromSelection,
  deleteMeeting,
  getMeetingById,
  listMeetingsByProject,
  updateMeeting,
} from '../src/modules/meetings/meeting.service';

const createUserAndProject = async () => {
  const passwordHash = await hashPassword('password123');
  const user = await prisma.user.create({
    data: {
      name: 'Owner',
      email: 'owner@example.com',
      passwordHash,
      timezone: 'UTC',
    },
  });

  const client = await prisma.client.create({ data: { name: 'Test Client' } });

  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      clientId: client.id,
      ownerId: user.id,
      status: ProjectStatus.PLANNING,
    },
  });

  return { user, project };
};

describe('meeting service', () => {
  it('supports creating, reading, updating, and deleting meetings', async () => {
    const { user, project } = await createUserAndProject();

    const createResult = await createMeeting(user.id, {
      projectId: project.id,
      title: 'Kickoff',
      date: new Date('2024-01-01T00:00:00Z'),
      time: '10:00',
      attendees: ['A', 'B'],
      notes: 'Initial notes',
      decisions: 'Initial decisions',
      risks: 'Initial risks',
    });

    expect(createResult.meeting).toMatchObject({
      projectId: project.id,
      title: 'Kickoff',
      attendees: ['A', 'B'],
    });

    const listResult = await listMeetingsByProject(project.id, user.id);
    expect(listResult).toEqual({ meetings: [createResult.meeting] });

    const fetched = await getMeetingById(createResult.meeting.id, user.id);
    expect(fetched.meeting).toMatchObject({ title: 'Kickoff' });

    const updateResult = await updateMeeting(createResult.meeting.id, user.id, {
      title: 'Updated Kickoff',
      attendees: ['C'],
      notes: 'Updated notes',
    });

    expect(updateResult.meeting).toMatchObject({
      title: 'Updated Kickoff',
      attendees: ['C'],
      notes: 'Updated notes',
    });

    const deleteResult = await deleteMeeting(createResult.meeting.id, user.id);
    expect(deleteResult).toEqual({ deleted: true });

    const afterDelete = await getMeetingById(createResult.meeting.id, user.id);
    expect(afterDelete.error).toBe('not_found');
  });

  it('enforces project ownership and existence checks', async () => {
    const { user, project } = await createUserAndProject();
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other',
        email: 'other@example.com',
        passwordHash: await hashPassword('password456'),
        timezone: 'UTC',
      },
    });

    const missingProject = await createMeeting(user.id, {
      projectId: 9999,
      title: 'Missing',
      date: new Date(),
      time: '11:00',
      attendees: [],
    });
    expect(missingProject.error).toBe('not_found');

    const forbiddenList = await listMeetingsByProject(project.id, otherUser.id);
    expect(forbiddenList.error).toBe('forbidden');

    const created = await createMeeting(user.id, {
      projectId: project.id,
      title: 'Owner Meeting',
      date: new Date('2024-02-01T00:00:00Z'),
      time: '09:00',
      attendees: [],
    });

    const forbiddenGet = await getMeetingById(created.meeting.id, otherUser.id);
    expect(forbiddenGet.error).toBe('forbidden');
  });

  it('creates tasks from meeting selections and handles validation errors', async () => {
    const { user, project } = await createUserAndProject();
    const meeting = (
      await createMeeting(user.id, {
        projectId: project.id,
        title: 'Task Source',
        date: new Date('2024-03-01T00:00:00Z'),
        time: '15:00',
        attendees: [],
      })
    ).meeting;

    const milestone = await prisma.milestone.create({
      data: { projectId: project.id, name: 'Milestone 1' },
    });

    const taskResult = await createTaskFromSelection(user.id, {
      meetingId: meeting.id,
      projectId: project.id,
      selectionText: 'Follow up with client',
      title: 'Follow up',
      description: 'Send recap',
      status: 'BACKLOG',
      priority: Priority.P1,
      dueDate: new Date('2024-03-10T00:00:00Z'),
      milestoneId: milestone.id,
    });

    expect(taskResult.task).toMatchObject({
      title: 'Follow up',
      description: 'Send recap',
      projectId: project.id,
      sourceMeetingId: meeting.id,
      milestoneId: milestone.id,
    });

    const otherProject = await prisma.project.create({
      data: {
        name: 'Other Project',
        clientId: project.clientId,
        ownerId: user.id,
        status: ProjectStatus.PLANNING,
      },
    });

    const mismatch = await createTaskFromSelection(user.id, {
      meetingId: meeting.id,
      projectId: otherProject.id,
      selectionText: 'Bad project',
    });
    expect(mismatch.error).toBe('project_mismatch');

    const invalidMilestone = await prisma.milestone.create({
      data: { projectId: otherProject.id, name: 'Other Milestone' },
    });

    const milestoneError = await createTaskFromSelection(user.id, {
      meetingId: meeting.id,
      projectId: project.id,
      selectionText: 'Wrong milestone',
      milestoneId: invalidMilestone.id,
    });
    expect(milestoneError.error).toBe('invalid_milestone');
  });
});
