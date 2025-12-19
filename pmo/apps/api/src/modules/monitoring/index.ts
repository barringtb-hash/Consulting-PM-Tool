/**
 * Infrastructure Monitoring Module
 *
 * Provides comprehensive infrastructure and application monitoring:
 * - API latency and throughput metrics
 * - Database query performance
 * - System health (memory, CPU, event loop)
 * - Anomaly detection
 * - Multi-channel alerting
 */

// Metrics Service
export {
  recordMetric,
  recordAPIMetrics,
  recordDBMetrics,
  recordSystemMetrics,
  getMetricsSnapshot,
  getAPILatencyStats,
  getErrorRates,
  getSystemHealth,
  flushMetricsToDatabase,
  logSlowQuery,
  getSlowQueries,
  getHistoricalMetrics,
  startMetricsScheduler,
  stopMetricsScheduler,
} from './metrics.service';

// Metrics Middleware
export { apiMetricsMiddleware } from './metrics.middleware';

// Anomaly Detection
export {
  ANOMALY_RULES,
  runCostAnomalyDetection,
  runHealthAnomalyDetection,
  runInfrastructureAnomalyDetection,
  runAllAnomalyDetection,
  getOpenAnomalies,
  acknowledgeAnomaly,
  resolveAnomaly,
  markFalsePositive,
  getAnomalyStats,
} from './anomaly-detection.service';

// Alert Service
export {
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  triggerAlertsForAnomaly,
  sendTestAlert,
  getAlertHistory,
  sendDailyDigest,
  initializeDefaultAlertRules,
} from './alert.service';

// Router
export { default as monitoringRouter } from './monitoring.routes';
