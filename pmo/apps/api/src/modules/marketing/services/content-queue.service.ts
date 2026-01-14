/**
 * Content Queue Service
 *
 * Manages the content scheduling queue for marketing content.
 * Provides functionality to queue, prioritize, reorder, and
 * auto-schedule content for publishing.
 *
 * Features:
 * - Priority-based queue management (LOW, NORMAL, HIGH, URGENT)
 * - Position-based ordering for manual arrangement
 * - Auto-scheduling integration with optimal time service
 * - Bulk operations for efficient queue management
 *
 * @module modules/marketing/services/content-queue
 */

import { ContentPriority } from '@prisma/client';
import prisma from '../../../prisma/client';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';
import { calculateOptimalTime } from './optimal-scheduling.service';

/**
 * Represents an item in the content scheduling queue.
 */
export interface QueueItem {
  /** Unique queue item identifier */
  id: number;
  /** Associated marketing content ID */
  contentId: number;
  /** Position in the queue (lower = earlier) */
  position: number;
  /** Priority level for scheduling */
  priority: ContentPriority;
  /** Whether to auto-schedule when optimal time is available */
  autoSchedule: boolean;
  /** Target date range start for auto-scheduling */
  targetDateStart: Date | null;
  /** Target date range end for auto-scheduling */
  targetDateEnd: Date | null;
  /** Target platforms for publishing */
  platforms: string[];
  /** Timestamp of queue entry creation */
  createdAt: Date;
  /** Timestamp of last update */
  updatedAt: Date;
  /** Associated content details (when included) */
  content?: {
    id: number;
    name: string;
    type: string;
    status: string;
    scheduledFor: Date | null;
  };
}

/**
 * Represents a successfully scheduled item.
 */
export interface ScheduledItem {
  /** Content ID that was scheduled */
  contentId: number;
  /** Scheduled publication time */
  scheduledFor: Date;
  /** Target platforms */
  platforms: string[];
}

/**
 * Options for adding content to the queue.
 */
export interface AddToQueueOptions {
  /** Priority level (defaults to NORMAL) */
  priority?: ContentPriority;
  /** Enable auto-scheduling */
  autoSchedule?: boolean;
  /** Target date range for scheduling */
  targetDateStart?: Date;
  targetDateEnd?: Date;
  /** Target platforms for publishing */
  platforms?: string[];
}

/**
 * Get the content queue for a tenant.
 *
 * Returns all queued content items sorted by priority (URGENT first)
 * and then by position within each priority level.
 *
 * @param tenantId - Tenant identifier for multi-tenant isolation
 * @returns Array of queue items with content details
 *
 * @example
 * ```typescript
 * const queue = await getQueue('tenant-123');
 * console.log(queue.length); // Number of items in queue
 * ```
 */
export async function getQueue(tenantId: string): Promise<QueueItem[]> {
  const queueItems = await prisma.contentScheduleQueue.findMany({
    where: { tenantId },
    include: {
      content: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          scheduledFor: true,
        },
      },
    },
    orderBy: [
      // Priority order: URGENT > HIGH > NORMAL > LOW
      { priority: 'desc' },
      { position: 'asc' },
    ],
  });

  return queueItems.map(mapToQueueItem);
}

/**
 * Maps a database ContentScheduleQueue record to the QueueItem interface.
 */
function mapToQueueItem(record: {
  id: number;
  contentId: number;
  position: number;
  priority: ContentPriority;
  autoSchedule: boolean;
  targetDateStart: Date | null;
  targetDateEnd: Date | null;
  platforms: string[];
  createdAt: Date;
  updatedAt: Date;
  content?: {
    id: number;
    name: string;
    type: string;
    status: string;
    scheduledFor: Date | null;
  };
}): QueueItem {
  return {
    id: record.id,
    contentId: record.contentId,
    position: record.position,
    priority: record.priority,
    autoSchedule: record.autoSchedule,
    targetDateStart: record.targetDateStart,
    targetDateEnd: record.targetDateEnd,
    platforms: record.platforms,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.content && {
      content: {
        id: record.content.id,
        name: record.content.name,
        type: record.content.type,
        status: record.content.status,
        scheduledFor: record.content.scheduledFor,
      },
    }),
  };
}

/**
 * Add content to the scheduling queue.
 *
 * Inserts content at the end of the queue with the specified priority.
 * If the content is already in the queue, returns the existing entry.
 *
 * @param tenantId - Tenant identifier for multi-tenant isolation
 * @param contentId - ID of the marketing content to queue
 * @param options - Queue options (priority, auto-schedule, target dates, platforms)
 * @returns The created or existing queue item
 *
 * @example
 * ```typescript
 * const item = await addToQueue('tenant-123', 456, {
 *   priority: 'HIGH',
 *   autoSchedule: true,
 *   platforms: ['LINKEDIN', 'TWITTER']
 * });
 * ```
 */
