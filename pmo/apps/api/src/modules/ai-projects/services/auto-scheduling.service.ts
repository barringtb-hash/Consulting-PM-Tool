/**
 * Auto-Scheduling Service
 *
 * AI-powered task scheduling that considers dependencies, team availability,
 * task priorities, and estimated durations to create optimal schedules.
 */

import { prisma } from '../../../prisma/client';

export interface ScheduleRequest {
  projectId: number;
  startDate?: Date;
  endDate?: Date;
  respectDependencies: boolean;
  considerAvailability: boolean;
  allowWeekends: boolean;
  workingHoursPerDay: number;
}

export interface ScheduleResult {
  projectId: number;
  scheduledTasks: ScheduledTask[];
  unscheduledTasks: UnscheduledTask[];
  warnings: ScheduleWarning[];
  criticalPath: number[];
  estimatedEndDate: Date;
  utilizationByMember: Record<string, number>;
}

export interface ScheduledTask {
  taskId: number;
  title: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  assigneeId?: number;
  assigneeName?: string;
  estimatedHours: number;
  dependsOn: number[];
}

export interface UnscheduledTask {
  taskId: number;
  title: string;
  reason: string;
}

export interface ScheduleWarning {
  type:
    | 'OVERALLOCATION'
    | 'DEPENDENCY_CONFLICT'
    | 'DEADLINE_RISK'
    | 'RESOURCE_CONSTRAINT';
  taskId?: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

interface TaskNode {
  id: number;
  title: string;
  estimatedHours: number;
  assigneeId: number | null;
  priority: string;
  dueDate: Date | null;
  dependencies: number[];
  dependents: number[];
  scheduledStart?: Date;
  scheduledEnd?: Date;
  earliestStart?: Date;
  latestStart?: Date;
  slack?: number;
}

class AutoSchedulingService {
  /**
   * Generate an optimized schedule for project tasks
   */
  async scheduleProject(
    request: ScheduleRequest,
    tenantId: string,
  ): Promise<ScheduleResult> {
    const project = await prisma.project.findFirst({
      where: { id: request.projectId, tenantId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Get tasks with dependencies
    const tasks = await this.getTasksWithDependencies(
      request.projectId,
      tenantId,
    );

    // Get team availability if requested
    const availability = request.considerAvailability
      ? await this.getTeamAvailability(request.projectId, tenantId)
      : null;

    // Build dependency graph
    const taskNodes = this.buildTaskGraph(tasks);

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(taskNodes);

    // Schedule tasks using topological sort
    const startDate = request.startDate || project.startDate || new Date();
    const { scheduled, unscheduled, warnings } = this.scheduleTasks(
      taskNodes,
      startDate,
      {
        workingHoursPerDay: request.workingHoursPerDay,
        allowWeekends: request.allowWeekends,
        availability,
        projectDeadline: request.endDate || project.endDate,
      },
    );

    // Calculate utilization
    const utilizationByMember = this.calculateUtilization(
      scheduled,
      availability,
    );

    // Determine estimated end date
    const estimatedEndDate = scheduled.reduce(
      (latest, task) =>
        task.scheduledEnd > latest ? task.scheduledEnd : latest,
      startDate,
    );

    return {
      projectId: request.projectId,
      scheduledTasks: scheduled,
      unscheduledTasks: unscheduled,
      warnings,
      criticalPath,
      estimatedEndDate,
      utilizationByMember,
    };
  }

  /**
   * Apply a schedule to tasks in the database
   */
  async applySchedule(
    schedule: ScheduleResult,
    _tenantId: string,
  ): Promise<void> {
    // Update each scheduled task
    for (const task of schedule.scheduledTasks) {
      await prisma.task.update({
        where: { id: task.taskId },
        data: {
          scheduledStartDate: task.scheduledStart,
          scheduledEndDate: task.scheduledEnd,
          aiScheduled: true,
        },
      });
    }
  }

  /**
   * Get scheduling suggestions for a single task
   */
  async suggestTaskSchedule(
    taskId: number,
    tenantId: string,
  ): Promise<{
    suggestedStart: Date;
    suggestedEnd: Date;
    reasoning: string;
    conflicts: string[];
  }> {
    const task = await prisma.task.findFirst({
      where: { id: taskId, tenantId },
      include: {
        project: { select: { startDate: true, endDate: true } },
        assignees: {
          include: { user: { select: { id: true, name: true } } },
          take: 1,
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Get dependencies
    const dependencies = await prisma.taskDependency.findMany({
      where: { dependentTaskId: taskId },
      include: {
        blockingTask: {
          select: {
            id: true,
            title: true,
            scheduledEndDate: true,
            status: true,
          },
        },
      },
    });

    // Calculate earliest start based on dependencies
    let earliestStart = task.project.startDate || new Date();

    for (const dep of dependencies) {
      if (dep.blockingTask.status !== 'DONE') {
        const depEnd = dep.blockingTask.scheduledEndDate || new Date();
        if (depEnd > earliestStart) {
          earliestStart = new Date(depEnd);
        }
      }
    }

    // Check assignee's availability
    const conflicts: string[] = [];
    const primaryAssignee = task.assignees[0];

    if (primaryAssignee) {
      const overlappingTasks = await prisma.task.findMany({
        where: {
          tenantId,
          assignees: { some: { userId: primaryAssignee.userId } },
          id: { not: taskId },
          status: { notIn: ['DONE'] },
          scheduledStartDate: { not: null },
          scheduledEndDate: { not: null },
        },
        select: {
          title: true,
          scheduledStartDate: true,
          scheduledEndDate: true,
        },
      });

      const estimatedEnd = this.addWorkingDays(
        earliestStart,
        (task.estimatedHours || 8) / 8, // Assume 8-hour days
      );

      for (const other of overlappingTasks) {
        if (
          earliestStart < other.scheduledEndDate! &&
          estimatedEnd > other.scheduledStartDate!
        ) {
          conflicts.push(`Overlaps with "${other.title}"`);
        }
      }
    }

    // Calculate end date
    const estimatedHours = task.estimatedHours || task.aiEstimatedHours || 8;
    const suggestedEnd = this.addWorkingDays(earliestStart, estimatedHours / 8);

    // Build reasoning
    let reasoning = 'Based on ';
    const reasons: string[] = [];

    if (dependencies.length > 0) {
      reasons.push(`${dependencies.length} dependencies`);
    }
    if (task.dueDate) {
      reasons.push('due date constraint');
    }
    if (primaryAssignee) {
      reasons.push('assignee availability');
    }

    reasoning += reasons.length > 0 ? reasons.join(', ') : 'project timeline';

    return {
      suggestedStart: earliestStart,
      suggestedEnd,
      reasoning,
      conflicts,
    };
  }

  /**
   * Add or update a task dependency
   */
  async addDependency(
    dependentTaskId: number,
    dependsOnTaskId: number,
    tenantId: string,
    options?: {
      dependencyType?:
        | 'FINISH_TO_START'
        | 'START_TO_START'
        | 'FINISH_TO_FINISH';
      lagDays?: number;
    },
  ): Promise<void> {
    // Verify both tasks exist and belong to the same project
    const [dependentTask, dependsOnTask] = await Promise.all([
      prisma.task.findFirst({
        where: { id: dependentTaskId, tenantId },
        select: { projectId: true },
      }),
      prisma.task.findFirst({
        where: { id: dependsOnTaskId, tenantId },
        select: { projectId: true },
      }),
    ]);

    if (!dependentTask || !dependsOnTask) {
      throw new Error('One or both tasks not found');
    }

    if (dependentTask.projectId !== dependsOnTask.projectId) {
      throw new Error('Tasks must be in the same project');
    }

    // Check for circular dependencies
    if (
      await this.wouldCreateCycle(dependentTaskId, dependsOnTaskId, tenantId)
    ) {
      throw new Error(
        'Adding this dependency would create a circular reference',
      );
    }

    // Create or update dependency
    await prisma.taskDependency.upsert({
      where: {
        dependentTaskId_blockingTaskId: {
          dependentTaskId,
          blockingTaskId: dependsOnTaskId,
        },
      },
      create: {
        dependentTaskId,
        blockingTaskId: dependsOnTaskId,
        dependencyType: options?.dependencyType || 'FINISH_TO_START',
      },
      update: {
        dependencyType: options?.dependencyType,
      },
    });
  }

  // Private helper methods

  private async getTasksWithDependencies(
    projectId: number,
    tenantId: string,
  ): Promise<
    Array<{
      id: number;
      title: string;
      estimatedHours: number | null;
      assigneeId: number | null;
      priority: string;
      dueDate: Date | null;
      status: string;
      dependencies: {
        dependsOnTaskId: number;
        dependencyType: string;
        lagDays: number;
      }[];
    }>
  > {
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        tenantId,
        status: { notIn: ['DONE'] },
      },
      select: {
        id: true,
        title: true,
        estimatedHours: true,
        aiEstimatedHours: true,
        assignees: {
          select: { userId: true },
          take: 1,
        },
        priority: true,
        dueDate: true,
        status: true,
        taskDependencies: {
          select: {
            blockingTaskId: true,
            dependencyType: true,
          },
        },
      },
    });

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      estimatedHours: t.estimatedHours || t.aiEstimatedHours,
      assigneeId: t.assignees[0]?.userId || null,
      priority: t.priority,
      dueDate: t.dueDate,
      status: t.status,
      dependencies: t.taskDependencies.map((d) => ({
        dependsOnTaskId: d.blockingTaskId,
        dependencyType: d.dependencyType,
      })),
    }));
  }

  private async getTeamAvailability(
    projectId: number,
    tenantId: string,
  ): Promise<Map<number, { hoursPerDay: number; daysOff: Date[] }>> {
    const availability = new Map<
      number,
      { hoursPerDay: number; daysOff: Date[] }
    >();

    // Get team members
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });

