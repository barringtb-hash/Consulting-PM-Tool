/**
 * Calendar Service
 *
 * Manages the content calendar for marketing content scheduling.
 * Provides functionality to view scheduled content, schedule/unschedule
 * content, and perform bulk scheduling operations.
 *
 * Features:
 * - Date range calendar views with content aggregation
 * - Individual content scheduling
 * - Bulk scheduling operations
 * - Schedule history tracking
 * - Platform-specific scheduling
 *
 * @module modules/marketing/services/calendar
 */

import prisma from '../../../prisma/client';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';

/**
 * Represents a single calendar entry.
 */
export interface CalendarEntry {
  /** Content ID */
  id: number;
  /** Content name/title */
  name: string;
  /** Content type (BLOG_POST, LINKEDIN_POST, etc.) */
  type: string;
  /** Current status */
  status: string;
  /** Scheduled publication time */
  scheduledFor: Date;
  /** Target channel */
  channel: string | null;
  /** Associated campaign ID */
  campaignId: number | null;
  /** Published URL (if already published) */
  publishedUrl: string | null;
  /** Actual publish time (if published) */
  publishedAt: Date | null;
}

/**
 * Represents calendar data for a date range.
 */
export interface CalendarData {
  /** Start of the date range */
  startDate: Date;
  /** End of the date range */
  endDate: Date;
  /** All scheduled entries in the range */
  entries: CalendarEntry[];
  /** Entries grouped by date (ISO date string -> entries) */
  byDate: Record<string, CalendarEntry[]>;
  /** Summary statistics */
  summary: {
    /** Total number of scheduled items */
    totalScheduled: number;
    /** Number already published */
    published: number;
    /** Number pending publication */
    pending: number;
    /** Breakdown by content type */
    byType: Record<string, number>;
    /** Breakdown by channel */
    byChannel: Record<string, number>;
  };
}

/**
 * Get calendar data for a date range.
 *
 * Returns all scheduled marketing content within the specified range,
 * organized for calendar display with groupings and statistics.
 *
 * @param tenantId - Tenant identifier for multi-tenant isolation
 * @param startDate - Start of the date range (inclusive)
 * @param endDate - End of the date range (inclusive)
 * @returns Calendar data with entries, groupings, and summary
 *
 * @example
 * ```typescript
 * const calendar = await getCalendarData(
 *   'tenant-123',
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31')
 * );
 * console.log(calendar.summary.totalScheduled);
 * ```
 */
export async function getCalendarData(
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<CalendarData> {
  // Normalize dates to start/end of day
  const normalizedStart = new Date(startDate);
  normalizedStart.setHours(0, 0, 0, 0);

  const normalizedEnd = new Date(endDate);
  normalizedEnd.setHours(23, 59, 59, 999);

  // Fetch all scheduled content in the date range
  const scheduledContent = await prisma.marketingContent.findMany({
    where: {
      tenantId,
      scheduledFor: {
        gte: normalizedStart,
        lte: normalizedEnd,
      },
      archived: false,
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      scheduledFor: true,
      channel: true,
      campaignId: true,
      publishedUrl: true,
      publishedAt: true,
    },
    orderBy: { scheduledFor: 'asc' },
  });

  // Map to calendar entries
  const entries: CalendarEntry[] = scheduledContent.map((content) => ({
    id: content.id,
    name: content.name,
    type: content.type,
    status: content.status,
    scheduledFor: content.scheduledFor!,
    channel: content.channel,
    campaignId: content.campaignId,
    publishedUrl: content.publishedUrl,
    publishedAt: content.publishedAt,
  }));

  // Group entries by date
  const byDate: Record<string, CalendarEntry[]> = {};

  for (const entry of entries) {
    const dateKey = entry.scheduledFor.toISOString().split('T')[0];
    if (!byDate[dateKey]) {
      byDate[dateKey] = [];
    }
    byDate[dateKey].push(entry);
  }

  // Calculate summary statistics
  const published = entries.filter((e) => e.publishedAt !== null).length;
  const pending = entries.length - published;

  const byType: Record<string, number> = {};
  const byChannel: Record<string, number> = {};

  for (const entry of entries) {
    // Count by type
    byType[entry.type] = (byType[entry.type] || 0) + 1;

    // Count by channel
    const channel = entry.channel || 'UNSPECIFIED';
    byChannel[channel] = (byChannel[channel] || 0) + 1;
  }

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd,
    entries,
    byDate,
    summary: {
      totalScheduled: entries.length,
      published,
      pending,
      byType,
      byChannel,
    },
  };
}