export async function addToQueue(
  tenantId: string,
  contentId: number,
  options?: AddToQueueOptions,
): Promise<QueueItem> {
  // Check if content already exists in queue
  const existing = await prisma.contentScheduleQueue.findUnique({
    where: { contentId },
    include: {
      content: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          scheduledFor: true,
        },
      },
    },
  });

  if (existing) {
    return mapToQueueItem(existing);
  }

  // Verify content exists and belongs to tenant
  const content = await prisma.marketingContent.findFirst({
    where: { id: contentId, tenantId },
  });

  if (!content) {
    throw new Error(`Content with ID ${contentId} not found or access denied`);
  }

  // Get the next position in the queue
  const maxPosition = await prisma.contentScheduleQueue.aggregate({
    where: { tenantId },
    _max: { position: true },
  });

  const nextPosition = (maxPosition._max.position ?? 0) + 1;

  // Create queue entry
  const queueItem = await prisma.contentScheduleQueue.create({
    data: {
      tenantId,
      contentId,
      position: nextPosition,
      priority: options?.priority ?? 'NORMAL',
      autoSchedule: options?.autoSchedule ?? false,
      targetDateStart: options?.targetDateStart ?? null,
      targetDateEnd: options?.targetDateEnd ?? null,
      platforms: options?.platforms ?? [],
    },
    include: {
      content: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          scheduledFor: true,
        },
      },
    },
  });

  return mapToQueueItem(queueItem);
}

/**
 * Remove content from the scheduling queue.
 *
 * Deletes the queue entry for the specified content.
 * Does not affect the content itself or any existing scheduled time.
 *
 * @param contentId - ID of the marketing content to remove
 *
 * @example
 * ```typescript
 * await removeFromQueue(456);
 * ```
 */
export async function removeFromQueue(contentId: number): Promise<void> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Verify queue item exists and belongs to tenant
  const existing = await prisma.contentScheduleQueue.findFirst({
    where: { contentId, tenantId },
  });

  if (!existing) {
    // Item not in queue - silently return (idempotent operation)
    return;
  }

  await prisma.contentScheduleQueue.delete({
    where: { id: existing.id },
  });

  // Recompact positions to avoid gaps
  await recompactPositions(existing.tenantId ?? '');
}

/**
 * Recompact queue positions to remove gaps after deletion.
 */
async function recompactPositions(tenantId: string): Promise<void> {
  const items = await prisma.contentScheduleQueue.findMany({
    where: { tenantId },
    orderBy: { position: 'asc' },
    select: { id: true, position: true },
  });

  // Update positions to be sequential starting from 1
  const updates = items.map((item, index) =>
    prisma.contentScheduleQueue.update({
      where: { id: item.id },
      data: { position: index + 1 },
    }),
  );

  await prisma.$transaction(updates);
}

/**
 * Reorder items in the queue.
 *
 * Updates the position of multiple queue items in a single operation.
 * Useful for drag-and-drop reordering in the UI.
 *
 * @param tenantId - Tenant identifier for multi-tenant isolation
 * @param items - Array of content IDs with new positions
 *
 * @example
 * ```typescript
 * await reorderQueue('tenant-123', [
 *   { contentId: 456, position: 1 },
 *   { contentId: 789, position: 2 },
 *   { contentId: 123, position: 3 }
 * ]);
 * ```
 */
export async function reorderQueue(
  tenantId: string,
  items: Array<{ contentId: number; position: number }>,
): Promise<void> {
  // Validate all items belong to tenant
  const contentIds = items.map((i) => i.contentId);
  const existingItems = await prisma.contentScheduleQueue.findMany({
    where: {
      tenantId,
      contentId: { in: contentIds },
    },
    select: { contentId: true },
  });

  const existingContentIds = new Set(existingItems.map((i) => i.contentId));

  // Filter to only items that exist in the queue
  const validItems = items.filter((i) => existingContentIds.has(i.contentId));

  if (validItems.length === 0) {
    return;
  }

  // Update positions in a transaction
  const updates = validItems.map((item) =>
    prisma.contentScheduleQueue.update({
      where: { contentId: item.contentId },
      data: { position: item.position },
    }),
  );

  await prisma.$transaction(updates);
}

/**
 * Update queue item properties.
 *
 * @param contentId - ID of the content in queue
 * @param data - Fields to update
 * @returns Updated queue item or null if not found
 */
