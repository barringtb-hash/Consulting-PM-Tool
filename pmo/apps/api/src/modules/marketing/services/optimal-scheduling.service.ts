/**
 * Optimal Scheduling Service
 *
 * Manages optimal posting times for social media content scheduling.
 * Provides AI-powered scheduling recommendations based on historical
 * engagement data and configurable time slot preferences.
 *
 * Features:
 * - Platform-specific optimal time configurations
 * - Historical engagement data analysis
 * - Default time slot initialization
 * - Adaptive learning from engagement metrics
 *
 * @module modules/marketing/services/optimal-scheduling
 */

import prisma from '../../../prisma/client';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';

/**
 * Represents an optimal time slot for content publishing.
 */
export interface OptimalTimeSlot {
  /** Unique identifier */
  id: number;
  /** Target social media platform */
  platform: string;
  /** Day of week (0 = Sunday, 6 = Saturday) */
  dayOfWeek: number;
  /** Hour of day (0-23) */
  hourOfDay: number;
  /** Relative weight/score for this time slot (higher = better) */
  weight: number;
  /** Whether this time slot is enabled for scheduling */
  isEnabled: boolean;
  /** Source of configuration: 'default', 'historical', 'custom' */
  source: string;
}

/**
 * Default optimal times by platform based on industry research.
 * These are used to initialize new tenants with sensible defaults.
 */
const DEFAULT_OPTIMAL_TIMES: Record<
  string,
  Array<{ dayOfWeek: number; hourOfDay: number; weight: number }>
> = {
  LINKEDIN: [
    // Weekday mornings (Tue-Thu best for B2B)
    { dayOfWeek: 2, hourOfDay: 9, weight: 1.0 }, // Tuesday 9am
    { dayOfWeek: 2, hourOfDay: 10, weight: 0.9 },
    { dayOfWeek: 3, hourOfDay: 9, weight: 1.0 }, // Wednesday 9am
    { dayOfWeek: 3, hourOfDay: 10, weight: 0.9 },
    { dayOfWeek: 4, hourOfDay: 9, weight: 0.95 }, // Thursday 9am
    { dayOfWeek: 4, hourOfDay: 10, weight: 0.85 },
    // Lunch breaks
    { dayOfWeek: 2, hourOfDay: 12, weight: 0.8 },
    { dayOfWeek: 3, hourOfDay: 12, weight: 0.8 },
    { dayOfWeek: 4, hourOfDay: 12, weight: 0.75 },
    // End of workday
    { dayOfWeek: 2, hourOfDay: 17, weight: 0.7 },
    { dayOfWeek: 3, hourOfDay: 17, weight: 0.7 },
    { dayOfWeek: 4, hourOfDay: 17, weight: 0.65 },
  ],
  TWITTER: [
    // Mornings are good for Twitter
    { dayOfWeek: 1, hourOfDay: 8, weight: 0.9 }, // Monday
    { dayOfWeek: 2, hourOfDay: 8, weight: 0.95 },
    { dayOfWeek: 3, hourOfDay: 8, weight: 1.0 },
    { dayOfWeek: 4, hourOfDay: 8, weight: 0.95 },
    { dayOfWeek: 5, hourOfDay: 8, weight: 0.85 },
    // Afternoon engagement
    { dayOfWeek: 1, hourOfDay: 13, weight: 0.8 },
    { dayOfWeek: 2, hourOfDay: 13, weight: 0.85 },
    { dayOfWeek: 3, hourOfDay: 13, weight: 0.85 },
    { dayOfWeek: 4, hourOfDay: 13, weight: 0.85 },
    { dayOfWeek: 5, hourOfDay: 13, weight: 0.75 },
    // Evening engagement
    { dayOfWeek: 0, hourOfDay: 19, weight: 0.7 }, // Sunday evening
    { dayOfWeek: 6, hourOfDay: 19, weight: 0.65 }, // Saturday evening
  ],
  INSTAGRAM: [
    // Early morning and evening for Instagram
    { dayOfWeek: 1, hourOfDay: 7, weight: 0.85 },
    { dayOfWeek: 2, hourOfDay: 7, weight: 0.9 },
    { dayOfWeek: 3, hourOfDay: 7, weight: 0.9 },
    { dayOfWeek: 4, hourOfDay: 7, weight: 0.9 },
    { dayOfWeek: 5, hourOfDay: 7, weight: 0.85 },
    // Lunch breaks
    { dayOfWeek: 1, hourOfDay: 12, weight: 0.8 },
    { dayOfWeek: 2, hourOfDay: 12, weight: 0.85 },
    { dayOfWeek: 3, hourOfDay: 12, weight: 0.85 },
    { dayOfWeek: 4, hourOfDay: 12, weight: 0.85 },
    { dayOfWeek: 5, hourOfDay: 12, weight: 0.8 },
    // Evening peak (6-8pm)
    { dayOfWeek: 0, hourOfDay: 19, weight: 0.95 },
    { dayOfWeek: 1, hourOfDay: 19, weight: 0.95 },
    { dayOfWeek: 2, hourOfDay: 19, weight: 1.0 },
    { dayOfWeek: 3, hourOfDay: 19, weight: 1.0 },
    { dayOfWeek: 4, hourOfDay: 19, weight: 0.95 },
    { dayOfWeek: 5, hourOfDay: 20, weight: 0.9 },
    { dayOfWeek: 6, hourOfDay: 20, weight: 0.85 },
  ],
  FACEBOOK: [
    // Mid-morning to afternoon
    { dayOfWeek: 1, hourOfDay: 10, weight: 0.85 },
    { dayOfWeek: 2, hourOfDay: 10, weight: 0.9 },
    { dayOfWeek: 3, hourOfDay: 10, weight: 0.9 },
    { dayOfWeek: 4, hourOfDay: 10, weight: 0.9 },
    { dayOfWeek: 5, hourOfDay: 10, weight: 0.85 },
    // Afternoon
    { dayOfWeek: 1, hourOfDay: 14, weight: 0.8 },
    { dayOfWeek: 2, hourOfDay: 14, weight: 0.85 },
    { dayOfWeek: 3, hourOfDay: 14, weight: 0.85 },
    { dayOfWeek: 4, hourOfDay: 14, weight: 0.85 },
    { dayOfWeek: 5, hourOfDay: 14, weight: 0.8 },
    // Weekend engagement
    { dayOfWeek: 0, hourOfDay: 11, weight: 0.75 },
    { dayOfWeek: 6, hourOfDay: 11, weight: 0.75 },
  ],
};

