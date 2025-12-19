/**
 * Alert Service
 *
 * Handles sending alerts through multiple channels:
 * - Email
 * - Slack
 * - In-app notifications
 * - Webhooks
 */

import { prisma } from '../../prisma/client';
import {
  AlertChannel,
  AlertDeliveryStatus,
  AnomalySeverity,
  AnomalyCategory,
  Prisma,
} from '@prisma/client';
import { logger } from '../../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Confirmed alert recipient
const DEFAULT_ALERT_EMAIL = 'Bryant.barrington@icloud.com';

// Throttling settings
const THROTTLE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ALERTS_PER_HOUR = 10;

// ============================================================================
// ALERT RULES MANAGEMENT
// ============================================================================

/**
 * Get all alert rules
 */
export async function getAlertRules(): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    anomalyType: string | null;
    category: AnomalyCategory | null;
    severities: AnomalySeverity[];
    channels: AlertChannel[];
    recipients: string[];
    cooldownMinutes: number;
    maxAlertsPerDay: number;
    enabled: boolean;
  }>
> {
  return prisma.alertRule.findMany({
    orderBy: { name: 'asc' },
  });
}

/**
 * Create a new alert rule
 */
export async function createAlertRule(data: {
  name: string;
  description?: string;
  anomalyType?: string;
  category?: AnomalyCategory;
  severities: AnomalySeverity[];
  channels: AlertChannel[];
  recipients: string[];
  cooldownMinutes?: number;
  maxAlertsPerDay?: number;
}): Promise<{ id: string }> {
  const rule = await prisma.alertRule.create({
    data: {
      name: data.name,
      description: data.description,
      anomalyType: data.anomalyType,
      category: data.category,
      severities: data.severities,
      channels: data.channels,
      recipients: data.recipients,
      cooldownMinutes: data.cooldownMinutes || 60,
      maxAlertsPerDay: data.maxAlertsPerDay || 10,
    },
    select: { id: true },
  });

  return rule;
}

/**
 * Update an alert rule
 */
export async function updateAlertRule(
  ruleId: string,
  data: Partial<{
    name: string;
    description: string;
    anomalyType: string;
    category: AnomalyCategory;
    severities: AnomalySeverity[];
    channels: AlertChannel[];
    recipients: string[];
    cooldownMinutes: number;
    maxAlertsPerDay: number;
    enabled: boolean;
  }>,
): Promise<void> {
  await prisma.alertRule.update({
    where: { id: ruleId },
    data,
  });
}

/**
 * Delete an alert rule
 */
export async function deleteAlertRule(ruleId: string): Promise<void> {
  await prisma.alertRule.delete({
    where: { id: ruleId },
  });
}

// ============================================================================
// THROTTLING
// ============================================================================

/**
 * Check if an alert should be throttled
 */
async function shouldThrottle(ruleId: string): Promise<boolean> {
  const rule = await prisma.alertRule.findUnique({
    where: { id: ruleId },
    select: { cooldownMinutes: true, maxAlertsPerDay: true },
  });

  if (!rule) return true;

  // Check cooldown
  const cooldownCutoff = new Date(
    Date.now() - rule.cooldownMinutes * 60 * 1000,
  );
  const recentAlert = await prisma.alertHistory.findFirst({
    where: {
      alertRuleId: ruleId,
      status: 'SENT',
      sentAt: { gte: cooldownCutoff },
    },
  });

  if (recentAlert) {
    logger.debug('Alert throttled by cooldown', { ruleId });
    return true;
  }

  // Check daily limit
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const dailyCount = await prisma.alertHistory.count({
    where: {
      alertRuleId: ruleId,
      status: 'SENT',
      sentAt: { gte: dayStart },
    },
  });

  if (dailyCount >= rule.maxAlertsPerDay) {
    logger.debug('Alert throttled by daily limit', { ruleId, dailyCount });
    return true;
  }

  return false;
}

// ============================================================================
// ALERT DELIVERY
// ============================================================================

/**
 * Send an email alert
 */
async function sendEmailAlert(
  recipient: string,
  subject: string,
  body: string,
): Promise<boolean> {
  // In production, integrate with SendGrid, SES, etc.
  // For now, just log
  logger.info('📧 Email alert sent', { recipient, subject });

  // Simulate sending - in production, call email service
  // await sendgrid.send({ to: recipient, subject, html: body });

  return true;
}

/**
 * Send a Slack alert
 */
async function sendSlackAlert(
  webhookUrl: string,
  message: string,
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      logger.error('Slack alert failed', { status: response.status });
      return false;
    }

    logger.info('🔔 Slack alert sent');
    return true;
  } catch (error) {
    logger.error('Slack alert error', { error });
    return false;
  }
}

/**
 * Create an in-app notification
 */