/**
 * Schedule content to a specific time.
 *
 * Sets the scheduledFor time on a marketing content item and
 * optionally updates target platforms.
 *
 * @param contentId - ID of the marketing content to schedule
 * @param scheduledFor - Target publication date/time
 * @param platforms - Optional array of target platforms
 * @returns Updated marketing content
 *
 * @example
 * ```typescript
 * const content = await scheduleContent(
 *   456,
 *   new Date('2024-01-15T09:00:00Z'),
 *   ['LINKEDIN', 'TWITTER']
 * );
 * ```
 */
export async function scheduleContent(
  contentId: number,
  scheduledFor: Date,
  platforms: string[],
): Promise<{
  id: number;
  name: string;
  type: string;
  status: string;
  scheduledFor: Date | null;
  channel: string | null;
}> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Verify content exists and belongs to tenant
  const existing = await prisma.marketingContent.findFirst({
    where: { id: contentId, tenantId },
  });

  if (!existing) {
    throw new Error(`Content with ID ${contentId} not found or access denied`);
  }

  // Validate scheduled time is in the future
  if (scheduledFor <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }

  // Update the content with new schedule
  const updated = await prisma.marketingContent.update({
    where: { id: contentId },
    data: {
      scheduledFor,
      // Update status to READY if currently in DRAFT or APPROVED
      status:
        existing.status === 'DRAFT' || existing.status === 'APPROVED'
          ? 'READY'
          : existing.status,
      // Set channel to first platform if provided and no channel set
      ...(platforms.length > 0 &&
        !existing.channel && {
          channel: platforms[0] as
            | 'LINKEDIN'
            | 'TWITTER'
            | 'INSTAGRAM'
            | 'WEB'
            | 'EMAIL'
            | 'GENERIC',
        }),
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      scheduledFor: true,
      channel: true,
    },
  });

  // Record in schedule history for each platform
  for (const platform of platforms) {
    await prisma.contentScheduleHistory.create({
      data: {
        tenantId: tenantId ?? null,
        contentId,
        platform,
        scheduledAt: scheduledFor,
      },
    });
  }

  // Remove from queue if present
  await prisma.contentScheduleQueue.deleteMany({
    where: { contentId },
  });

  return updated;
}

/**
 * Unschedule content (remove scheduled time).
 *
 * Clears the scheduledFor time, reverting the content to
 * an unscheduled state.
 *
 * @param contentId - ID of the marketing content to unschedule
 * @returns Updated marketing content
 *
 * @example
 * ```typescript
 * const content = await unscheduleContent(456);
 * console.log(content.scheduledFor); // null
 * ```
 */
export async function unscheduleContent(contentId: number): Promise<{
  id: number;
  name: string;
  type: string;
  status: string;
  scheduledFor: Date | null;
  channel: string | null;
}> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Verify content exists and belongs to tenant
  const existing = await prisma.marketingContent.findFirst({
    where: { id: contentId, tenantId },
  });

  if (!existing) {
    throw new Error(`Content with ID ${contentId} not found or access denied`);
  }

  // Don't allow unscheduling already published content
  if (existing.publishedAt) {
    throw new Error('Cannot unschedule published content');
  }

  // Update the content to remove schedule
  const updated = await prisma.marketingContent.update({
    where: { id: contentId },
    data: {
      scheduledFor: null,
      // Revert status to APPROVED if it was READY
      status: existing.status === 'READY' ? 'APPROVED' : existing.status,
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      scheduledFor: true,
      channel: true,
    },
  });

  return updated;
}