/**
 * Get optimal posting times for a specific platform.
 *
 * Returns time slots sorted by weight (highest first) with optional
 * count limit for top N recommendations.
 *
 * @param tenantId - Tenant identifier for multi-tenant isolation
 * @param platform - Target social media platform (e.g., 'LINKEDIN', 'TWITTER')
 * @param count - Optional limit on number of time slots to return
 * @returns Array of optimal time slots sorted by weight descending
 *
 * @example
 * ```typescript
 * const times = await getOptimalTimes('tenant-123', 'LINKEDIN', 5);
 * // Returns top 5 optimal posting times for LinkedIn
 * ```
 */
export async function getOptimalTimes(
  tenantId: string,
  platform: string,
  count?: number,
): Promise<OptimalTimeSlot[]> {
  const timeConfigs = await prisma.optimalTimeConfiguration.findMany({
    where: {
      tenantId,
      platform: platform.toUpperCase(),
      isEnabled: true,
    },
    orderBy: { weight: 'desc' },
    ...(count ? { take: count } : {}),
  });

  // If no configurations exist, initialize defaults and return them
  if (timeConfigs.length === 0) {
    await initializeDefaultTimes(tenantId);

    // Fetch the newly created configurations
    const newConfigs = await prisma.optimalTimeConfiguration.findMany({
      where: {
        tenantId,
        platform: platform.toUpperCase(),
        isEnabled: true,
      },
      orderBy: { weight: 'desc' },
      ...(count ? { take: count } : {}),
    });

    return newConfigs.map(mapToOptimalTimeSlot);
  }

  return timeConfigs.map(mapToOptimalTimeSlot);
}

/**
 * Maps a database OptimalTimeConfiguration record to the OptimalTimeSlot interface.
 */
function mapToOptimalTimeSlot(config: {
  id: number;
  platform: string;
  dayOfWeek: number;
  hourOfDay: number;
  weight: number;
  isEnabled: boolean;
  source: string;
}): OptimalTimeSlot {
  return {
    id: config.id,
    platform: config.platform,
    dayOfWeek: config.dayOfWeek,
    hourOfDay: config.hourOfDay,
    weight: config.weight,
    isEnabled: config.isEnabled,
    source: config.source,
  };
}

