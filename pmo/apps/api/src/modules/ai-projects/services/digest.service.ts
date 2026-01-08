/**
 * Stakeholder Digest Service
 *
 * Generates and sends AI-powered project digest emails to stakeholders
 * with personalized content based on their role and preferences.
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';
import { aiStatusService } from './ai-status.service';

export interface DigestConfig {
  id?: number;
  projectId: number;
  recipientEmail: string;
  recipientName: string;
  recipientRole: 'EXECUTIVE' | 'MANAGER' | 'TEAM_LEAD' | 'STAKEHOLDER';
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  preferredDay?: number; // 0-6 for Sunday-Saturday
  preferredTime?: string; // HH:MM format
  includeMetrics: boolean;
  includeRisks: boolean;
  includeActionItems: boolean;
  customSections?: string[];
  enabled: boolean;
}

export interface DigestContent {
  subject: string;
  summary: string;
  sections: DigestSection[];
  callToAction?: {
    text: string;
    url: string;
  };
  generatedAt: Date;
}

export interface DigestSection {
  title: string;
  content: string;
  items?: DigestItem[];
  highlight?: boolean;
}

export interface DigestItem {
  label: string;
  value: string;
  status?: 'positive' | 'neutral' | 'negative';
  change?: string;
}

class DigestService {
  /**
   * Create or update a digest configuration
   */
  async configureDigest(
    config: DigestConfig,
    tenantId: string,
  ): Promise<DigestConfig> {
    // Map DigestConfig to Prisma schema fields
    const includeSections: string[] = [];
    if (config.includeMetrics) includeSections.push('metrics');
    if (config.includeRisks) includeSections.push('risks');
    if (config.includeActionItems) includeSections.push('tasks');
    if (config.customSections) includeSections.push(...config.customSections);

    const recipientTypeMap: Record<
      string,
      'OWNER' | 'TEAM' | 'STAKEHOLDER' | 'CUSTOM'
    > = {
      EXECUTIVE: 'STAKEHOLDER',
      MANAGER: 'OWNER',
      TEAM_LEAD: 'TEAM',
      STAKEHOLDER: 'STAKEHOLDER',
    };

    const recipientType =
      recipientTypeMap[config.recipientRole] || 'STAKEHOLDER';

    if (config.id) {
      // Update - only send fields that can be updated
      const updated = await prisma.projectDigestConfig.update({
        where: { id: config.id },
        data: {
          recipientType,
          customEmails: config.recipientEmail ? [config.recipientEmail] : [],
          frequency: config.frequency,
          dayOfWeek: config.preferredDay ?? null,
          timeOfDay: config.preferredTime ?? null,
          includeSections,
          isActive: config.enabled,
        },
      });
      return { ...config, id: updated.id };
    }

    // Create - include all required fields
    const created = await prisma.projectDigestConfig.create({
      data: {
        projectId: config.projectId,
        tenantId,
        recipientType,
        customEmails: config.recipientEmail ? [config.recipientEmail] : [],
        frequency: config.frequency,
        dayOfWeek: config.preferredDay ?? null,
        timeOfDay: config.preferredTime ?? null,
        includeSections,
        isActive: config.enabled,
        timezone: 'UTC',
        detailLevel: 'STANDARD',
      },
    });
    return { ...config, id: created.id };
  }

  /**
   * Get digest configurations for a project
   */
  async getDigestConfigs(
    projectId: number,
    tenantId: string,
  ): Promise<DigestConfig[]> {
    const configs = await prisma.projectDigestConfig.findMany({
      where: { projectId, tenantId },
    });

    return configs.map((c) => {
      const includeSections = c.includeSections || [];
      return {
        id: c.id,
        projectId: c.projectId,
        recipientEmail: c.customEmails[0] || '',
        recipientName: 'Recipient',
        recipientRole: this.mapRecipientType(c.recipientType),
        frequency: c.frequency as DigestConfig['frequency'],
        preferredDay: c.dayOfWeek ?? undefined,
        preferredTime: c.timeOfDay ?? undefined,
        includeMetrics: includeSections.includes('metrics'),
        includeRisks: includeSections.includes('risks'),
        includeActionItems: includeSections.includes('tasks'),
        customSections: includeSections,
        enabled: c.isActive,
      };
    });
  }

  /**
   * Generate digest content for a project/recipient
   */
  async generateDigest(
    projectId: number,
    tenantId: string,
    config: DigestConfig,
  ): Promise<DigestContent> {
    // Get project data
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        owner: { select: { name: true } },
        account: { select: { name: true } },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Get status summary
    const statusSummary = await aiStatusService.generateStatusSummary(
      projectId,
      tenantId,
    );

    // Get recent activity
    const recentTasks = await this.getRecentCompletedTasks(
      projectId,
      tenantId,
      7,
    );
    const upcomingTasks = await this.getUpcomingTasks(projectId, tenantId, 7);
    const overdueItems = await this.getOverdueItems(projectId, tenantId);

    // Build sections based on config and role
    const sections: DigestSection[] = [];

    // Executive summary (always included)
    sections.push({
      title: 'Executive Summary',
      content: await this.generateExecutiveSummary(
        project,
        statusSummary,
        config.recipientRole,
      ),
      highlight: true,
    });

    // Metrics section
    if (config.includeMetrics) {
      sections.push(
        this.buildMetricsSection(statusSummary.metrics, config.recipientRole),
      );
    }

    // Progress section
    sections.push({
      title: 'Recent Progress',
      content:
        recentTasks.length > 0
          ? `${recentTasks.length} tasks completed in the past week:`
          : 'No tasks completed in the past week.',
      items: recentTasks.map((t) => ({
        label: t.title,
        value: t.status,
        status: 'positive' as const,
      })),
    });

    // Upcoming section
    sections.push({
      title: 'Coming Up',
      content:
        upcomingTasks.length > 0
          ? `${upcomingTasks.length} tasks due in the next week:`
          : 'No tasks due in the next week.',
      items: upcomingTasks.map((t) => ({
        label: t.title,
        value: t.dueDate
          ? new Date(t.dueDate).toLocaleDateString()
          : 'No due date',
        status: 'neutral' as const,
      })),
    });

    // Attention needed section
    if (overdueItems.length > 0) {
      sections.push({
        title: 'Attention Needed',
        content: `${overdueItems.length} items require attention:`,
        items: overdueItems.map((item) => ({
          label: item.title,
          value: item.type,
          status: 'negative' as const,
        })),
        highlight: true,
      });
    }

    // Risks section
    if (config.includeRisks && statusSummary.concerns.length > 0) {
      sections.push({
        title: 'Risks & Concerns',
        content: `${statusSummary.concerns.length} items flagged:`,
        items: statusSummary.concerns.slice(0, 5).map((c) => ({
          label: c.title,
          value: c.severity,
          status:
            c.severity === 'critical' || c.severity === 'high'
              ? 'negative'
              : 'neutral',
        })),
      });
    }

    // Recommendations section (for managers and executives)
    if (
      statusSummary.recommendations.length > 0 &&
      ['EXECUTIVE', 'MANAGER'].includes(config.recipientRole)
    ) {
      sections.push({
        title: 'Recommendations',
        content: 'AI-generated recommendations:',
        items: statusSummary.recommendations.slice(0, 3).map((r) => ({
          label: r.title,
          value: r.priority,
          status: 'neutral' as const,
        })),
      });
    }

    // Generate subject line
    const subject = this.generateSubject(project.name, statusSummary);

    return {
      subject,
      summary: statusSummary.executiveSummary,
      sections,
      callToAction: {
        text: 'View Full Project',
        url: `/projects/${projectId}`,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Get all digests due to be sent
   */
  async getDueDigests(tenantId?: string): Promise<DigestConfig[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const whereClause: Record<string, unknown> = {
      isActive: true,
    };

    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const configs = await prisma.projectDigestConfig.findMany({
      where: whereClause,
      include: {
        project: { select: { status: true } },
      },
    });

    // Filter to only active projects and matching schedule
    return configs
      .filter((c) => {
        // Skip completed projects
        if (
          c.project.status === 'COMPLETED' ||
          c.project.status === 'CANCELLED'
        ) {
          return false;
        }

        // Check frequency and timing
        switch (c.frequency) {
          case 'DAILY':
            return this.isTimeMatch(c.timeOfDay, currentTime);
          case 'WEEKLY':
            return (
              (c.dayOfWeek === dayOfWeek || c.dayOfWeek === null) &&
              this.isTimeMatch(c.timeOfDay, currentTime)
            );
          case 'BIWEEKLY':
            // Check if it's been 2 weeks since last send
            return this.isBiweeklyDue(c.lastSentAt, dayOfWeek, c.dayOfWeek);
          case 'MONTHLY':
            // Check if it's the first occurrence of preferred day this month
            return this.isMonthlyDue(c.lastSentAt, dayOfWeek, c.dayOfWeek);
          default:
            return false;
        }
      })
      .map((c) => {
        // Map schema fields to DigestConfig interface
        const includeSections = c.includeSections || [];
        return {
          id: c.id,
          projectId: c.projectId,
          recipientEmail: c.customEmails[0] || '', // Use first custom email
          recipientName: 'Recipient', // Not stored in schema
          recipientRole: this.mapRecipientType(c.recipientType),
          frequency: c.frequency as DigestConfig['frequency'],
          preferredDay: c.dayOfWeek || undefined,
          preferredTime: c.timeOfDay || undefined,
          includeMetrics: includeSections.includes('metrics'),
          includeRisks: includeSections.includes('risks'),
          includeActionItems: includeSections.includes('tasks'),
          customSections: includeSections,
          enabled: c.isActive,
        };
      });
  }

  private mapRecipientType(
    type: string,
  ): 'EXECUTIVE' | 'MANAGER' | 'TEAM_LEAD' | 'STAKEHOLDER' {
    const typeMap: Record<
      string,
      'EXECUTIVE' | 'MANAGER' | 'TEAM_LEAD' | 'STAKEHOLDER'
    > = {
      OWNER: 'MANAGER',
      TEAM: 'TEAM_LEAD',
      STAKEHOLDER: 'STAKEHOLDER',
      CUSTOM: 'STAKEHOLDER',
    };
    return typeMap[type] || 'STAKEHOLDER';
  }

  /**
   * Mark a digest as sent
   */
  async markDigestSent(configId: number): Promise<void> {
    await prisma.projectDigestConfig.update({
      where: { id: configId },
      data: { lastSentAt: new Date() },
    });
  }

  // Private helper methods

  private async getRecentCompletedTasks(
    projectId: number,
    tenantId: string,
    days: number,
  ): Promise<{ title: string; status: string }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return prisma.task.findMany({
      where: {
        projectId,
        tenantId,
        status: 'DONE',
        updatedAt: { gte: since },
      },
      select: { title: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
  }

  private async getUpcomingTasks(
    projectId: number,
    tenantId: string,
    days: number,
  ): Promise<{ title: string; dueDate: Date | null }[]> {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    return prisma.task.findMany({
      where: {
        projectId,
        tenantId,
        status: { notIn: ['DONE'] },
        dueDate: { lte: until, gte: new Date() },
      },
      select: { title: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });
  }

  private async getOverdueItems(
    projectId: number,
    tenantId: string,
  ): Promise<{ title: string; type: string }[]> {
    const now = new Date();

    const [overdueTasks, overdueMilestones] = await Promise.all([
      prisma.task.findMany({
        where: {
          projectId,
          tenantId,
          status: { notIn: ['DONE'] },
          dueDate: { lt: now },
        },
        select: { title: true },
        take: 5,
      }),
      prisma.milestone.findMany({
        where: {
          projectId,
          tenantId,
          status: { notIn: ['DONE'] },
          dueDate: { lt: now },
        },
        select: { name: true },
        take: 5,
      }),
    ]);

    return [
      ...overdueTasks.map((t) => ({ title: t.title, type: 'Task' })),
      ...overdueMilestones.map((m) => ({ title: m.name, type: 'Milestone' })),
    ];
  }

  private async generateExecutiveSummary(
    project: { name: string; healthStatus: string },
    statusSummary: {
      executiveSummary: string;
      healthAnalysis: { healthScore: number };
    },
    recipientRole: string,
  ): Promise<string> {
    // For executives, make it more concise
    if (recipientRole === 'EXECUTIVE') {
      try {
        const response = await llmService.complete(
          `Summarize this project status in 2 sentences for an executive:

Project: ${project.name}
Health: ${project.healthStatus} (Score: ${statusSummary.healthAnalysis.healthScore}/100)
Current Summary: ${statusSummary.executiveSummary}

Focus on: business impact, key numbers, and any critical issues. No technical jargon.`,
          { maxTokens: 100, temperature: 0.3 },
        );
        return response.content;
      } catch {
        // Fall back to default summary
      }
    }

    return statusSummary.executiveSummary;
  }

  private buildMetricsSection(
    metrics: {
      taskCompletion: { completed: number; total: number; percentage: number };
      milestoneProgress: {
        completed: number;
        total: number;
        percentage: number;
      };
      overdueItems: { tasks: number; milestones: number };
      velocity: { trend: string };
    },
    _recipientRole: string,
  ): DigestSection {
    const items: DigestItem[] = [];

    items.push({
      label: 'Task Progress',
      value: `${metrics.taskCompletion.completed}/${metrics.taskCompletion.total} (${metrics.taskCompletion.percentage}%)`,
      status:
        metrics.taskCompletion.percentage >= 70
          ? 'positive'
          : metrics.taskCompletion.percentage >= 40
            ? 'neutral'
            : 'negative',
    });

    items.push({
      label: 'Milestones',
      value: `${metrics.milestoneProgress.completed}/${metrics.milestoneProgress.total} completed`,
      status:
        metrics.milestoneProgress.percentage >= 70
          ? 'positive'
          : metrics.milestoneProgress.percentage >= 40
            ? 'neutral'
            : 'negative',
    });

    if (metrics.overdueItems.tasks > 0 || metrics.overdueItems.milestones > 0) {
      items.push({
        label: 'Overdue Items',
        value: `${metrics.overdueItems.tasks} tasks, ${metrics.overdueItems.milestones} milestones`,
        status: 'negative',
      });
    }

    items.push({
      label: 'Velocity Trend',
      value: metrics.velocity.trend,
      status:
        metrics.velocity.trend === 'improving'
          ? 'positive'
          : metrics.velocity.trend === 'declining'
            ? 'negative'
            : 'neutral',
    });

    return {
      title: 'Key Metrics',
      content: 'Project performance summary:',
      items,
    };
  }

  private generateSubject(
    projectName: string,
    statusSummary: { healthAnalysis: { overallHealth: string } },
  ): string {
    const healthEmoji =
      {
        ON_TRACK: '🟢',
        AT_RISK: '🟡',
        OFF_TRACK: '🔴',
      }[statusSummary.healthAnalysis.overallHealth] || '⚪';

    return `${healthEmoji} ${projectName} - Weekly Status Digest`;
  }

  private isTimeMatch(
    preferredTime: string | null,
    currentTime: string,
  ): boolean {
    if (!preferredTime) return true;

    // Allow 30-minute window around preferred time
    const [prefHour, prefMin] = preferredTime.split(':').map(Number);
    const [currHour, currMin] = currentTime.split(':').map(Number);

    const prefMinutes = prefHour * 60 + prefMin;
    const currMinutes = currHour * 60 + currMin;

    return Math.abs(prefMinutes - currMinutes) <= 30;
  }

  private isBiweeklyDue(
    lastSentAt: Date | null,
    currentDay: number,
    preferredDay?: number | null,
  ): boolean {
    if (!lastSentAt) return preferredDay === currentDay || !preferredDay;

    const daysSinceLastSent = Math.floor(
      (Date.now() - lastSentAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return (
      daysSinceLastSent >= 14 && (preferredDay === currentDay || !preferredDay)
    );
  }

  private isMonthlyDue(
    lastSentAt: Date | null,
    currentDay: number,
    preferredDay?: number | null,
  ): boolean {
    if (!lastSentAt) return preferredDay === currentDay || !preferredDay;

    const now = new Date();
    const lastSentMonth = lastSentAt.getMonth();
    const currentMonth = now.getMonth();

    return (
      lastSentMonth !== currentMonth &&
      (preferredDay === currentDay || !preferredDay)
    );
  }
}

export const digestService = new DigestService();
