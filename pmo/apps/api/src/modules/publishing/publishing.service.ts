import prisma from '../../prisma/client';
import {
  CreatePublishingConnectionInput,
  UpdatePublishingConnectionInput,
} from '../../types/marketing';

/**
 * Get all publishing connections for a client
 */
export const getPublishingConnections = async (
  clientId: number,
  _ownerId: number,
) => {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return { error: 'client_not_found' as const };
  }

  const connections = await prisma.publishingConnection.findMany({
    where: { clientId },
    include: {
      client: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { connections };
};

/**
 * Create a publishing connection
 */
export const createPublishingConnection = async (
  _ownerId: number,
  input: CreatePublishingConnectionInput,
) => {
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
  });
  if (!client) {
    return { error: 'client_not_found' as const };
  }

  // Check for duplicate connection
  const existing = await prisma.publishingConnection.findUnique({
    where: {
      clientId_platform_accountName: {
        clientId: input.clientId,
        platform: input.platform,
        accountName: input.accountName,
      },
    },
  });
  if (existing) {
    return { error: 'already_exists' as const };
  }

  const connection = await prisma.publishingConnection.create({
    data: input,
    include: {
      client: {
        select: { id: true, name: true },
      },
    },
  });

  return { connection };
};

/**
 * Update a publishing connection
 */
export const updatePublishingConnection = async (
  id: number,
  _ownerId: number,
  input: UpdatePublishingConnectionInput,
) => {
  const existing = await prisma.publishingConnection.findUnique({
    where: { id },
  });
  if (!existing) {
    return { error: 'not_found' as const };
  }

  const connection = await prisma.publishingConnection.update({
    where: { id },
    data: input,
    include: {
      client: {
        select: { id: true, name: true },
      },
    },
  });

  return { connection };
};

/**
 * Delete a publishing connection
 */
export const deletePublishingConnection = async (
  id: number,
  _ownerId: number,
) => {
  const existing = await prisma.publishingConnection.findUnique({
    where: { id },
  });
  if (!existing) {
    return { error: 'not_found' as const };
  }

  await prisma.publishingConnection.delete({
    where: { id },
  });

  return { success: true };
};

/**
 * Publish or schedule a marketing content
 */
export const publishContent = async (
  contentId: number,
  ownerId: number,
  options: {
    publishingConnectionId?: number;
    scheduledFor?: Date;
  },
) => {
  // Get the content and validate access
  const content = await prisma.marketingContent.findUnique({
    where: { id: contentId },
    include: {
      project: true,
      client: true,
    },
  });

  if (!content) {
    return { error: 'content_not_found' as const };
  }

  // Validate access
  if (content.project) {
    if (content.project.ownerId !== ownerId) {
      return { error: 'forbidden' as const };
    }
  } else if (content.createdById !== ownerId) {
    return { error: 'forbidden' as const };
  }

  // If publishing connection is specified, validate it
  if (options.publishingConnectionId) {
    const connection = await prisma.publishingConnection.findUnique({
      where: { id: options.publishingConnectionId },
    });
    if (!connection) {
      return { error: 'connection_not_found' as const };
    }
    if (connection.clientId !== content.clientId) {
      return { error: 'connection_mismatch' as const };
    }
    if (!connection.isActive) {
      return { error: 'connection_inactive' as const };
    }
  }

  // Update content with publishing info
  const updatedContent = await prisma.marketingContent.update({
    where: { id: contentId },
    data: {
      publishingConnectionId: options.publishingConnectionId,
      scheduledFor: options.scheduledFor,
      status: options.scheduledFor ? 'READY' : content.status,
    },
  });

  return { content: updatedContent };
};

/**
 * Get scheduled contents that are ready to publish
 */
export const getScheduledContents = async () => {
  const now = new Date();

  const contents = await prisma.marketingContent.findMany({
    where: {
      status: 'READY',
      scheduledFor: {
        lte: now,
      },
      publishingConnectionId: {
        not: null,
      },
      archived: false,
    },
    include: {
      client: true,
      publishingConnection: true,
    },
  });

  return { contents };
};

/**
 * Mark content as published
 */
export const markAsPublished = async (
  contentId: number,
  publishedUrl?: string,
) => {
  const content = await prisma.marketingContent.update({
    where: { id: contentId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      publishedUrl,
      lastPublishAttempt: new Date(),
    },
  });

  return { content };
};

/**
 * Mark content publishing as failed
 */
export const markPublishFailed = async (
  contentId: number,
  error: string,
) => {
  const content = await prisma.marketingContent.update({
    where: { id: contentId },
    data: {
      publishError: error,
      lastPublishAttempt: new Date(),
    },
  });

  return { content };
};
