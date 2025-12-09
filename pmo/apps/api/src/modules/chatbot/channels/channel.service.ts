/**
 * Channel Service
 *
 * Manages channel configurations and provides CRUD operations.
 */

import { PrismaClient, ChannelConfig, ChatChannel } from '@prisma/client';
import { ChannelCredentials, ChannelSettings } from './channel.types';
import { channelManager } from './channel-manager';

const prisma = new PrismaClient();

interface CreateChannelInput {
  channel: ChatChannel;
  name: string;
  credentials: ChannelCredentials;
  settings?: ChannelSettings;
  identifier?: string;
}

interface UpdateChannelInput {
  name?: string;
  credentials?: ChannelCredentials;
  settings?: ChannelSettings;
  identifier?: string;
  isActive?: boolean;
}

/**
 * Create a new channel configuration
 */
export async function createChannel(
  chatbotConfigId: number,
  input: CreateChannelInput,
): Promise<ChannelConfig> {
  // Check if channel already exists for this chatbot
  const existing = await prisma.channelConfig.findUnique({
    where: {
      chatbotConfigId_channel: {
        chatbotConfigId,
        channel: input.channel,
      },
    },
  });

  if (existing) {
    throw new Error(
      `Channel ${input.channel} already configured for this chatbot`,
    );
  }

  // Validate credentials with the appropriate adapter
  const adapter = channelManager.getAdapter(input.channel);
  if (adapter) {
    const isValid = await adapter.validateCredentials(input.credentials);
    if (!isValid) {
      throw new Error(`Invalid credentials for ${input.channel} channel`);
    }
  }

  return prisma.channelConfig.create({
    data: {
      chatbotConfigId,
      channel: input.channel,
      name: input.name,
      credentials: input.credentials as unknown as Record<string, unknown>,
      settings: (input.settings as unknown as Record<string, unknown>) || {},
      identifier: input.identifier,
      isVerified: true, // Credentials validated above
    },
  });
}

/**
 * Update a channel configuration
 */
export async function updateChannel(
  channelId: number,
  input: UpdateChannelInput,
): Promise<ChannelConfig> {
  // Get existing config to check channel type
  const existing = await prisma.channelConfig.findUnique({
    where: { id: channelId },
  });

  if (!existing) {
    throw new Error('Channel configuration not found');
  }

  // If credentials are being updated, validate them
  if (input.credentials) {
    const adapter = channelManager.getAdapter(existing.channel as ChatChannel);
    if (adapter) {
      const isValid = await adapter.validateCredentials(input.credentials);
      if (!isValid) {
        throw new Error(`Invalid credentials for ${existing.channel} channel`);
      }
    }
  }

  return prisma.channelConfig.update({
    where: { id: channelId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.credentials && {
        credentials: input.credentials as unknown as Record<string, unknown>,
        isVerified: true,
      }),
      ...(input.settings && {
        settings: input.settings as unknown as Record<string, unknown>,
      }),
      ...(input.identifier !== undefined && { identifier: input.identifier }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

/**
 * Delete a channel configuration
 */
export async function deleteChannel(channelId: number): Promise<void> {
  await prisma.channelConfig.delete({
    where: { id: channelId },
  });
}

/**
 * Get all channels for a chatbot
 */
export async function getChannels(
  chatbotConfigId: number,
): Promise<ChannelConfig[]> {
  return prisma.channelConfig.findMany({
    where: { chatbotConfigId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a specific channel by ID
 */
export async function getChannelById(
  channelId: number,
): Promise<ChannelConfig | null> {
  return prisma.channelConfig.findUnique({
    where: { id: channelId },
  });
}

/**
 * Get channel by chatbot and channel type
 */
export async function getChannelByType(
  chatbotConfigId: number,
  channel: ChatChannel,
): Promise<ChannelConfig | null> {
  return prisma.channelConfig.findUnique({
    where: {
      chatbotConfigId_channel: {
        chatbotConfigId,
        channel,
      },
    },
  });
}

/**
 * Get active channel configuration for a chatbot
 */
export async function getActiveChannels(
  chatbotConfigId: number,
): Promise<ChannelConfig[]> {
  return prisma.channelConfig.findMany({
    where: {
      chatbotConfigId,
      isActive: true,
      isVerified: true,
    },
  });
}

/**
 * Test channel configuration by sending a test message
 */
export async function testChannel(
  channelId: number,
  testRecipient: string,
): Promise<{ success: boolean; error?: string }> {
  const config = await prisma.channelConfig.findUnique({
    where: { id: channelId },
  });

  if (!config) {
    return { success: false, error: 'Channel configuration not found' };
  }

  const adapter = channelManager.getAdapter(config.channel as ChatChannel);
  if (!adapter) {
    return {
      success: false,
      error: `No adapter available for ${config.channel}`,
    };
  }

  const result = await adapter.sendMessage(
    {
      recipientIdentifier: testRecipient,
      content:
        'This is a test message from PMO Chatbot. If you received this, your channel is configured correctly!',
    },
    config.credentials as ChannelCredentials,
  );

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Verify channel credentials without saving
 */
export async function verifyChannelCredentials(
  channel: ChatChannel,
  credentials: ChannelCredentials,
): Promise<{ valid: boolean; error?: string }> {
  const adapter = channelManager.getAdapter(channel);
  if (!adapter) {
    return { valid: false, error: `No adapter available for ${channel}` };
  }

  try {
    const isValid = await adapter.validateCredentials(credentials);
    return { valid: isValid };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Get supported channels with their configuration status
 */
export async function getChannelStatus(chatbotConfigId: number): Promise<
  Array<{
    channel: string;
    configured: boolean;
    active: boolean;
    verified: boolean;
    name?: string;
  }>
> {
  const SUPPORTED = [
    'WEB',
    'SMS',
    'WHATSAPP',
    'SLACK',
    'TEAMS',
    'MESSENGER',
    'EMAIL',
  ];

  const configured = await prisma.channelConfig.findMany({
    where: { chatbotConfigId },
    select: {
      channel: true,
      isActive: true,
      isVerified: true,
      name: true,
    },
  });

  const configuredMap = new Map(configured.map((c) => [c.channel, c]));

  return SUPPORTED.map((channel) => {
    const config = configuredMap.get(channel);
    return {
      channel,
      configured: !!config,
      active: config?.isActive ?? false,
      verified: config?.isVerified ?? false,
      name: config?.name,
    };
  });
}