/**
 * Bulk schedule multiple content items.
 *
 * Schedules multiple items in a single transaction for efficiency.
 * Each item can have its own scheduled time.
 *
 * @param items - Array of content IDs with scheduled times
 * @returns Array of updated content items
 *
 * @example
 * ```typescript
 * const scheduled = await bulkSchedule([
 *   { contentId: 456, scheduledFor: new Date('2024-01-15T09:00:00Z') },
 *   { contentId: 789, scheduledFor: new Date('2024-01-16T09:00:00Z') },
 * ]);
 * ```
 */
export async function bulkSchedule(
  items: Array<{ contentId: number; scheduledFor: Date }>,
): Promise<
  Array<{
    id: number;
    name: string;
    type: string;
    status: string;
    scheduledFor: Date | null;
    channel: string | null;
  }>
> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const now = new Date();

  // Validate all items
  const contentIds = items.map((i) => i.contentId);
  const existingContent = await prisma.marketingContent.findMany({
    where: {
      id: { in: contentIds },
      tenantId,
    },
    select: { id: true, status: true, channel: true },
  });

  const existingMap = new Map(existingContent.map((c) => [c.id, c]));

  // Filter to valid items (exist, belong to tenant, scheduled in future)
  const validItems = items.filter((item) => {
    const existing = existingMap.get(item.contentId);
    return existing && item.scheduledFor > now;
  });

  if (validItems.length === 0) {
    return [];
  }

  // Perform updates in a transaction
  const updates = validItems.map((item) => {
    const existing = existingMap.get(item.contentId)!;
    return prisma.marketingContent.update({
      where: { id: item.contentId },
      data: {
        scheduledFor: item.scheduledFor,
        status:
          existing.status === 'DRAFT' || existing.status === 'APPROVED'
            ? 'READY'
            : existing.status,
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        scheduledFor: true,
        channel: true,
      },
    });
  });

  // Execute all updates
  const results = await prisma.$transaction(updates);

  // Record history for each scheduled item
  for (const item of validItems) {
    const existing = existingMap.get(item.contentId);
    const channel = existing?.channel ?? 'GENERIC';

    await prisma.contentScheduleHistory.create({
      data: {
        tenantId: tenantId ?? null,
        contentId: item.contentId,
        platform: channel,
        scheduledAt: item.scheduledFor,
      },
    });
  }

  // Remove from queue
  await prisma.contentScheduleQueue.deleteMany({
    where: { contentId: { in: validItems.map((i) => i.contentId) } },
  });

  return results;
}

/**
 * Get schedule history for a content item.
 *
 * @param contentId - ID of the marketing content
 * @returns Array of schedule history records
 */
export async function getContentScheduleHistory(contentId: number): Promise<
  Array<{
    id: number;
    platform: string;
    scheduledAt: Date;
    publishedAt: Date | null;
    engagementScore: number | null;
  }>
> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const history = await prisma.contentScheduleHistory.findMany({
    where: { contentId, tenantId },
    orderBy: { scheduledAt: 'desc' },
    select: {
      id: true,
      platform: true,
      scheduledAt: true,
      publishedAt: true,
      engagementScore: true,
    },
  });

  return history;
}

/**
 * Get upcoming scheduled content.
 *
 * Returns content scheduled within the next N days.
 *
 * @param tenantId - Tenant identifier
 * @param days - Number of days to look ahead (default: 7)
 * @returns Array of upcoming calendar entries
 */
