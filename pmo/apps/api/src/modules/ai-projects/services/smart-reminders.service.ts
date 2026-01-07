/**
 * Smart Reminders Service
 *
 * Generates intelligent, context-aware reminders for project team members
 * based on task urgency, patterns, and personalized learning.
 */

import { prisma } from '../../../prisma/client';

export interface SmartReminder {
  id?: number;
  userId: number;
  projectId: number;
  taskId?: number;
  milestoneId?: number;
  type:
    | 'DEADLINE'
    | 'STALE_TASK'
    | 'BLOCKED_CHAIN'
    | 'MILESTONE_APPROACHING'
    | 'SCOPE_CREEP'
    | 'HEALTH_DECLINE';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  actionUrl?: string;
  scheduledFor: Date;
  delivered: boolean;
  dismissed: boolean;
  actionTaken: boolean;
}

export interface ReminderPreferences {
  userId: number;
  enableDeadlineReminders: boolean;
  deadlineLeadDays: number;
  enableStaleTaskReminders: boolean;
  staleTaskDays: number;
  enableMilestoneReminders: boolean;
  milestoneLeadDays: number;
  quietHoursStart?: string; // HH:MM
  quietHoursEnd?: string;
  preferredChannels: ('EMAIL' | 'IN_APP' | 'SLACK')[];
}

class SmartRemindersService {
  private readonly DEFAULT_DEADLINE_LEAD_DAYS = 2;
  private readonly DEFAULT_STALE_TASK_DAYS = 5;
  private readonly DEFAULT_MILESTONE_LEAD_DAYS = 7;

  /**
   * Generate reminders for a user across all their projects
   */
  async generateRemindersForUser(
    userId: number,
    tenantId: string,
  ): Promise<SmartReminder[]> {
    const reminders: SmartReminder[] = [];

    // Get user's projects
    const projects = await this.getUserProjects(userId, tenantId);

    for (const project of projects) {
      // Deadline reminders
      const deadlineReminders = await this.generateDeadlineReminders(
        userId,
        project.id,
        tenantId,
      );
      reminders.push(...deadlineReminders);

      // Stale task reminders
      const staleReminders = await this.generateStaleTaskReminders(
        userId,
        project.id,
        tenantId,
      );
      reminders.push(...staleReminders);

      // Blocked chain reminders
      const blockedReminders = await this.generateBlockedChainReminders(
        userId,
        project.id,
        tenantId,
      );
      reminders.push(...blockedReminders);

      // Milestone reminders (for project owners/leads)
      if (project.ownerId === userId) {
        const milestoneReminders = await this.generateMilestoneReminders(
          userId,
          project.id,
          tenantId,
        );
        reminders.push(...milestoneReminders);

        // Health decline reminders
        const healthReminders = await this.generateHealthDeclineReminders(
          userId,
          project.id,
          tenantId,
        );
        reminders.push(...healthReminders);
      }
    }

    // Store new reminders
    for (const reminder of reminders) {
      if (!reminder.id) {
        await this.storeReminder(reminder, tenantId);
      }
    }

    return reminders;
  }

  /**
   * Get pending reminders for a user
   */
  async getPendingReminders(
    userId: number,
    tenantId: string,
    limit: number = 20,
  ): Promise<SmartReminder[]> {
    const reminders = await prisma.smartReminder.findMany({
      where: {
        tenantId,
        userId,
        dismissed: false,
        scheduledFor: { lte: new Date() },
      },
      orderBy: [{ priority: 'asc' }, { scheduledFor: 'asc' }],
      take: limit,
    });

    return reminders.map(this.mapReminderFromDb);
  }

  /**
   * Dismiss a reminder
   */
  async dismissReminder(
    reminderId: number,
    _userId: number,
    _tenantId: string,
  ): Promise<void> {
    await prisma.smartReminder.update({
      where: { id: reminderId },
      data: { dismissed: true, dismissedAt: new Date() },
    });
  }