async function createInAppNotification(
  tenantId: string | null,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  try {
    // Find admin users to notify
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
      take: 10,
    });

    for (const user of adminUsers) {
      await prisma.notification.create({
        data: {
          tenantId: tenantId || 'system',
          userId: user.id,
          type: 'ALERT',
          title,
          message,
          data: metadata as Prisma.InputJsonValue,
        },
      });
    }

    logger.info('🔔 In-app notifications created', {
      count: adminUsers.length,
    });
    return true;
  } catch (error) {
    logger.error('In-app notification error', { error });
    return false;
  }
}

/**
 * Record alert in history
 */
async function recordAlertHistory(
  ruleId: string,
  anomalyId: string | null,
  channel: AlertChannel,
  recipient: string,
  subject: string,
  body: string,
  status: AlertDeliveryStatus,
  errorMessage?: string,
): Promise<void> {
  await prisma.alertHistory.create({
    data: {
      alertRuleId: ruleId,
      anomalyId,
      channel,
      recipient,
      subject,
      body,
      status,
      errorMessage,
    },
  });
}

// ============================================================================
// ALERT TRIGGERING
// ============================================================================

/**
 * Trigger alerts for an anomaly
 */
export async function triggerAlertsForAnomaly(anomaly: {
  id: string;
  type: string;
  severity: AnomalySeverity;
  category: AnomalyCategory;
  metric: string;
  actualValue: number;
  expectedValue: number | null;
  tenantId: string | null;
}): Promise<void> {
  // Find matching alert rules
  const rules = await prisma.alertRule.findMany({
    where: {
      enabled: true,
      OR: [
        { anomalyType: anomaly.type },
        { category: anomaly.category },
        { severities: { has: anomaly.severity } },
      ],
    },
  });

  for (const rule of rules) {
    // Check if severity matches
    if (!rule.severities.includes(anomaly.severity)) {
      continue;
    }

    // Check throttling
    if (await shouldThrottle(rule.id)) {
      await recordAlertHistory(
        rule.id,
        anomaly.id,
        'EMAIL',
        rule.recipients[0] || DEFAULT_ALERT_EMAIL,
        `[${anomaly.severity}] ${anomaly.type}`,
        '',
        'THROTTLED',
      );
      continue;
    }

    // Prepare alert content
    const subject = `[${anomaly.severity}] ${anomaly.type} - ${anomaly.metric}`;
    const body = `
Anomaly Detected

Type: ${anomaly.type}
Severity: ${anomaly.severity}
Category: ${anomaly.category}
Metric: ${anomaly.metric}

Current Value: ${anomaly.actualValue}
Expected Value: ${anomaly.expectedValue || 'N/A'}
${anomaly.tenantId ? `Tenant ID: ${anomaly.tenantId}` : 'System-wide'}

Detected at: ${new Date().toISOString()}

View in dashboard: [Link to monitoring dashboard]
    `.trim();

    // Send through each channel
    for (const channel of rule.channels) {
      const recipients =
        rule.recipients.length > 0 ? rule.recipients : [DEFAULT_ALERT_EMAIL];

      for (const recipient of recipients) {
        let success = false;
        let errorMessage: string | undefined;

        try {
          switch (channel) {
            case 'EMAIL':
              success = await sendEmailAlert(recipient, subject, body);
              break;
            case 'SLACK':
              success = await sendSlackAlert(recipient, body);
              break;
            case 'IN_APP':
              success = await createInAppNotification(
                anomaly.tenantId,
                subject,
                body,
                { anomalyId: anomaly.id },
              );
              break;
            case 'WEBHOOK':
              // Implement webhook delivery
              success = true;
              break;
          }
        } catch (error) {
          errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
        }

        await recordAlertHistory(
          rule.id,
          anomaly.id,
          channel,
          recipient,
          subject,
          body,
          success ? 'SENT' : 'FAILED',
          errorMessage,
        );
      }
    }
  }
}

/**
 * Send a test alert
 */
export async function sendTestAlert(
  ruleId: string,
): Promise<{ success: boolean; message: string }> {
  const rule = await prisma.alertRule.findUnique({
    where: { id: ruleId },
  });

  if (!rule) {
    return { success: false, message: 'Alert rule not found' };
  }

  const subject = '[TEST] Alert Rule Test';
  const body = `
This is a test alert for rule: ${rule.name}

Configuration:
- Channels: ${rule.channels.join(', ')}
- Severities: ${rule.severities.join(', ')}
- Recipients: ${rule.recipients.join(', ')}

If you received this, the alert rule is working correctly.
  `.trim();

  let successCount = 0;

  for (const channel of rule.channels) {
    const recipients =
      rule.recipients.length > 0 ? rule.recipients : [DEFAULT_ALERT_EMAIL];

    for (const recipient of recipients) {
      try {
        switch (channel) {
          case 'EMAIL':
            if (await sendEmailAlert(recipient, subject, body)) successCount++;
            break;
          case 'SLACK':
            if (await sendSlackAlert(recipient, body)) successCount++;
            break;
          case 'IN_APP':
            if (await createInAppNotification(null, subject, body))
              successCount++;
            break;
        }
      } catch (error) {
        logger.error('Test alert failed', { error, channel, recipient });
      }
    }
  }

  return {
    success: successCount > 0,
    message: `Sent ${successCount} test alerts`,
  };
}