/**
 * Calculate the best posting time based on historical data and preferences.
 *
 * Analyzes configured optimal times across multiple platforms and finds
 * the next available time slot within the specified date range that
 * maximizes engagement potential.
 *
 * @param tenantId - Tenant identifier for multi-tenant isolation
 * @param platforms - Array of target platforms to consider
 * @param preferredDateRange - Optional date range constraints for scheduling
 * @returns Calculated optimal Date for publishing
 *
 * @example
 * ```typescript
 * const optimalTime = await calculateOptimalTime(
 *   'tenant-123',
 *   ['LINKEDIN', 'TWITTER'],
 *   { start: new Date('2024-01-15'), end: new Date('2024-01-22') }
 * );
 * ```
 */
export async function calculateOptimalTime(
  tenantId: string,
  platforms: string[],
  preferredDateRange?: { start: Date; end: Date },
): Promise<Date> {
  // Normalize platform names
  const normalizedPlatforms = platforms.map((p) => p.toUpperCase());

  // Get optimal time configurations for all requested platforms
  const timeConfigs = await prisma.optimalTimeConfiguration.findMany({
    where: {
      tenantId,
      platform: { in: normalizedPlatforms },
      isEnabled: true,
    },
    orderBy: { weight: 'desc' },
  });

  // Use default start if no range provided (now)
  const rangeStart = preferredDateRange?.start ?? new Date();
  const rangeEnd =
    preferredDateRange?.end ??
    new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 1 week

  // If no configurations, use a reasonable default (next business day at 9am)
  if (timeConfigs.length === 0) {
    return findNextBusinessDaySlot(rangeStart);
  }

  // Find the best time slot within the date range
  const bestSlot = findBestSlotInRange(timeConfigs, rangeStart, rangeEnd);

  return bestSlot;
}

/**
 * Finds the next business day at 9am from the given start date.
 */
function findNextBusinessDaySlot(from: Date): Date {
  const result = new Date(from);
  result.setHours(9, 0, 0, 0);

  // If current time is past 9am, move to next day
  if (from.getHours() >= 9) {
    result.setDate(result.getDate() + 1);
  }

  // Skip weekends
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

/**
 * Finds the best time slot within a date range based on configured weights.
 */
function findBestSlotInRange(
  configs: Array<{
    dayOfWeek: number;
    hourOfDay: number;
    weight: number;
  }>,
  rangeStart: Date,
  rangeEnd: Date,
): Date {
  // Sort by weight descending
  const sortedConfigs = [...configs].sort((a, b) => b.weight - a.weight);

  const now = new Date();

  // Try each config slot starting from highest weight
  for (const config of sortedConfigs) {
    const slotDate = findNextOccurrence(
      config.dayOfWeek,
      config.hourOfDay,
      rangeStart,
    );

    // Check if slot is within range and in the future
    if (slotDate >= now && slotDate <= rangeEnd) {
      return slotDate;
    }
  }

  // Fallback: return start of range at 9am if no optimal slot found
  const fallback = new Date(rangeStart);
  fallback.setHours(9, 0, 0, 0);

  if (fallback <= now) {
    fallback.setDate(fallback.getDate() + 1);
  }

  return fallback;
}

/**
 * Finds the next occurrence of a specific day/hour combination from a start date.
 */
function findNextOccurrence(
  dayOfWeek: number,
  hourOfDay: number,
  from: Date,
): Date {
  const result = new Date(from);
  result.setHours(hourOfDay, 0, 0, 0);

  // Calculate days until target day
  const currentDay = result.getDay();
  let daysUntilTarget = dayOfWeek - currentDay;

  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  } else if (daysUntilTarget === 0 && result <= from) {
    // Same day but time has passed, go to next week
    daysUntilTarget = 7;
  }

  result.setDate(result.getDate() + daysUntilTarget);

  return result;
}

/**
 * Initialize default optimal times for a tenant.
 *
 * Creates platform-specific time slot configurations based on
 * industry-standard best practices. Should be called when a new
 * tenant is onboarded or when resetting to defaults.
 *
 * @param tenantId - Tenant identifier for multi-tenant isolation
 *
 * @example
 * ```typescript
 * await initializeDefaultTimes('tenant-123');
 * // Creates default time slots for all platforms
 * ```
 */