  /**
   * Mark a reminder as acted upon
   */
  async markActionTaken(reminderId: number, _tenantId: string): Promise<void> {
    await prisma.smartReminder.update({
      where: { id: reminderId },
      data: { actionTaken: true, actionTakenAt: new Date() },
    });
  }

  /**
   * Snooze a reminder
   */
  async snoozeReminder(
    reminderId: number,
    tenantId: string,
    snoozeUntil: Date,
  ): Promise<void> {
    await prisma.smartReminder.update({
      where: { id: reminderId },
      data: { scheduledFor: snoozeUntil, snoozedAt: new Date() },
    });
  }

  /**
   * Get reminder statistics for a user
   */
  async getReminderStats(
    userId: number,
    tenantId: string,
    days: number = 30,
  ): Promise<{
    total: number;
    dismissed: number;
    actedUpon: number;
    byType: Record<string, number>;
    averageResponseTime: number | null;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const reminders = await prisma.smartReminder.findMany({
      where: {
        tenantId,
        userId,
        scheduledFor: { gte: since },
      },
    });

    const byType: Record<string, number> = {};
    let dismissed = 0;
    let actedUpon = 0;
    let totalResponseTime = 0;
    let responsesCount = 0;

    for (const r of reminders) {
      byType[r.type] = (byType[r.type] || 0) + 1;

      if (r.dismissed) dismissed++;
      if (r.actionTaken) {
        actedUpon++;
        if (r.actionTakenAt) {
          totalResponseTime +=
            r.actionTakenAt.getTime() - r.scheduledFor.getTime();
          responsesCount++;
        }
      }
    }

    return {
      total: reminders.length,
      dismissed,
      actedUpon,
      byType,
      averageResponseTime:
        responsesCount > 0
          ? Math.round(totalResponseTime / responsesCount / (1000 * 60 * 60)) // hours
          : null,
    };
  }

  // Private helper methods

  private async getUserProjects(
    userId: number,
    tenantId: string,
  ): Promise<Array<{ id: number; ownerId: number }>> {
    const [ownedProjects, memberProjects] = await Promise.all([
      prisma.project.findMany({
        where: {
          tenantId,
          ownerId: userId,
          status: { in: ['PLANNING', 'IN_PROGRESS'] },
        },
        select: { id: true, ownerId: true },
      }),
      prisma.projectMember.findMany({
        where: {
          userId,
          project: {
            tenantId,
            status: { in: ['PLANNING', 'IN_PROGRESS'] },
          },
        },
        select: {
          project: { select: { id: true, ownerId: true } },
        },
      }),
    ]);

    const projectMap = new Map<number, { id: number; ownerId: number }>();

    for (const p of ownedProjects) {
      projectMap.set(p.id, p);
    }

    for (const m of memberProjects) {
      projectMap.set(m.project.id, m.project);
    }

    return Array.from(projectMap.values());
  }

  private async generateDeadlineReminders(
    userId: number,
    projectId: number,
    tenantId: string,
  ): Promise<SmartReminder[]> {
    const reminders: SmartReminder[] = [];
    const leadDays = this.DEFAULT_DEADLINE_LEAD_DAYS;
    const now = new Date();
    const threshold = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000);

