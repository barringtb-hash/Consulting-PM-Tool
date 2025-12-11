/**
 * Notification Service
 *
 * Handles creation, delivery, and management of notifications.
 * Supports multiple channels: in-app, email, Slack, SMS, browser push.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { getTenantId } from '../tenant/tenant.context';
import { emitToTenantUser } from '../websocket/websocket.server';
import { addNotificationJob } from '../queue/queue.config';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType =
  // Opportunity Events
  | 'DEAL_ASSIGNED'
  | 'DEAL_STAGE_CHANGED'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'DEAL_STALE'
  | 'DEAL_CLOSE_DATE_APPROACHING'
  // Activity Events
  | 'TASK_ASSIGNED'
  | 'TASK_DUE'
  | 'TASK_OVERDUE'
  | 'MEETING_REMINDER'
  | 'MENTION'
  // Account Events
  | 'ACCOUNT_HEALTH_DROPPED'
  | 'ACCOUNT_ASSIGNED'
  // System Events
  | 'INTEGRATION_ERROR'
  | 'USAGE_LIMIT_WARNING'
  | 'USAGE_LIMIT_REACHED'
  // AI Events
  | 'AI_INSIGHT'
  | 'LEAD_SCORE_CHANGED';

export type NotificationChannel =
  | 'IN_APP'
  | 'EMAIL'
  | 'SLACK'
  | 'SMS'
  | 'BROWSER_PUSH';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: number;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  expiresAt?: Date;
}

export interface NotificationFilters {
  read?: boolean;
  type?: NotificationType | NotificationType[];
  priority?: NotificationPriority;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

// Default notification preferences by type
const DEFAULT_CHANNELS: Record<NotificationType, NotificationChannel[]> = {
  // Opportunity Events - important for sales
  DEAL_ASSIGNED: ['IN_APP', 'EMAIL'],
  DEAL_STAGE_CHANGED: ['IN_APP'],
  DEAL_WON: ['IN_APP', 'EMAIL', 'SLACK'],
  DEAL_LOST: ['IN_APP', 'EMAIL'],
  DEAL_STALE: ['IN_APP', 'EMAIL'],
  DEAL_CLOSE_DATE_APPROACHING: ['IN_APP', 'EMAIL'],

  // Activity Events
  TASK_ASSIGNED: ['IN_APP', 'EMAIL'],
  TASK_DUE: ['IN_APP'],
  TASK_OVERDUE: ['IN_APP', 'EMAIL'],
  MEETING_REMINDER: ['IN_APP', 'EMAIL', 'BROWSER_PUSH'],
  MENTION: ['IN_APP', 'EMAIL'],

  // Account Events
  ACCOUNT_HEALTH_DROPPED: ['IN_APP', 'EMAIL'],
  ACCOUNT_ASSIGNED: ['IN_APP', 'EMAIL'],

  // System Events
  INTEGRATION_ERROR: ['IN_APP', 'EMAIL'],
  USAGE_LIMIT_WARNING: ['IN_APP', 'EMAIL'],
  USAGE_LIMIT_REACHED: ['IN_APP', 'EMAIL'],

  // AI Events
  AI_INSIGHT: ['IN_APP'],
  LEAD_SCORE_CHANGED: ['IN_APP'],
};

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create and dispatch a notification.
 */
export async function createNotification(input: CreateNotificationInput) {
  const tenantId = getTenantId();

  // Determine channels (user preferences > input > defaults)
  const channels = input.channels || DEFAULT_CHANNELS[input.type] || ['IN_APP'];

  // Create notification record
  const notification = await prisma.notification.create({
    data: {
      tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      entityType: input.entityType,
      entityId: input.entityId,
      priority: input.priority || 'NORMAL',
      channels,
      expiresAt: input.expiresAt,
    },
  });

  // Send real-time notification via WebSocket
  emitToTenantUser(tenantId, input.userId, 'notification:new', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.actionUrl,
    priority: notification.priority,
    createdAt: notification.createdAt,
  });

  // Queue delivery to other channels
  for (const channel of channels) {
    if (channel !== 'IN_APP') {
      await addNotificationJob({
        tenantId,
        notificationId: notification.id,
        channel: channel.toLowerCase() as 'email' | 'slack' | 'sms' | 'push',
      });
    }
  }

  return notification;
}

/**
 * Get notification by ID.
 */
export async function getNotificationById(id: number) {
  const tenantId = getTenantId();

  return prisma.notification.findFirst({
    where: { id, tenantId },
  });
}

/**
 * List notifications for a user.
 */