    // Get availability records for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await prisma.teamAvailability.findMany({
      where: {
        tenantId,
        userId: { in: members.map((m) => m.userId) },
        date: { gte: today },
      },
    });

    // Group availability by user and calculate average available hours
    const userAvailability = new Map<
      number,
      { totalAvailable: number; count: number }
    >();

    for (const record of records) {
      const existing = userAvailability.get(record.userId) || {
        totalAvailable: 0,
        count: 0,
      };
      existing.totalAvailable += record.availableHours - record.allocatedHours;
      existing.count += 1;
      userAvailability.set(record.userId, existing);
    }

    for (const [userId, data] of userAvailability) {
      const avgHoursPerDay =
        data.count > 0 ? data.totalAvailable / data.count : 8;
      availability.set(userId, {
        hoursPerDay: Math.max(0, avgHoursPerDay),
        daysOff: [], // Would need separate logic to determine days off
      });
    }

    // Default for members without availability records
    for (const member of members) {
      if (!availability.has(member.userId)) {
        availability.set(member.userId, { hoursPerDay: 8, daysOff: [] });
      }
    }

    return availability;
  }

  private buildTaskGraph(
    tasks: Awaited<ReturnType<typeof this.getTasksWithDependencies>>,
  ): Map<number, TaskNode> {
    const nodes = new Map<number, TaskNode>();

    // Create nodes
    for (const task of tasks) {
      nodes.set(task.id, {
        id: task.id,
        title: task.title,
        estimatedHours: task.estimatedHours || 8,
        assigneeId: task.assigneeId,
        priority: task.priority,
        dueDate: task.dueDate,
        dependencies: task.dependencies.map((d) => d.dependsOnTaskId),
        dependents: [],
      });
    }

    // Add reverse dependencies (dependents)
    for (const task of tasks) {
      for (const dep of task.dependencies) {
        const depNode = nodes.get(dep.dependsOnTaskId);
        if (depNode) {
          depNode.dependents.push(task.id);
        }
      }
    }

    return nodes;
  }

  private calculateCriticalPath(nodes: Map<number, TaskNode>): number[] {
    // Forward pass - calculate earliest start times
    const sorted = this.topologicalSort(nodes);

    for (const id of sorted) {
      const node = nodes.get(id)!;
      let earliestStart = new Date();

      for (const depId of node.dependencies) {
        const depNode = nodes.get(depId);
        if (
          depNode &&
          depNode.scheduledEnd &&
          depNode.scheduledEnd > earliestStart
        ) {
          earliestStart = depNode.scheduledEnd;
        }
      }

      node.earliestStart = earliestStart;
    }

    // Backward pass - calculate latest start times
    const reverseSorted = [...sorted].reverse();

    for (const id of reverseSorted) {
      const node = nodes.get(id)!;
      let latestStart = new Date(8640000000000000); // Far future

      if (node.dependents.length === 0) {
        // End task - latest = earliest
        latestStart = node.earliestStart || new Date();
      } else {
        for (const depId of node.dependents) {
          const depNode = nodes.get(depId);
          if (depNode && depNode.latestStart) {
            const depLatest = new Date(depNode.latestStart);
            depLatest.setHours(depLatest.getHours() - node.estimatedHours);
            if (depLatest < latestStart) {
              latestStart = depLatest;
            }
          }
        }
      }

      node.latestStart = latestStart;
      node.slack = Math.max(
        0,
        (latestStart.getTime() - (node.earliestStart?.getTime() || 0)) /
          (1000 * 60 * 60),
      );
    }

    // Critical path = tasks with 0 slack
    return sorted.filter((id) => {
      const node = nodes.get(id)!;
      return node.slack !== undefined && node.slack < 1;
    });
  }

  private topologicalSort(nodes: Map<number, TaskNode>): number[] {
    const visited = new Set<number>();
    const result: number[] = [];

    const visit = (id: number) => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = nodes.get(id);
      if (node) {
        for (const depId of node.dependencies) {
          visit(depId);
        }
        result.push(id);
      }
    };

    for (const id of nodes.keys()) {
      visit(id);
    }

    return result;
  }

  private scheduleTasks(
    nodes: Map<number, TaskNode>,
    startDate: Date,
    options: {
      workingHoursPerDay: number;
      allowWeekends: boolean;
      availability: Map<
        number,
        { hoursPerDay: number; daysOff: Date[] }
      > | null;
      projectDeadline?: Date | null;
    },
  ): {
    scheduled: ScheduledTask[];
    unscheduled: UnscheduledTask[];
    warnings: ScheduleWarning[];
  } {
    const scheduled: ScheduledTask[] = [];
    const unscheduled: UnscheduledTask[] = [];
    const warnings: ScheduleWarning[] = [];

    const sorted = this.topologicalSort(nodes);
    const assigneeSchedule = new Map<number, Date>(); // Track when each assignee is next available

    for (const id of sorted) {
      const node = nodes.get(id)!;

      // Find earliest start based on dependencies
      let taskStart = new Date(startDate);

      for (const depId of node.dependencies) {
        const depNode = nodes.get(depId);
        if (depNode?.scheduledEnd && depNode.scheduledEnd > taskStart) {
          taskStart = new Date(depNode.scheduledEnd);
        }
      }

      // Check assignee availability
      if (node.assigneeId && assigneeSchedule.has(node.assigneeId)) {
        const assigneeNextFree = assigneeSchedule.get(node.assigneeId)!;
        if (assigneeNextFree > taskStart) {
          taskStart = new Date(assigneeNextFree);
        }
      }

      // Skip weekends if needed
      if (!options.allowWeekends) {
        taskStart = this.skipWeekends(taskStart);
      }

      // Calculate end date
      const taskEnd = this.addWorkingDays(
        taskStart,
        node.estimatedHours / options.workingHoursPerDay,
        options.allowWeekends,
      );

      // Update node and create scheduled task
      node.scheduledStart = taskStart;
      node.scheduledEnd = taskEnd;

      scheduled.push({
        taskId: node.id,
        title: node.title,
        scheduledStart: taskStart,
        scheduledEnd: taskEnd,
        assigneeId: node.assigneeId || undefined,
        estimatedHours: node.estimatedHours,
        dependsOn: node.dependencies,
      });

      // Update assignee's next available time
      if (node.assigneeId) {
        assigneeSchedule.set(node.assigneeId, taskEnd);
      }

      // Check deadline
      if (options.projectDeadline && taskEnd > options.projectDeadline) {
        warnings.push({
          type: 'DEADLINE_RISK',
          taskId: node.id,
          message: `Task "${node.title}" scheduled to end after project deadline`,
          severity: 'high',
        });
      }
    }

    return { scheduled, unscheduled, warnings };
  }

  private calculateUtilization(
    scheduled: ScheduledTask[],
    availability: Map<number, { hoursPerDay: number; daysOff: Date[] }> | null,
  ): Record<string, number> {
    const utilization: Record<string, number> = {};

    if (!availability) return utilization;

    // Group tasks by assignee
    const tasksByAssignee = new Map<number, ScheduledTask[]>();

    for (const task of scheduled) {
      if (task.assigneeId) {
        const tasks = tasksByAssignee.get(task.assigneeId) || [];
        tasks.push(task);
        tasksByAssignee.set(task.assigneeId, tasks);
      }
    }

    // Calculate utilization for each assignee
    for (const [assigneeId, tasks] of tasksByAssignee) {
      const memberAvail = availability.get(assigneeId);
      if (!memberAvail) continue;

      const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

      // Calculate available hours over the scheduling period
      if (tasks.length > 0) {
        const start = tasks.reduce(
          (min, t) => (t.scheduledStart < min ? t.scheduledStart : min),
          tasks[0].scheduledStart,
        );
        const end = tasks.reduce(
          (max, t) => (t.scheduledEnd > max ? t.scheduledEnd : max),
          tasks[0].scheduledEnd,
        );

        const workingDays = this.countWorkingDays(start, end);
        const availableHours = workingDays * memberAvail.hoursPerDay;

        utilization[assigneeId.toString()] =
          availableHours > 0
            ? Math.round((totalHours / availableHours) * 100)
            : 0;
      }
    }

    return utilization;
  }

  private async wouldCreateCycle(
    dependentTaskId: number,
    dependsOnTaskId: number,
    _tenantId: string,
  ): Promise<boolean> {
    // Check if dependsOnTaskId already depends on dependentTaskId (directly or indirectly)
    const visited = new Set<number>();
    const toCheck = [dependsOnTaskId];

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;

      if (current === dependentTaskId) {
        return true; // Would create a cycle
      }

      if (visited.has(current)) continue;
      visited.add(current);

      // Get dependencies of current task
      const deps = await prisma.taskDependency.findMany({
        where: { dependentTaskId: current },
        select: { blockingTaskId: true },
      });

      for (const dep of deps) {
        toCheck.push(dep.blockingTaskId);
      }
    }

    return false;
  }

  private addWorkingDays(
    start: Date,
    days: number,
    allowWeekends: boolean = false,
  ): Date {
    const result = new Date(start);
    let remaining = days;

    while (remaining > 0) {
      result.setDate(result.getDate() + 1);

      if (allowWeekends || (result.getDay() !== 0 && result.getDay() !== 6)) {
        remaining -= 1;
      }
    }

    return result;
  }

  private skipWeekends(date: Date): Date {
    const result = new Date(date);

    while (result.getDay() === 0 || result.getDay() === 6) {
      result.setDate(result.getDate() + 1);
    }

    return result;
  }

  private countWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }
}

export const autoSchedulingService = new AutoSchedulingService();
