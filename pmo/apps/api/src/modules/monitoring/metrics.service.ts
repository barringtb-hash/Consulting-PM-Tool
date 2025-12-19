/**
 * Infrastructure Metrics Service
 *
 * Collects and stores infrastructure metrics including:
 * - API request latency and throughput
 * - Error rates by endpoint
 * - Database query performance
 * - System resource usage (memory, CPU, event loop)
 */

import { prisma } from '../../prisma/client';
import { logger } from '../../utils/logger';

// ============================================================================
// IN-MEMORY METRICS STORE (for real-time aggregation)
// ============================================================================

interface _MetricPoint {
  value: number;
  timestamp: number;
}

interface MetricBucket {
  count: number;
  sum: number;
  min: number;
  max: number;
  values: number[]; // For percentile calculation
}

// Rolling window metrics store
const metricsStore: Map<string, MetricBucket> = new Map();
const WINDOW_SIZE_MS = 60 * 1000; // 1 minute windows
let lastFlushTime = Date.now();

// ============================================================================
// METRIC RECORDING
// ============================================================================

/**
 * Record a metric value
 */
export function recordMetric(
  metricType: string,
  metricName: string,
  value: number,
  tenantId?: string,
): void {
  const key = tenantId
    ? `${metricType}:${metricName}:${tenantId}`
    : `${metricType}:${metricName}`;

  let bucket = metricsStore.get(key);
  if (!bucket) {
    bucket = {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      values: [],
    };
    metricsStore.set(key, bucket);
  }

  bucket.count++;
  bucket.sum += value;
  bucket.min = Math.min(bucket.min, value);
  bucket.max = Math.max(bucket.max, value);

  // Keep values for percentile calculation (limit to avoid memory issues)
  if (bucket.values.length < 10000) {
    bucket.values.push(value);
  }
}

/**
 * Record API request metrics
 */
export function recordAPIMetrics(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  tenantId?: string,
): void {
  const endpoint = `${method} ${path}`;

  // Record latency
  recordMetric('API_LATENCY', endpoint, durationMs, tenantId);

  // Record by status code category
  const statusCategory = Math.floor(statusCode / 100) * 100;
  recordMetric('API_STATUS', `${endpoint}:${statusCategory}`, 1, tenantId);

  // Record errors (4xx and 5xx)
  if (statusCode >= 400) {
    recordMetric('API_ERROR', endpoint, 1, tenantId);
  }

  // Record overall request count
  recordMetric('API_REQUEST', endpoint, 1, tenantId);
}

/**
 * Record database query metrics
 */
export function recordDBMetrics(
  model: string,
  operation: string,
  durationMs: number,
  tenantId?: string,
): void {
  const queryName = `${model}.${operation}`;

  recordMetric('DB_QUERY', queryName, durationMs, tenantId);

  // Log slow queries
  if (durationMs > 100) {
    recordMetric('DB_SLOW_QUERY', queryName, durationMs, tenantId);
  }
}

/**
 * Record system metrics
 */
export function recordSystemMetrics(): void {
  const memUsage = process.memoryUsage();

  recordMetric('SYSTEM', 'heap_used_mb', memUsage.heapUsed / 1024 / 1024);
  recordMetric('SYSTEM', 'heap_total_mb', memUsage.heapTotal / 1024 / 1024);
  recordMetric('SYSTEM', 'rss_mb', memUsage.rss / 1024 / 1024);
  recordMetric('SYSTEM', 'external_mb', memUsage.external / 1024 / 1024);

  // Event loop lag (approximate)
  const start = Date.now();
  setImmediate(() => {
    const lag = Date.now() - start;
    recordMetric('SYSTEM', 'event_loop_lag_ms', lag);
  });
}

// ============================================================================
// PERCENTILE CALCULATION
// ============================================================================

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// ============================================================================
// METRICS RETRIEVAL
// ============================================================================

/**
 * Get current metrics snapshot
 */
export function getMetricsSnapshot(): Map<
  string,
  {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  }