export async function listNotifications(
  userId: number,
  filters: NotificationFilters = {},
  pagination: PaginationOptions = {},
) {
  const tenantId = getTenantId();
  const page = pagination.page || 1;
  const limit = Math.min(pagination.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationWhereInput = {
    tenantId,
    userId,
  };

  if (filters.read !== undefined) {
    where.read = filters.read;
  }

  if (filters.type) {
    if (Array.isArray(filters.type)) {
      where.type = { in: filters.type };
    } else {
      where.type = filters.type;
    }
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      gte: filters.dateFrom,
      lte: filters.dateTo,
    };
  }

  // Exclude expired notifications
  where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: notifications,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get unread notification count.
 */
export async function getUnreadCount(userId: number) {
  const tenantId = getTenantId();

  return prisma.notification.count({
    where: {
      tenantId,
      userId,
      read: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
}

/**
 * Mark notification as read.
 */
export async function markAsRead(id: number, userId: number) {
  const tenantId = getTenantId();

  return prisma.notification.update({
    where: { id, tenantId, userId },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead(userId: number) {
  const tenantId = getTenantId();

  return prisma.notification.updateMany({
    where: {
      tenantId,
      userId,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
}

/**
 * Delete a notification.
 */
export async function deleteNotification(id: number, userId: number) {
  const tenantId = getTenantId();

  return prisma.notification.delete({
    where: { id, tenantId, userId },
  });
}

/**
 * Delete all read notifications (cleanup).
 */
export async function deleteReadNotifications(userId: number) {
  const tenantId = getTenantId();

  return prisma.notification.deleteMany({
    where: {
      tenantId,
      userId,
      read: true,
    },
  });
}

// ============================================================================
// NOTIFICATION TRIGGERS (Convenience methods)
// ============================================================================

/**
 * Notify user about assigned deal.
 */
export async function notifyDealAssigned(
  userId: number,
  dealId: number,
  dealName: string,
  assignedBy: string,
) {
  return createNotification({
    userId,
    type: 'DEAL_ASSIGNED',
    title: 'New Deal Assigned',
    message: `${assignedBy} assigned you the deal "${dealName}"`,
    actionUrl: `/crm/opportunities/${dealId}`,
    entityType: 'opportunity',
    entityId: dealId,
  });
}

/**
 * Notify deal owner about stage change.
 */
export async function notifyDealStageChanged(
  userId: number,
  dealId: number,
  dealName: string,
  fromStage: string,
  toStage: string,
) {
  return createNotification({
    userId,
    type: 'DEAL_STAGE_CHANGED',
    title: 'Deal Stage Updated',
    message: `"${dealName}" moved from ${fromStage} to ${toStage}`,
    actionUrl: `/crm/opportunities/${dealId}`,
    entityType: 'opportunity',
    entityId: dealId,
  });
}

/**
 * Notify about deal won.
 */
export async function notifyDealWon(
  userId: number,
  dealId: number,
  dealName: string,
  amount: number,
  currency: string,
) {
  return createNotification({
    userId,
    type: 'DEAL_WON',
    title: 'Deal Won!',
    message: `Congratulations! "${dealName}" closed for ${currency} ${amount.toLocaleString()}`,
    actionUrl: `/crm/opportunities/${dealId}`,
    entityType: 'opportunity',
    entityId: dealId,
    priority: 'HIGH',
  });
}

/**
 * Notify about deal lost.
 */
export async function notifyDealLost(
  userId: number,
  dealId: number,
  dealName: string,
  reason?: string,
) {
  return createNotification({
    userId,
    type: 'DEAL_LOST',
    title: 'Deal Lost',
    message: reason
      ? `"${dealName}" was marked as lost: ${reason}`
      : `"${dealName}" was marked as lost`,
    actionUrl: `/crm/opportunities/${dealId}`,
    entityType: 'opportunity',
    entityId: dealId,
  });
}

/**
 * Notify about task assignment.
 */
export async function notifyTaskAssigned(
  userId: number,
  taskId: number,
  taskName: string,
  assignedBy: string,
) {
  return createNotification({
    userId,
    type: 'TASK_ASSIGNED',
    title: 'Task Assigned',
    message: `${assignedBy} assigned you: "${taskName}"`,
    actionUrl: `/crm/activities/${taskId}`,
    entityType: 'activity',
    entityId: taskId,
  });
}

/**
 * Notify about overdue task.
 */
export async function notifyTaskOverdue(
  userId: number,
  taskId: number,
  taskName: string,
  daysOverdue: number,
) {
  return createNotification({
    userId,
    type: 'TASK_OVERDUE',
    title: 'Task Overdue',
    message: `"${taskName}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
    actionUrl: `/crm/activities/${taskId}`,
    entityType: 'activity',
    entityId: taskId,
    priority: 'HIGH',
  });
}

/**
 * Notify about meeting reminder.
 */
export async function notifyMeetingReminder(
  userId: number,
  meetingId: number,
  meetingTitle: string,
  startsIn: string,
) {
  return createNotification({
    userId,
    type: 'MEETING_REMINDER',
    title: 'Meeting Reminder',
    message: `"${meetingTitle}" starts in ${startsIn}`,
    actionUrl: `/crm/activities/${meetingId}`,
    entityType: 'activity',
    entityId: meetingId,
    priority: 'HIGH',
  });
}

/**
 * Notify about account health drop.
 */
export async function notifyAccountHealthDrop(
  userId: number,
  accountId: number,
  accountName: string,
  previousScore: number,
  newScore: number,
) {
  return createNotification({
    userId,
    type: 'ACCOUNT_HEALTH_DROPPED',
    title: 'Account Health Alert',
    message: `"${accountName}" health dropped from ${previousScore} to ${newScore}`,
    actionUrl: `/crm/accounts/${accountId}`,
    entityType: 'account',
    entityId: accountId,
    priority: newScore < 50 ? 'URGENT' : 'HIGH',
  });
}

/**
 * Notify about usage limit warning.
 */
export async function notifyUsageLimitWarning(
  userId: number,
  moduleName: string,
  usagePercent: number,
) {
  return createNotification({
    userId,
    type: 'USAGE_LIMIT_WARNING',
    title: 'Usage Limit Warning',
    message: `You've used ${usagePercent}% of your ${moduleName} quota this period`,
    actionUrl: '/settings/billing',
    priority: 'HIGH',
  });
}

/**
 * Notify about AI insight.
 */
export async function notifyAIInsight(
  userId: number,
  insightTitle: string,
  insightMessage: string,
  actionUrl?: string,
) {
  return createNotification({
    userId,
    type: 'AI_INSIGHT',
    title: insightTitle,
    message: insightMessage,
    actionUrl,
    priority: 'NORMAL',
  });
}