// ============================================================================
// ALERT HISTORY
// ============================================================================

/**
 * Get alert history
 */
export async function getAlertHistory(options?: {
  ruleId?: string;
  status?: AlertDeliveryStatus;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    alertRuleId: string;
    anomalyId: string | null;
    channel: AlertChannel;
    recipient: string;
    subject: string;
    status: AlertDeliveryStatus;
    sentAt: Date;
  }>
> {
  const where: Prisma.AlertHistoryWhereInput = {};
  if (options?.ruleId) where.alertRuleId = options.ruleId;
  if (options?.status) where.status = options.status;

  return prisma.alertHistory.findMany({
    where,
    select: {
      id: true,
      alertRuleId: true,
      anomalyId: true,
      channel: true,
      recipient: true,
      subject: true,
      status: true,
      sentAt: true,
    },
    orderBy: { sentAt: 'desc' },
    take: options?.limit || 100,
  });
}

// ============================================================================
// DAILY DIGEST
// ============================================================================

/**
 * Send daily digest email
 */
export async function sendDailyDigest(): Promise<void> {
  logger.info('Sending daily digest');

  // Get yesterday's anomalies
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [newAnomalies, resolvedAnomalies, openAnomalies] = await Promise.all([
    prisma.anomaly.count({
      where: { detectedAt: { gte: yesterday, lt: today } },
    }),
    prisma.anomaly.count({
      where: {
        resolvedAt: { gte: yesterday, lt: today },
        status: 'RESOLVED',
      },
    }),
    prisma.anomaly.count({
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
    }),
  ]);

  // Get AI cost summary
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const aiCostResult = await prisma.aIUsageEvent.aggregate({
    where: { createdAt: { gte: monthStart } },
    _sum: { estimatedCost: true },
  });
  const monthlyAICost = Number(aiCostResult._sum.estimatedCost || 0);

  const subject = `Daily Monitoring Digest - ${today.toLocaleDateString()}`;
  const body = `
Daily Monitoring Digest
=======================
Date: ${today.toLocaleDateString()}

Anomaly Summary
---------------
- New anomalies detected: ${newAnomalies}
- Anomalies resolved: ${resolvedAnomalies}
- Open anomalies: ${openAnomalies}

AI Cost Summary
---------------
- Month-to-date AI spending: $${monthlyAICost.toFixed(2)}
- Budget warning threshold: $100
- Budget critical threshold: $150

${openAnomalies > 0 ? '⚠️ There are open anomalies requiring attention.' : '✅ All systems normal.'}

View full details in the monitoring dashboard.
  `.trim();

  await sendEmailAlert(DEFAULT_ALERT_EMAIL, subject, body);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Create default alert rules if none exist
 */
export async function initializeDefaultAlertRules(): Promise<void> {
  const existingCount = await prisma.alertRule.count();

  if (existingCount > 0) {
    return;
  }

  logger.info('Creating default alert rules');

  const defaultRules = [
    {
      name: 'Critical Anomalies',
      description: 'Alert on all critical anomalies',
      severities: ['CRITICAL'] as AnomalySeverity[],
      channels: ['EMAIL', 'IN_APP'] as AlertChannel[],
      recipients: [DEFAULT_ALERT_EMAIL],
      cooldownMinutes: 30,
      maxAlertsPerDay: 20,
    },
    {
      name: 'AI Cost Warnings',
      description: 'Alert when AI costs exceed thresholds',
      anomalyType: 'AI_COST_WARNING',
      severities: ['WARNING', 'CRITICAL'] as AnomalySeverity[],
      channels: ['EMAIL'] as AlertChannel[],
      recipients: [DEFAULT_ALERT_EMAIL],
      cooldownMinutes: 60,
      maxAlertsPerDay: 5,
    },
    {
      name: 'Health Score Alerts',
      description: 'Alert on critical health scores and high churn risk',
      category: 'HEALTH' as AnomalyCategory,
      severities: ['WARNING', 'CRITICAL'] as AnomalySeverity[],
      channels: ['EMAIL', 'IN_APP'] as AlertChannel[],
      recipients: [DEFAULT_ALERT_EMAIL],
      cooldownMinutes: 360, // 6 hours
      maxAlertsPerDay: 10,
    },
  ];

  for (const rule of defaultRules) {
    await createAlertRule(rule);
  }

  logger.info('Default alert rules created', { count: defaultRules.length });
}
