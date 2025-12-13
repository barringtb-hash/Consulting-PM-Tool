import { Prisma } from '@prisma/client';

import prisma from '../../prisma/client';
import { createTask } from '../../services/task.service';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';
import {
  CreateMeetingInput,
  CreateTaskFromSelectionInput,
  UpdateMeetingInput,
} from '../../types/meeting';

type MeetingWithOwner = Prisma.MeetingGetPayload<{
  include: { project: { select: { ownerId: true } } };
}>;

type MeetingWithoutProject = Omit<MeetingWithOwner, 'project'>;

const stripProject = ({
  project,
  ...meeting
}: MeetingWithOwner): MeetingWithoutProject => {
  void project;
  return meeting;
};

const validateProjectAccess = async (projectId: number, ownerId: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
  });

  if (!project) {
    return 'not_found' as const;
  }

  if (project.ownerId !== ownerId) {
    return 'forbidden' as const;
  }

  return project;
};

const findMeetingWithOwner = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.meeting.findFirst({
    where: { id, tenantId },
    include: { project: { select: { ownerId: true } } },
  });
};

export const listMeetingsByProject = async (
  projectId: number,
  ownerId: number,
) => {
  const projectAccess = await validateProjectAccess(projectId, ownerId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess } as const;
  }

  const meetings = await prisma.meeting.findMany({
    where: { projectId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

  return { meetings } as const;
};

export const createMeeting = async (
  ownerId: number,
  data: CreateMeetingInput,
) => {
  const projectAccess = await validateProjectAccess(data.projectId, ownerId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess } as const;
  }

  // Get tenant context for multi-tenant isolation
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const meeting = await prisma.meeting.create({
    data: {
      ...data,
      tenantId,
      attendees: data.attendees ?? [],
    },
  });

  return { meeting } as const;
};

export const getMeetingById = async (id: number, ownerId: number) => {
  const meeting = await findMeetingWithOwner(id);

  if (!meeting) {
    return { error: 'not_found' as const };
  }

  if (meeting.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  return { meeting: stripProject(meeting) } as const;
};

export const updateMeeting = async (
  id: number,
  ownerId: number,
  data: UpdateMeetingInput,
) => {
  const existing = await findMeetingWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (existing.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  const targetProjectId = data.projectId ?? existing.projectId;

  const projectAccess = await validateProjectAccess(targetProjectId, ownerId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess } as const;
  }

  const updated = await prisma.meeting.update({
    where: { id },
    data: {
      ...data,
      projectId: data.projectId ?? undefined,
      attendees: data.attendees ?? undefined,
    },
  });

  return { meeting: updated } as const;
};

export const deleteMeeting = async (id: number, ownerId: number) => {
  const existing = await findMeetingWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (existing.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  await prisma.meeting.delete({ where: { id } });

  return { deleted: true } as const;
};

export const createTaskFromSelection = async (
  ownerId: number,
  data: CreateTaskFromSelectionInput,
) => {
  const meeting = await findMeetingWithOwner(data.meetingId);

  if (!meeting) {
    return { error: 'not_found' as const };
  }

  if (meeting.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  if (meeting.projectId !== data.projectId) {
    return { error: 'project_mismatch' as const };
  }

  const title = (data.title ?? data.selectionText).trim();
  const description = data.description ?? data.selectionText;

  const taskResult = await createTask(ownerId, {
    projectId: meeting.projectId,
    title,
    description,
    status: data.status,
    priority: data.priority,
    dueDate: data.dueDate ?? undefined,
    milestoneId: data.milestoneId,
    sourceMeetingId: meeting.id,
  });

  if (taskResult.error) {
    return { error: taskResult.error } as const;
  }

  return { task: taskResult.task } as const;
};