> {
  const snapshot = new Map<
    string,
    {
      count: number;
      sum: number;
      min: number;
      max: number;
      avg: number;
      p50: number;
      p95: number;
      p99: number;
    }
  >();

  for (const [key, bucket] of metricsStore.entries()) {
    snapshot.set(key, {
      count: bucket.count,
      sum: bucket.sum,
      min: bucket.min === Infinity ? 0 : bucket.min,
      max: bucket.max === -Infinity ? 0 : bucket.max,
      avg: bucket.count > 0 ? bucket.sum / bucket.count : 0,
      p50: calculatePercentile(bucket.values, 50),
      p95: calculatePercentile(bucket.values, 95),
      p99: calculatePercentile(bucket.values, 99),
    });
  }

  return snapshot;
}

/**
 * Get API latency stats
 */
export function getAPILatencyStats(): Array<{
  endpoint: string;
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
}> {
  const stats: Array<{
    endpoint: string;
    count: number;
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    minMs: number;
    maxMs: number;
  }> = [];

  for (const [key, bucket] of metricsStore.entries()) {
    if (key.startsWith('API_LATENCY:')) {
      const endpoint = key.replace('API_LATENCY:', '').split(':')[0];
      stats.push({
        endpoint,
        count: bucket.count,
        avgMs: bucket.count > 0 ? Math.round(bucket.sum / bucket.count) : 0,
        p50Ms: Math.round(calculatePercentile(bucket.values, 50)),
        p95Ms: Math.round(calculatePercentile(bucket.values, 95)),
        p99Ms: Math.round(calculatePercentile(bucket.values, 99)),
        minMs: bucket.min === Infinity ? 0 : Math.round(bucket.min),
        maxMs: bucket.max === -Infinity ? 0 : Math.round(bucket.max),
      });
    }
  }

  return stats.sort((a, b) => b.p95Ms - a.p95Ms);
}

/**
 * Get error rate by endpoint
 */
export function getErrorRates(): Array<{
  endpoint: string;
  totalRequests: number;
  errorCount: number;
  errorRate: number;
}> {
  const requestCounts = new Map<string, number>();
  const errorCounts = new Map<string, number>();

  for (const [key, bucket] of metricsStore.entries()) {
    if (key.startsWith('API_REQUEST:')) {
      const endpoint = key.replace('API_REQUEST:', '').split(':')[0];
      requestCounts.set(
        endpoint,
        (requestCounts.get(endpoint) || 0) + bucket.count,
      );
    }
    if (key.startsWith('API_ERROR:')) {
      const endpoint = key.replace('API_ERROR:', '').split(':')[0];
      errorCounts.set(
        endpoint,
        (errorCounts.get(endpoint) || 0) + bucket.count,
      );
    }
  }

  const rates: Array<{
    endpoint: string;
    totalRequests: number;
    errorCount: number;
    errorRate: number;
  }> = [];

  for (const [endpoint, total] of requestCounts.entries()) {
    const errors = errorCounts.get(endpoint) || 0;
    rates.push({
      endpoint,
      totalRequests: total,
      errorCount: errors,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
    });
  }

  return rates.sort((a, b) => b.errorRate - a.errorRate);
}

/**
 * Get system health summary
 */
