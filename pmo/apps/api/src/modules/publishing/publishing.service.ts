import prisma from '../../prisma/client';
import {
  CreatePublishingConnectionInput,
  UpdatePublishingConnectionInput,
} from '../../types/marketing';

/**
 * Verify user has access to a client (via owned projects or admin role)
 */
async function verifyClientAccess(
  clientId: number,
  userId: number,
): Promise<boolean> {
  // Check if user is an admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    return true;
  }

  // Check if user owns any project for this client
  const project = await prisma.project.findFirst({
    where: {
      clientId,
      ownerId: userId,
    },
    select: { id: true },
  });

  return !!project;
}

/**
 * Get all publishing connections for an account
 * @param accountId - Account ID (or legacy clientId)
 */
export const getPublishingConnections = async (
  accountId: number,
  ownerId: number,
) => {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    return { error: 'client_not_found' as const };
  }

  // Verify user has access to this account
  const hasAccess = await verifyClientAccess(accountId, ownerId);
  if (!hasAccess) {
    return { error: 'forbidden' as const };
  }

  const connections = await prisma.publishingConnection.findMany({
    where: { clientId: accountId },
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
 * Note: input.clientId now represents accountId for backwards compatibility
 */
export const createPublishingConnection = async (
  ownerId: number,
  input: CreatePublishingConnectionInput,
) => {
  const account = await prisma.account.findUnique({
    where: { id: input.clientId },
  });
  if (!account) {
    return { error: 'client_not_found' as const };
  }

  // Verify user has access to this account
  const hasAccess = await verifyClientAccess(input.clientId, ownerId);
  if (!hasAccess) {
    return { error: 'forbidden' as const };
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
  ownerId: number,
  input: UpdatePublishingConnectionInput,
) => {
  const existing = await prisma.publishingConnection.findUnique({
    where: { id },
  });
  if (!existing) {
    return { error: 'not_found' as const };
  }

  // Verify user has access to the connection's client
  const hasAccess = await verifyClientAccess(existing.clientId, ownerId);
  if (!hasAccess) {
    return { error: 'forbidden' as const };
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
  ownerId: number,
) => {
  const existing = await prisma.publishingConnection.findUnique({
    where: { id },
  });
  if (!existing) {
    return { error: 'not_found' as const };
  }

  // Verify user has access to the connection's client
  const hasAccess = await verifyClientAccess(existing.clientId, ownerId);
  if (!hasAccess) {
    return { error: 'forbidden' as const };
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
  // Always set status to READY so the scheduled worker can pick it up
  // For immediate publishing (no scheduledFor), set scheduledFor to now
  const updatedContent = await prisma.marketingContent.update({
    where: { id: contentId },
    data: {
      publishingConnectionId: options.publishingConnectionId,
      scheduledFor: options.scheduledFor || new Date(),
      status: 'READY',
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
export const markPublishFailed = async (contentId: number, error: string) => {
  const content = await prisma.marketingContent.update({
    where: { id: contentId },
    data: {
      publishError: error,
      lastPublishAttempt: new Date(),
    },
  });

  return { content };
};
