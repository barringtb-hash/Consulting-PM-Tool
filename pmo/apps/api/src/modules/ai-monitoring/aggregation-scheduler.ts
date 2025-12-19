/**
 * AI Usage Aggregation Scheduler
 *
 * Handles scheduled aggregation of AI usage data:
 * - Hourly: Aggregate raw events into hourly summaries
 * - Daily: Aggregate hourly summaries into daily summaries
 * - Cost threshold checks: Monitor for budget alerts
 *
 * This module integrates with the existing BullMQ queue system when available,
 * and falls back to simple setInterval when Redis is not configured.
 */

import { aggregateHourlyUsage, aggregateDailyUsage, checkCostThresholds } from './ai-usage.service';
import { logger } from '../../utils/logger';

// Simple in-memory scheduler when Redis is not available
let hourlyInterval: NodeJS.Timeout | null = null;
let dailyInterval: NodeJS.Timeout | null = null;
let costCheckInterval: NodeJS.Timeout | null = null;

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;
const SIX_HOURS = 6 * ONE_HOUR;

/**
 * Start the aggregation scheduler
 *
 * This uses simple setInterval for scheduling since the aggregation jobs
 * are idempotent and don't need the reliability guarantees of a queue.
 */
export function startAggregationScheduler(): void {
  logger.info('Starting AI usage aggregation scheduler');

  // Hourly aggregation - runs at the top of each hour
  const msUntilNextHour = ONE_HOUR - (Date.now() % ONE_HOUR);
  setTimeout(() => {
    runHourlyAggregation();
    hourlyInterval = setInterval(runHourlyAggregation, ONE_HOUR);
  }, msUntilNextHour);

  // Daily aggregation - runs at midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  setTimeout(() => {
    runDailyAggregation();
    dailyInterval = setInterval(runDailyAggregation, ONE_DAY);
  }, msUntilMidnight);

  // Cost threshold check - runs every 6 hours
  costCheckInterval = setInterval(runCostThresholdCheck, SIX_HOURS);
  // Run immediately on startup
  runCostThresholdCheck();

  logger.info('AI usage aggregation scheduler started', {
    nextHourlyRun: new Date(Date.now() + msUntilNextHour).toISOString(),
    nextDailyRun: midnight.toISOString(),
  });
}

/**
 * Stop the aggregation scheduler
 */
export function stopAggregationScheduler(): void {
  if (hourlyInterval) {
    clearInterval(hourlyInterval);
    hourlyInterval = null;
  }
  if (dailyInterval) {
    clearInterval(dailyInterval);
    dailyInterval = null;
  }
  if (costCheckInterval) {
    clearInterval(costCheckInterval);
    costCheckInterval = null;
  }
  logger.info('AI usage aggregation scheduler stopped');
}

/**
 * Run hourly aggregation
 */
async function runHourlyAggregation(): Promise<void> {
  const startTime = Date.now();
  logger.info('Running hourly AI usage aggregation');

  try {
    await aggregateHourlyUsage();
    logger.info('Hourly AI usage aggregation completed', {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Hourly AI usage aggregation failed', { error });
  }
}

/**
 * Run daily aggregation
 */
async function runDailyAggregation(): Promise<void> {
  const startTime = Date.now();
  logger.info('Running daily AI usage aggregation');

  try {
    await aggregateDailyUsage();
    logger.info('Daily AI usage aggregation completed', {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Daily AI usage aggregation failed', { error });
  }
}

/**
 * Run cost threshold check
 */
async function runCostThresholdCheck(): Promise<void> {
  logger.info('Running AI cost threshold check');

  try {
    const alerts = await checkCostThresholds();

    if (alerts.length > 0) {
      logger.warn('AI cost threshold alerts detected', {
        alertCount: alerts.length,
        alerts: alerts.map((a) => ({
          tenantId: a.tenantId,
          tenantName: a.tenantName,
          monthlyCost: a.monthlyCost,
          threshold: a.threshold,
        })),
      });

      // TODO: Send alerts via email/Slack
      // For now, just log them
      for (const alert of alerts) {
        logger.warn(`AI Cost Alert: ${alert.threshold}`, {
          tenantId: alert.tenantId,
          tenantName: alert.tenantName,
          monthlyCost: `$${alert.monthlyCost.toFixed(2)}`,
          thresholdValue: `$${alert.thresholdValue}`,
        });
      }
    } else {
      logger.info('No AI cost threshold alerts');
    }
  } catch (error) {
    logger.error('AI cost threshold check failed', { error });
  }
}

/**
 * Manually trigger aggregation (useful for testing or catch-up)
 */
export async function manualAggregation(type: 'hourly' | 'daily' | 'both'): Promise<void> {
  if (type === 'hourly' || type === 'both') {
    await runHourlyAggregation();
  }
  if (type === 'daily' || type === 'both') {
    await runDailyAggregation();
  }
}
