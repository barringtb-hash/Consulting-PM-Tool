import { Prisma } from '@prisma/client';

import prisma from '../../prisma/client';
import {
  CreateMarketingContentInput,
  UpdateMarketingContentInput,
  GenerateContentInput,
} from '../../types/marketing';
import type { MarketingContentListQuery } from '../../validation/marketing.schema';
import { generateMarketingContent } from '../../services/llm.service';

type MarketingContentWithOwner = Prisma.MarketingContentGetPayload<{
  include: { client: { select: { id: true } }; createdBy: { select: { id: true } } };
}>;

/**
 * Validate that the user has access to the client
 */
const validateClientAccess = async (clientId: number, ownerId: number) => {
  const client = await prisma.client.findUnique({ where: { id: clientId } });

  if (!client) {
    return 'not_found' as const;
  }

  // In this system, all users can access all clients
  // If you want to add client-level access control, implement it here
  return client;
};

/**
 * Validate that the user has access to the project
 */
const validateProjectAccess = async (projectId: number, ownerId: number) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return 'not_found' as const;
  }

  if (project.ownerId !== ownerId) {
    return 'forbidden' as const;
  }

  return project;
};

/**
 * Find a marketing content item and validate user access
 */
const findContentWithAccess = async (id: number, ownerId: number) => {
  const content = await prisma.marketingContent.findUnique({
    where: { id },
    include: {
      client: true,
      project: true,
    },
  });

  if (!content) {
    return { error: 'not_found' as const };
  }

  // Check authorization:
  // 1. If content has a project, user must own that project
  // 2. If content has no project, user must have created it
  if (content.project) {
    if (content.project.ownerId !== ownerId) {
      return { error: 'forbidden' as const };
    }
  } else {
    // No project - check if user created this content
    if (content.createdById !== ownerId) {
      return { error: 'forbidden' as const };
    }
  }

  return { content };
};

/**
 * List marketing contents with optional filters
 * IMPORTANT: Only returns content that the user owns (via project ownership or creation)
 */
export const listMarketingContents = async (
  ownerId: number,
  query: MarketingContentListQuery,
) => {
  const where: Prisma.MarketingContentWhereInput = {
    archived: query.archived ?? false,
    // CRITICAL: Authorization filter - only show content user has access to
    OR: [
      // Content linked to projects owned by this user
      {
        project: {
          ownerId: ownerId,
        },
      },
      // Content created by this user (for content without a project)
      {
        AND: [
          { projectId: null },
          { createdById: ownerId },
        ],
      },
    ],
  };

  // Filter by client
  if (query.clientId) {
    where.clientId = query.clientId;
  }

  // Filter by project
  if (query.projectId) {
    where.projectId = query.projectId;
  }

  // Filter by type
  if (query.type) {
    where.type = query.type as any;
  }

  // Filter by status
  if (query.status) {
    where.status = query.status as any;
  }

  // Search by name or summary
  if (query.search) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { summary: { contains: query.search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const contents = await prisma.marketingContent.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return { contents };
};

/**
 * Get a single marketing content by ID
 */
export const getMarketingContentById = async (id: number, ownerId: number) => {
  const result = await findContentWithAccess(id, ownerId);

  if ('error' in result) {
    return result;
  }

  const content = await prisma.marketingContent.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      sourceMeeting: { select: { id: true, title: true, date: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return { content };
};

/**
 * Create a new marketing content item
 */
export const createMarketingContent = async (
  ownerId: number,
  data: CreateMarketingContentInput,
) => {
  // Validate client access
  const clientAccess = await validateClientAccess(data.clientId, ownerId);

  if (clientAccess === 'not_found') {
    return { error: 'client_not_found' as const };
  }

  // Validate project access if projectId is provided
  if (data.projectId) {
    const projectAccess = await validateProjectAccess(data.projectId, ownerId);

    if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
      return { error: projectAccess };
    }
  }

  const content = await prisma.marketingContent.create({
    data: {
      ...data,
      createdById: ownerId,
      tags: data.tags ?? [],
    },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return { content };
};

/**
 * Update an existing marketing content item
 */
export const updateMarketingContent = async (
  id: number,
  ownerId: number,
  data: UpdateMarketingContentInput,
) => {
  const accessCheck = await findContentWithAccess(id, ownerId);

  if ('error' in accessCheck) {
    return accessCheck;
  }

  // Validate project access if changing projectId
  if (data.projectId !== undefined) {
    if (data.projectId !== null) {
      const projectAccess = await validateProjectAccess(data.projectId, ownerId);

      if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
        return { error: projectAccess };
      }
    }
  }

  const content = await prisma.marketingContent.update({
    where: { id },
    data,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return { content };
};

/**
 * Archive a marketing content item
 */
export const archiveMarketingContent = async (id: number, ownerId: number) => {
  const accessCheck = await findContentWithAccess(id, ownerId);

  if ('error' in accessCheck) {
    return accessCheck;
  }

  const content = await prisma.marketingContent.update({
    where: { id },
    data: { archived: true },
  });

  return { content };
};

/**
 * Delete a marketing content item (hard delete)
 */
export const deleteMarketingContent = async (id: number, ownerId: number) => {
  const accessCheck = await findContentWithAccess(id, ownerId);

  if ('error' in accessCheck) {
    return accessCheck;
  }

  await prisma.marketingContent.delete({ where: { id } });

  return { deleted: true };
};

/**
 * Get marketing contents by project
 */
export const getMarketingContentsByProject = async (
  projectId: number,
  ownerId: number,
) => {
  const projectAccess = await validateProjectAccess(projectId, ownerId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess };
  }

  const contents = await prisma.marketingContent.findMany({
    where: { projectId, archived: false },
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return { contents };
};

/**
 * Generate marketing content from project or meeting data
 */
export const generateContent = async (
  ownerId: number,
  input: GenerateContentInput,
) => {
  const { sourceType, sourceId, type, additionalContext, tone, length } = input;

  // Fetch source data
  if (sourceType === 'project') {
    const project = await prisma.project.findUnique({
      where: { id: sourceId },
      include: {
        client: true,
        meetings: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    });

    if (!project) {
      return { error: 'not_found' as const };
    }

    if (project.ownerId !== ownerId) {
      return { error: 'forbidden' as const };
    }

    // Build context from project
    const context = {
      clientName: project.client.name,
      industry: project.client.industry || undefined,
      projectName: project.name,
      projectDescription: project.statusSummary || undefined,
      meetingNotes: project.meetings
        .map((m) => `${m.title}: ${m.notes || ''}`)
        .join('\n\n'),
      decisions: project.meetings
        .map((m) => m.decisions)
        .filter(Boolean)
        .join('\n'),
      additionalContext,
    };

    // Generate content using LLM
    const generated = await generateMarketingContent({
      type,
      context,
      tone,
      length,
    });

    return { generated };
  } else if (sourceType === 'meeting') {
    const meeting = await prisma.meeting.findUnique({
      where: { id: sourceId },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!meeting) {
      return { error: 'not_found' as const };
    }

    if (meeting.project.ownerId !== ownerId) {
      return { error: 'forbidden' as const };
    }

    // Build context from meeting
    const context = {
      clientName: meeting.project.client.name,
      industry: meeting.project.client.industry || undefined,
      projectName: meeting.project.name,
      meetingTitle: meeting.title,
      meetingNotes: meeting.notes || undefined,
      decisions: meeting.decisions || undefined,
      additionalContext,
    };

    // Generate content using LLM
    const generated = await generateMarketingContent({
      type,
      context,
      tone,
      length,
    });

    return { generated };
  }

  return { error: 'invalid_source_type' as const };
};