export function getSystemHealth(): {
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    heapUsagePercent: number;
  };
  eventLoopLagMs: number;
  uptime: number;
} {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;

  // Get latest event loop lag from metrics
  const lagBucket = metricsStore.get('SYSTEM:event_loop_lag_ms');
  const avgLag =
    lagBucket && lagBucket.count > 0 ? lagBucket.sum / lagBucket.count : 0;

  return {
    memory: {
      heapUsedMB: Math.round(heapUsedMB * 100) / 100,
      heapTotalMB: Math.round(heapTotalMB * 100) / 100,
      rssMB: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
      heapUsagePercent: Math.round((heapUsedMB / heapTotalMB) * 100),
    },
    eventLoopLagMs: Math.round(avgLag),
    uptime: Math.round(process.uptime()),
  };
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Flush metrics to database and reset buckets
 */
export async function flushMetricsToDatabase(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(lastFlushTime);
  const windowEnd = now;

  const metricsToStore: Array<{
    metricType: string;
    metricName: string;
    count: number;
    sum: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    windowStart: Date;
    windowEnd: Date;
    windowSize: string;
    tenantId: string | null;
  }> = [];

  for (const [key, bucket] of metricsStore.entries()) {
    const parts = key.split(':');
    const metricType = parts[0];
    const metricName = parts[1];
    const tenantId = parts[2] || null;

    metricsToStore.push({
      metricType,
      metricName,
      count: bucket.count,
      sum: bucket.sum,
      min: bucket.min === Infinity ? null : bucket.min,
      max: bucket.max === -Infinity ? null : bucket.max,
      avg: bucket.count > 0 ? bucket.sum / bucket.count : null,
      p50: calculatePercentile(bucket.values, 50) || null,
      p95: calculatePercentile(bucket.values, 95) || null,
      p99: calculatePercentile(bucket.values, 99) || null,
      windowStart,
      windowEnd,
      windowSize: '1m',
      tenantId,
    });
  }

  if (metricsToStore.length > 0) {
    try {
      await prisma.infrastructureMetric.createMany({
        data: metricsToStore,
      });
      logger.debug('Flushed infrastructure metrics', {
        count: metricsToStore.length,
      });
    } catch (error) {
      logger.error('Failed to flush infrastructure metrics', { error });
    }
  }

  // Reset metrics store
  metricsStore.clear();
  lastFlushTime = Date.now();
}

/**
 * Log slow query to database
 */
export async function logSlowQuery(
  query: string,
  model: string,
  operation: string,
  durationMs: number,
  tenantId?: string,
  userId?: number,
): Promise<void> {
  try {
    await prisma.slowQueryLog.create({
      data: {
        query: query.substring(0, 5000), // Limit query length
        model,
        operation,
        durationMs,
        tenantId,
        userId,
      },
    });
  } catch (error) {
    logger.error('Failed to log slow query', { error });
  }
}

/**
 * Get slow queries from database
 */
export async function getSlowQueries(
  limit: number = 50,
  minDurationMs: number = 100,
): Promise<
  Array<{
    id: string;
    query: string;
    model: string;
    operation: string;
    durationMs: number;
    tenantId: string | null;
    createdAt: Date;
  }>
> {
  return prisma.slowQueryLog.findMany({
    where: {
      durationMs: { gte: minDurationMs },
    },
    orderBy: { durationMs: 'desc' },
    take: limit,
  });
}

// ============================================================================
// HISTORICAL DATA
// ============================================================================

/**
 * Get historical metrics from database
 */
export async function getHistoricalMetrics(
  metricType: string,
  metricName?: string,
  hours: number = 24,
  tenantId?: string,
): Promise<
  Array<{
    windowStart: Date;
    count: number;
    avg: number | null;
    p95: number | null;
  }>
> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const where: {
    metricType: string;
    metricName?: string;
    windowStart: { gte: Date };
    tenantId?: string | null;
  } = {
    metricType,
    windowStart: { gte: since },
  };

  if (metricName) where.metricName = metricName;
  if (tenantId) where.tenantId = tenantId;
  else where.tenantId = null; // System-wide metrics

  return prisma.infrastructureMetric.findMany({
    where,
    select: {
      windowStart: true,
      count: true,
      avg: true,
      p95: true,
    },
    orderBy: { windowStart: 'asc' },
  });
}

// ============================================================================
// SCHEDULER
// ============================================================================

let flushInterval: NodeJS.Timeout | null = null;
let systemMetricsInterval: NodeJS.Timeout | null = null;

/**
 * Start the metrics collection scheduler
 */
export function startMetricsScheduler(): void {
  // Collect system metrics every 10 seconds
  systemMetricsInterval = setInterval(recordSystemMetrics, 10 * 1000);

  // Flush to database every minute
  flushInterval = setInterval(flushMetricsToDatabase, WINDOW_SIZE_MS);

  logger.info('Infrastructure metrics scheduler started');
}

/**
 * Stop the metrics collection scheduler
 */
export function stopMetricsScheduler(): void {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
  if (systemMetricsInterval) {
    clearInterval(systemMetricsInterval);
    systemMetricsInterval = null;
  }

  // Final flush
  flushMetricsToDatabase().catch((err) => {
    logger.error('Failed to flush metrics on shutdown', { error: err });
  });

  logger.info('Infrastructure metrics scheduler stopped');
}
