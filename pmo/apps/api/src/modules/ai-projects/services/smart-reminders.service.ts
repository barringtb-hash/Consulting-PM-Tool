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
    | 'TASK_OVERDUE'
    | 'TASK_DUE_SOON'
    | 'MILESTONE_APPROACHING'
    | 'STALE_PROJECT'
    | 'NO_RECENT_ACTIVITY'
    | 'HEALTH_DECLINING'
    | 'MEETING_FOLLOWUP'
    | 'STATUS_UPDATE_DUE'
    | 'BUDGET_ALERT'
    | 'SCOPE_CREEP';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  actionUrl?: string;
  scheduledFor: Date;
  status: 'PENDING' | 'SENT' | 'DISMISSED' | 'ACTION_TAKEN';
  // Computed from status for backward compatibility
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
        status: 'PENDING',
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
      data: { status: 'DISMISSED', dismissedAt: new Date() },
    });
  }

  /**
   * Mark a reminder as acted upon
   */
  async markActionTaken(reminderId: number, _tenantId: string): Promise<void> {
    await prisma.smartReminder.update({
      where: { id: reminderId },
      data: { status: 'ACTION_TAKEN', actionTakenAt: new Date() },
    });
  }

  /**
   * Snooze a reminder
   */
  async snoozeReminder(
    reminderId: number,
    _tenantId: string,
    snoozeUntil: Date,
  ): Promise<void> {
    await prisma.smartReminder.update({
      where: { id: reminderId },
      data: { scheduledFor: snoozeUntil },
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
      byType[r.reminderType] = (byType[r.reminderType] || 0) + 1;

      if (r.status === 'DISMISSED') dismissed++;
      if (r.status === 'ACTION_TAKEN') {
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
        assignees: { some: { userId } },
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
          entityType: 'task',
          entityId: task.id,
          reminderType: 'TASK_DUE_SOON',
          status: 'PENDING',
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
          type: 'TASK_DUE_SOON',
          priority:
            daysUntilDue <= 1
              ? 'URGENT'
              : task.priority === 'P1'
                ? 'HIGH'
                : 'NORMAL',
          title: `Task deadline approaching`,
          message: `"${task.title}" is due ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}`,
          actionUrl: `/projects/${projectId}?task=${task.id}`,
          scheduledFor: now,
          status: 'PENDING',
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
        assignees: { some: { userId } },
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
          entityType: 'task',
          entityId: task.id,
          reminderType: 'NO_RECENT_ACTIVITY',
          status: 'PENDING',
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
          type: 'NO_RECENT_ACTIVITY',
          priority: daysSinceUpdate > 10 ? 'HIGH' : 'NORMAL',
          title: `Task needs attention`,
          message: `"${task.title}" hasn't been updated in ${daysSinceUpdate} days`,
          actionUrl: `/projects/${projectId}?task=${task.id}`,
          scheduledFor: new Date(),
          status: 'PENDING',
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

    // Find blocked tasks assigned to user
    const blockedTasks = await prisma.task.findMany({
      where: {
        projectId,
        tenantId,
        assignees: { some: { userId } },
        status: 'BLOCKED',
      },
      select: {
        id: true,
        title: true,
      },
    });

    // Check if blocked tasks have dependents via TaskDependency
    for (const task of blockedTasks) {
      const dependentCount = await prisma.taskDependency.count({
        where: {
          blockingTaskId: task.id,
        },
      });

      if (dependentCount > 0) {
        const existing = await prisma.smartReminder.findFirst({
          where: {
            tenantId,
            entityType: 'task',
            entityId: task.id,
            reminderType: 'TASK_OVERDUE',
            status: 'PENDING',
          },
        });

        if (!existing) {
          reminders.push({
            userId,
            projectId,
            taskId: task.id,
            type: 'TASK_OVERDUE',
            priority: dependentCount > 2 ? 'URGENT' : 'HIGH',
            title: `Blocked task affecting others`,
            message: `"${task.title}" is blocking ${dependentCount} other task${dependentCount > 1 ? 's' : ''}`,
            actionUrl: `/projects/${projectId}?task=${task.id}`,
            scheduledFor: new Date(),
            status: 'PENDING',
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
        status: { notIn: ['DONE'] },
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
          entityType: 'milestone',
          entityId: milestone.id,
          reminderType: 'MILESTONE_APPROACHING',
          status: 'PENDING',
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
          priority: daysUntilDue <= 3 ? 'HIGH' : 'NORMAL',
          title: `Milestone approaching`,
          message: `"${milestone.name}" is due in ${daysUntilDue} days`,
          actionUrl: `/projects/${projectId}?tab=milestones`,
          scheduledFor: now,
          status: 'PENDING',
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
      orderBy: { predictedDate: 'desc' },
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
            reminderType: 'HEALTH_DECLINING',
            status: 'PENDING',
            scheduledFor: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        });

        if (!existing) {
          reminders.push({
            userId,
            projectId,
            type: 'HEALTH_DECLINING',
            priority:
              current.predictedHealth === 'OFF_TRACK' ? 'URGENT' : 'HIGH',
            title: `Project health declining`,
            message: `Project health has declined from ${previous.predictedHealth} to ${current.predictedHealth}`,
            actionUrl: `/projects/${projectId}`,
            scheduledFor: new Date(),
            status: 'PENDING',
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
    // Determine entity type and ID
    let entityType: 'project' | 'task' | 'milestone' = 'project';
    let entityId = reminder.projectId;
    if (reminder.taskId) {
      entityType = 'task';
      entityId = reminder.taskId;
    } else if (reminder.milestoneId) {
      entityType = 'milestone';
      entityId = reminder.milestoneId;
    }

    const created = await prisma.smartReminder.create({
      data: {
        tenantId,
        userId: reminder.userId,
        reminderType: reminder.type,
        entityType,
        entityId,
        projectId: reminder.projectId,
        title: reminder.title,
        message: reminder.message,
        actionUrl: reminder.actionUrl,
        scheduledFor: reminder.scheduledFor,
        priority: reminder.priority,
        status: 'PENDING',
      },
    });

    return created.id;
  }

  private mapReminderFromDb(r: {
    id: number;
    userId: number;
    projectId: number | null;
    entityType: string;
    entityId: number;
    reminderType: string;
    priority: string;
    title: string;
    message: string;
    actionUrl: string | null;
    scheduledFor: Date;
    status: string;
  }): SmartReminder {
    // Derive taskId/milestoneId from entityType/entityId for backward compatibility
    const taskId = r.entityType === 'task' ? r.entityId : undefined;
    const milestoneId = r.entityType === 'milestone' ? r.entityId : undefined;

    // Map status to boolean flags for backward compatibility
    const delivered = r.status !== 'PENDING';
    const dismissed = r.status === 'DISMISSED';
    const actionTaken = r.status === 'ACTION_TAKEN';

    return {
      id: r.id,
      userId: r.userId,
      projectId: r.projectId || r.entityId,
      taskId,
      milestoneId,
      type: r.reminderType as SmartReminder['type'],
      priority: r.priority as SmartReminder['priority'],
      title: r.title,
      message: r.message,
      actionUrl: r.actionUrl || undefined,
      scheduledFor: r.scheduledFor,
      status: r.status as SmartReminder['status'],
      delivered,
      dismissed,
      actionTaken,
    };
  }
}

export const smartRemindersService = new SmartRemindersService();