export async function updateQueueItem(
  contentId: number,
  data: Partial<{
    priority: ContentPriority;
    autoSchedule: boolean;
    targetDateStart: Date | null;
    targetDateEnd: Date | null;
    platforms: string[];
  }>,
): Promise<QueueItem | null> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.contentScheduleQueue.findFirst({
    where: { contentId, tenantId },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.contentScheduleQueue.update({
    where: { id: existing.id },
    data: {
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.autoSchedule !== undefined && {
        autoSchedule: data.autoSchedule,
      }),
      ...(data.targetDateStart !== undefined && {
        targetDateStart: data.targetDateStart,
      }),
      ...(data.targetDateEnd !== undefined && {
        targetDateEnd: data.targetDateEnd,
      }),
      ...(data.platforms !== undefined && { platforms: data.platforms }),
    },
    include: {
      content: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          scheduledFor: true,
        },
      },
    },
  });

  return mapToQueueItem(updated);
}

/**
 * Auto-schedule all queued items with autoSchedule enabled.
 *
 * Processes the queue in priority order, finding optimal times
 * for each item and scheduling them. Items without target platforms
 * default to their content's configured channel.
 *
 * @param tenantId - Tenant identifier for multi-tenant isolation
 * @returns Array of successfully scheduled items
 *
 * @example
 * ```typescript
 * const scheduled = await autoScheduleQueue('tenant-123');
 * console.log(`Scheduled ${scheduled.length} items`);
 * ```
 */
export async function autoScheduleQueue(
  tenantId: string,
): Promise<ScheduledItem[]> {
  // Get all items marked for auto-scheduling
  const autoScheduleItems = await prisma.contentScheduleQueue.findMany({
    where: {
      tenantId,
      autoSchedule: true,
    },
    include: {
      content: {
        select: {
          id: true,
          channel: true,
          scheduledFor: true,
        },
      },
    },
    orderBy: [{ priority: 'desc' }, { position: 'asc' }],
  });

  // Filter out items that are already scheduled
  const unscheduledItems = autoScheduleItems.filter(
    (item) => !item.content.scheduledFor,
  );

  const scheduledResults: ScheduledItem[] = [];
  const usedSlots: Set<string> = new Set(); // Track used time slots

  for (const item of unscheduledItems) {
    // Determine platforms - use queue platforms or fall back to content channel
    const platforms =
      item.platforms.length > 0
        ? item.platforms
        : item.content.channel
          ? [item.content.channel]
          : ['LINKEDIN']; // Default fallback

    // Calculate optimal time with date range constraints
    const dateRange =
      item.targetDateStart && item.targetDateEnd
        ? { start: item.targetDateStart, end: item.targetDateEnd }
        : undefined;

    let optimalTime = await calculateOptimalTime(
      tenantId,
      platforms,
      dateRange,
    );

    // Ensure we don't double-book the same time slot
    let slotKey = optimalTime.toISOString();
    let attempts = 0;
    const maxAttempts = 24; // Try up to 24 different hours

    while (usedSlots.has(slotKey) && attempts < maxAttempts) {
      // Move to next hour
      optimalTime = new Date(optimalTime.getTime() + 60 * 60 * 1000);
      slotKey = optimalTime.toISOString();
      attempts++;
    }

    // Mark slot as used
    usedSlots.add(slotKey);

    // Update content with scheduled time
    await prisma.marketingContent.update({
      where: { id: item.contentId },
      data: { scheduledFor: optimalTime },
    });

    // Remove from queue after scheduling
    await prisma.contentScheduleQueue.delete({
      where: { id: item.id },
    });

    // Record in schedule history
    for (const platform of platforms) {
      await prisma.contentScheduleHistory.create({
        data: {
          tenantId,
          contentId: item.contentId,
          platform,
          scheduledAt: optimalTime,
        },
      });
    }

    scheduledResults.push({
      contentId: item.contentId,
      scheduledFor: optimalTime,
      platforms,
    });
  }

  return scheduledResults;
}

/**
 * Get the count of items in the queue by priority.
 *
 * @param tenantId - Tenant identifier
 * @returns Object with counts by priority level
 */
export async function getQueueStats(
  tenantId: string,
): Promise<Record<ContentPriority, number>> {
  const counts = await prisma.contentScheduleQueue.groupBy({
    by: ['priority'],
    where: { tenantId },
    _count: { id: true },
  });

  const stats: Record<ContentPriority, number> = {
    LOW: 0,
    NORMAL: 0,
    HIGH: 0,
    URGENT: 0,
  };

  for (const count of counts) {
    stats[count.priority] = count._count.id;
  }

  return stats;
}

/**
 * Clear all items from the queue.
 *
 * @param tenantId - Tenant identifier
 * @returns Number of items removed
 */
export async function clearQueue(tenantId: string): Promise<number> {
  const result = await prisma.contentScheduleQueue.deleteMany({
    where: { tenantId },
  });

  return result.count;
}