export async function initializeDefaultTimes(tenantId: string): Promise<void> {
  const platforms = Object.keys(DEFAULT_OPTIMAL_TIMES);

  for (const platform of platforms) {
    const slots = DEFAULT_OPTIMAL_TIMES[platform];

    for (const slot of slots) {
      // Use upsert to avoid duplicates
      await prisma.optimalTimeConfiguration.upsert({
        where: {
          tenantId_platform_dayOfWeek_hourOfDay: {
            tenantId,
            platform,
            dayOfWeek: slot.dayOfWeek,
            hourOfDay: slot.hourOfDay,
          },
        },
        update: {
          // Only update if source is 'default' (don't override custom settings)
          weight: slot.weight,
        },
        create: {
          tenantId,
          platform,
          dayOfWeek: slot.dayOfWeek,
          hourOfDay: slot.hourOfDay,
          weight: slot.weight,
          isEnabled: true,
          source: 'default',
        },
      });
    }
  }
}

/**
 * Update optimal times based on engagement data.
 *
 * Uses actual engagement metrics to adjust time slot weights,
 * enabling the system to learn and improve recommendations
 * over time for each tenant.
 *
 * Algorithm:
 * - Normalizes engagement score to 0-1 range
 * - Applies weighted average with existing weight (70% history, 30% new data)
 * - Marks the slot as 'historical' source to indicate data-driven adjustment
 *
 * @param tenantId - Tenant identifier for multi-tenant isolation
 * @param platform - Social media platform of the published content
 * @param publishedAt - When the content was published
 * @param engagementScore - Normalized engagement score (0-1 scale recommended)
 *
 * @example
 * ```typescript
 * await updateFromEngagement(
 *   'tenant-123',
 *   'LINKEDIN',
 *   new Date('2024-01-15T09:00:00Z'),
 *   0.85 // High engagement
 * );
 * ```
 */
export async function updateFromEngagement(
  tenantId: string,
  platform: string,
  publishedAt: Date,
  engagementScore: number,
): Promise<void> {
  const normalizedPlatform = platform.toUpperCase();
  const dayOfWeek = publishedAt.getDay();
  const hourOfDay = publishedAt.getHours();

  // Normalize engagement score to 0-1 range
  const normalizedScore = Math.min(1, Math.max(0, engagementScore));

  // Find existing configuration
  const existing = await prisma.optimalTimeConfiguration.findUnique({
    where: {
      tenantId_platform_dayOfWeek_hourOfDay: {
        tenantId,
        platform: normalizedPlatform,
        dayOfWeek,
        hourOfDay,
      },
    },
  });

  if (existing) {
    // Calculate new weight using weighted average (70% existing, 30% new)
    const newWeight = existing.weight * 0.7 + normalizedScore * 0.3;

    await prisma.optimalTimeConfiguration.update({
      where: { id: existing.id },
      data: {
        weight: Math.min(1, Math.max(0, newWeight)),
        source: 'historical',
      },
    });
  } else {
    // Create new configuration based on engagement data
    await prisma.optimalTimeConfiguration.create({
      data: {
        tenantId,
        platform: normalizedPlatform,
        dayOfWeek,
        hourOfDay,
        weight: normalizedScore,
        isEnabled: true,
        source: 'historical',
      },
    });
  }
}

/**
 * Get all optimal times for a tenant across all platforms.
 * Useful for displaying a complete scheduling calendar view.
 *
 * @param tenantId - Tenant identifier
 * @returns All optimal time configurations for the tenant
 */
export async function getAllOptimalTimes(
  tenantId: string,
): Promise<OptimalTimeSlot[]> {
  const configs = await prisma.optimalTimeConfiguration.findMany({
    where: { tenantId, isEnabled: true },
    orderBy: [{ platform: 'asc' }, { weight: 'desc' }],
  });

  return configs.map(mapToOptimalTimeSlot);
}

/**
 * Update a specific optimal time configuration.
 *
 * @param id - Configuration ID
 * @param data - Fields to update
 * @returns Updated configuration
 */
export async function updateOptimalTime(
  id: number,
  data: Partial<{
    weight: number;
    isEnabled: boolean;
    source: string;
  }>,
): Promise<OptimalTimeSlot | null> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.optimalTimeConfiguration.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.optimalTimeConfiguration.update({
    where: { id },
    data: {
      ...(data.weight !== undefined && { weight: data.weight }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      ...(data.source !== undefined && { source: data.source }),
    },
  });

  return mapToOptimalTimeSlot(updated);
}

/**
 * Delete an optimal time configuration.
 *
 * @param id - Configuration ID
 * @returns True if deleted, false if not found
 */
export async function deleteOptimalTime(id: number): Promise<boolean> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.optimalTimeConfiguration.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return false;
  }

  await prisma.optimalTimeConfiguration.delete({
    where: { id },
  });

  return true;
}