    // Find tasks with upcoming deadlines assigned to this user
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        tenantId,
        assigneeId: userId,
        status: { notIn: ['DONE'] },
        dueDate: { lte: threshold, gte: now },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
      },
    });

    for (const task of tasks) {
      // Check if reminder already exists
      const existing = await prisma.smartReminder.findFirst({
        where: {
          tenantId,
          taskId: task.id,
          type: 'DEADLINE',
          dismissed: false,
        },
      });

      if (!existing) {
        const daysUntilDue = Math.ceil(
          (task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        reminders.push({
          userId,
          projectId,
          taskId: task.id,
          type: 'DEADLINE',
          priority:
            daysUntilDue <= 1
              ? 'URGENT'
              : task.priority === 'P1'
                ? 'HIGH'
                : 'MEDIUM',
          title: `Task deadline approaching`,
          message: `"${task.title}" is due ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}`,
          actionUrl: `/projects/${projectId}?task=${task.id}`,
          scheduledFor: now,
          delivered: false,
          dismissed: false,
          actionTaken: false,
        });
      }
    }

    return reminders;
  }

  private async generateStaleTaskReminders(
    userId: number,
    projectId: number,
    tenantId: string,
  ): Promise<SmartReminder[]> {
    const reminders: SmartReminder[] = [];
    const staleDays = this.DEFAULT_STALE_TASK_DAYS;
    const staleThreshold = new Date(
      Date.now() - staleDays * 24 * 60 * 60 * 1000,
    );

    // Find tasks not updated in a while
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        tenantId,
        assigneeId: userId,
        status: 'IN_PROGRESS',
        updatedAt: { lt: staleThreshold },
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    });

    for (const task of tasks) {
      const existing = await prisma.smartReminder.findFirst({
        where: {
          tenantId,
          taskId: task.id,
          type: 'STALE_TASK',
          dismissed: false,
        },
      });

      if (!existing) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
        );

        reminders.push({
          userId,
          projectId,
          taskId: task.id,
          type: 'STALE_TASK',
          priority: daysSinceUpdate > 10 ? 'HIGH' : 'MEDIUM',
          title: `Task needs attention`,
          message: `"${task.title}" hasn't been updated in ${daysSinceUpdate} days`,
          actionUrl: `/projects/${projectId}?task=${task.id}`,
          scheduledFor: new Date(),
          delivered: false,
          dismissed: false,
          actionTaken: false,
        });
      }
    }

    return reminders;
  }

  private async generateBlockedChainReminders(
    userId: number,
    projectId: number,
    tenantId: string,
  ): Promise<SmartReminder[]> {
    const reminders: SmartReminder[] = [];

    // Find blocked tasks that block other tasks
    const blockedTasks = await prisma.task.findMany({
      where: {
        projectId,
        tenantId,
        assigneeId: userId,
        status: 'BLOCKED',
      },
      include: {
        dependentTasks: {
          include: {
            dependentTask: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    for (const task of blockedTasks) {
      if (task.dependentTasks.length > 0) {
        const existing = await prisma.smartReminder.findFirst({
          where: {
            tenantId,
            taskId: task.id,
            type: 'BLOCKED_CHAIN',
            dismissed: false,
          },
        });

        if (!existing) {
          const blockedCount = task.dependentTasks.length;

          reminders.push({
            userId,
            projectId,
            taskId: task.id,
            type: 'BLOCKED_CHAIN',
            priority: blockedCount > 2 ? 'URGENT' : 'HIGH',
            title: `Blocked task affecting others`,
            message: `"${task.title}" is blocking ${blockedCount} other task${blockedCount > 1 ? 's' : ''}`,
            actionUrl: `/projects/${projectId}?task=${task.id}`,
            scheduledFor: new Date(),
            delivered: false,
            dismissed: false,
            actionTaken: false,
          });
        }
      }
    }

    return reminders;
  }

  private async generateMilestoneReminders(
    userId: number,
    projectId: number,
    tenantId: string,
  ): Promise<SmartReminder[]> {
    const reminders: SmartReminder[] = [];
    const leadDays = this.DEFAULT_MILESTONE_LEAD_DAYS;
    const now = new Date();
    const threshold = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000);

    const milestones = await prisma.milestone.findMany({
      where: {
        projectId,
        tenantId,
        status: { notIn: ['COMPLETED'] },
        dueDate: { lte: threshold, gte: now },
      },
      select: {
        id: true,
        name: true,
        dueDate: true,
      },
    });

    for (const milestone of milestones) {
      const existing = await prisma.smartReminder.findFirst({
        where: {
          tenantId,
          milestoneId: milestone.id,
          type: 'MILESTONE_APPROACHING',
          dismissed: false,
        },
      });

      if (!existing) {
        const daysUntilDue = Math.ceil(
          (milestone.dueDate!.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        reminders.push({
          userId,
          projectId,
          milestoneId: milestone.id,
          type: 'MILESTONE_APPROACHING',
          priority: daysUntilDue <= 3 ? 'HIGH' : 'MEDIUM',
          title: `Milestone approaching`,
          message: `"${milestone.name}" is due in ${daysUntilDue} days`,
          actionUrl: `/projects/${projectId}?tab=milestones`,
          scheduledFor: now,
          delivered: false,
          dismissed: false,
          actionTaken: false,
        });
      }
    }

    return reminders;
  }

  private async generateHealthDeclineReminders(
    userId: number,
    projectId: number,
    tenantId: string,
  ): Promise<SmartReminder[]> {
    const reminders: SmartReminder[] = [];

    // Get recent health predictions
    const predictions = await prisma.projectHealthPrediction.findMany({
      where: { projectId, tenantId },
      orderBy: { predictionDate: 'desc' },
      take: 2,
    });

    if (predictions.length >= 2) {
      const current = predictions[0];
      const previous = predictions[1];

      const healthOrder = { ON_TRACK: 2, AT_RISK: 1, OFF_TRACK: 0 };
      const currentScore =
        healthOrder[current.predictedHealth as keyof typeof healthOrder] ?? 1;
      const previousScore =
        healthOrder[previous.predictedHealth as keyof typeof healthOrder] ?? 1;

      // Check if health declined
      if (currentScore < previousScore) {
        const existing = await prisma.smartReminder.findFirst({
          where: {
            tenantId,
            projectId,
            type: 'HEALTH_DECLINE',
            dismissed: false,
            scheduledFor: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        });

        if (!existing) {
          reminders.push({
            userId,
            projectId,
            type: 'HEALTH_DECLINE',
            priority:
              current.predictedHealth === 'OFF_TRACK' ? 'URGENT' : 'HIGH',
            title: `Project health declining`,
            message: `Project health has declined from ${previous.predictedHealth} to ${current.predictedHealth}`,
            actionUrl: `/projects/${projectId}`,
            scheduledFor: new Date(),
            delivered: false,
            dismissed: false,
            actionTaken: false,
          });
        }
      }
    }

    return reminders;
  }

  private async storeReminder(
    reminder: SmartReminder,
    tenantId: string,
  ): Promise<number> {
    const created = await prisma.smartReminder.create({
      data: {
        tenantId,
        userId: reminder.userId,
        projectId: reminder.projectId,
        taskId: reminder.taskId,
        milestoneId: reminder.milestoneId,
        type: reminder.type,
        priority: reminder.priority,
        title: reminder.title,
        message: reminder.message,
        actionUrl: reminder.actionUrl,
        scheduledFor: reminder.scheduledFor,
        delivered: false,
        dismissed: false,
        actionTaken: false,
      },
    });

    return created.id;
  }

  private mapReminderFromDb(r: {
    id: number;
    userId: number;
    projectId: number;
    taskId: number | null;
    milestoneId: number | null;
    type: string;
    priority: string;
    title: string;
    message: string;
    actionUrl: string | null;
    scheduledFor: Date;
    delivered: boolean;
    dismissed: boolean;
    actionTaken: boolean;
  }): SmartReminder {
    return {
      id: r.id,
      userId: r.userId,
      projectId: r.projectId,
      taskId: r.taskId || undefined,
      milestoneId: r.milestoneId || undefined,
      type: r.type as SmartReminder['type'],
      priority: r.priority as SmartReminder['priority'],
      title: r.title,
      message: r.message,
      actionUrl: r.actionUrl || undefined,
      scheduledFor: r.scheduledFor,
      delivered: r.delivered,
      dismissed: r.dismissed,
      actionTaken: r.actionTaken,
    };
  }
}

export const smartRemindersService = new SmartRemindersService();