export async function getUpcomingContent(
  tenantId: string,
  days: number = 7,
): Promise<CalendarEntry[]> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const content = await prisma.marketingContent.findMany({
    where: {
      tenantId,
      scheduledFor: {
        gte: now,
        lte: futureDate,
      },
      archived: false,
      publishedAt: null, // Only unpublished
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      scheduledFor: true,
      channel: true,
      campaignId: true,
      publishedUrl: true,
      publishedAt: true,
    },
    orderBy: { scheduledFor: 'asc' },
  });

  return content.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    scheduledFor: c.scheduledFor!,
    channel: c.channel,
    campaignId: c.campaignId,
    publishedUrl: c.publishedUrl,
    publishedAt: c.publishedAt,
  }));
}

/**
 * Reschedule content to a new time.
 *
 * Updates the scheduled time for existing scheduled content.
 *
 * @param contentId - ID of the marketing content
 * @param newScheduledFor - New scheduled time
 * @returns Updated content
 */
export async function rescheduleContent(
  contentId: number,
  newScheduledFor: Date,
): Promise<{
  id: number;
  name: string;
  scheduledFor: Date | null;
}> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Verify content exists and is scheduled
  const existing = await prisma.marketingContent.findFirst({
    where: { id: contentId, tenantId },
  });

  if (!existing) {
    throw new Error(`Content with ID ${contentId} not found or access denied`);
  }

  if (!existing.scheduledFor) {
    throw new Error('Content is not currently scheduled');
  }

  if (existing.publishedAt) {
    throw new Error('Cannot reschedule published content');
  }

  if (newScheduledFor <= new Date()) {
    throw new Error('New scheduled time must be in the future');
  }

  const updated = await prisma.marketingContent.update({
    where: { id: contentId },
    data: { scheduledFor: newScheduledFor },
    select: {
      id: true,
      name: true,
      scheduledFor: true,
    },
  });

  // Record new schedule in history
  await prisma.contentScheduleHistory.create({
    data: {
      tenantId: tenantId ?? null,
      contentId,
      platform: existing.channel ?? 'GENERIC',
      scheduledAt: newScheduledFor,
    },
  });

  return updated;
}

/**
 * Get calendar availability (free slots) for scheduling.
 *
 * Analyzes the calendar to find time slots that don't have
 * scheduled content, useful for scheduling suggestions.
 *
 * @param tenantId - Tenant identifier
 * @param startDate - Start of range
 * @param endDate - End of range
 * @param slotDurationMinutes - Slot duration in minutes (default: 60)
 * @returns Array of available time slots
 */
export async function getAvailableSlots(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  slotDurationMinutes: number = 60,
): Promise<Date[]> {
  // Get existing scheduled times
  const scheduled = await prisma.marketingContent.findMany({
    where: {
      tenantId,
      scheduledFor: {
        gte: startDate,
        lte: endDate,
      },
      archived: false,
    },
    select: { scheduledFor: true },
  });

  // Build set of occupied hours
  const occupiedSlots = new Set<string>();
  for (const content of scheduled) {
    if (content.scheduledFor) {
      // Round to slot boundaries
      const slotTime = new Date(content.scheduledFor);
      slotTime.setMinutes(0, 0, 0);
      occupiedSlots.add(slotTime.toISOString());
    }
  }

  // Generate available slots (business hours only: 8am-6pm, weekdays)
  const availableSlots: Date[] = [];
  const current = new Date(startDate);
  current.setHours(8, 0, 0, 0);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const hour = current.getHours();

    // Skip weekends and non-business hours
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && hour >= 8 && hour < 18) {
      const slotKey = current.toISOString();
      if (!occupiedSlots.has(slotKey)) {
        availableSlots.push(new Date(current));
      }
    }

    // Move to next slot
    current.setMinutes(current.getMinutes() + slotDurationMinutes);

    // If we've gone past business hours, move to next day
    if (current.getHours() >= 18) {
      current.setDate(current.getDate() + 1);
      current.setHours(8, 0, 0, 0);
    }
  }

  return availableSlots;
}
