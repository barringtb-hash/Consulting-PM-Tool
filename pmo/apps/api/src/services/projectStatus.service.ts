import { TaskStatus } from '@prisma/client';

import prisma from '../prisma/client';

export interface ProjectStatusSnapshot {
  projectId: number;
  healthStatus: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  statusSummary: string | null;
  statusUpdatedAt: string | null;
  taskCounts: Record<string, number>;
  overdueTasks: Array<{
    id: number;
    title: string;
    dueDate: string;
    status: string;
  }>;
  upcomingTasks: Array<{
    id: number;
    title: string;
    dueDate: string;
    status: string;
  }>;
  upcomingMilestones: Array<{
    id: number;
    name: string;
    dueDate: string;
    status: string;
  }>;
  currentMilestone: {
    id: number;
    name: string;
    dueDate: string;
    status: string;
  } | null;
  recentRisks: Array<{ meetingId: number; snippet: string; date: string }>;
  recentDecisions: Array<{ meetingId: number; snippet: string; date: string }>;
}

export interface StatusSummaryOptions {
  projectId: number;
  from?: Date;
  to?: Date;
  rangeDays?: number;
}

export interface StatusSummaryResponse {
  range: { from: string; to: string };
  completedTasks: Array<{ id: number; title: string; completedAt: string }>;
  upcomingTasks: Array<{ id: number; title: string; dueDate: string }>;
  upcomingMilestones: Array<{ id: number; name: string; dueDate: string }>;
  markdown: string;
}

/**
 * Get a comprehensive status snapshot for a project
 */
export async function getProjectStatus(
  projectId: number,
  rangeDays = 7,
): Promise<ProjectStatusSnapshot> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingDate = new Date(today);
  upcomingDate.setDate(today.getDate() + rangeDays);

  const recentDate = new Date(today);
  recentDate.setDate(today.getDate() - 14);

  // Load project with all related data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        orderBy: { dueDate: 'asc' },
      },
      milestones: {
        orderBy: { dueDate: 'asc' },
      },
      meetings: {
        where: {
          date: {
            gte: recentDate,
          },
        },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // OPTIMIZED: Single-pass task processing instead of multiple filter passes
  // Previous: 3 separate passes over tasks array - O(3n)
  // Now: 1 pass collecting all data - O(n)
  const taskCounts: Record<string, number> = {};
  // Initialize all status counts to 0
  for (const status of Object.values(TaskStatus)) {
    taskCounts[status] = 0;
  }

  const overdueTasksRaw: Array<{
    id: number;
    title: string;
    dueDate: Date;
    status: string;
  }> = [];
  const upcomingTasksRaw: Array<{
    id: number;
    title: string;
    dueDate: Date;
    status: string;
  }> = [];

  // Single pass to collect task counts, overdue, and upcoming
  for (const task of project.tasks) {
    // Count by status
    taskCounts[task.status]++;

    // Skip DONE tasks for overdue/upcoming calculations
    if (task.status === TaskStatus.DONE) continue;

    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      if (dueDate < today) {
        // Overdue task
        overdueTasksRaw.push({
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          status: task.status,
        });
      } else if (dueDate <= upcomingDate) {
        // Upcoming task
        upcomingTasksRaw.push({
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          status: task.status,
        });
      }
    }
  }

  // Sort and limit the results
  const overdueTasks = overdueTasksRaw
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 10)
    .map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate.toISOString(),
      status: task.status,
    }));

  const upcomingTasks = upcomingTasksRaw
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 10)
    .map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate.toISOString(),
      status: task.status,
    }));

  // Find upcoming milestones
  const upcomingMilestones = project.milestones
    .filter(
      (milestone) =>
        milestone.dueDate &&
        new Date(milestone.dueDate) >= today &&
        new Date(milestone.dueDate) <= upcomingDate,
    )
    .map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      dueDate: milestone.dueDate!.toISOString(),
      status: milestone.status,
    }))
    .slice(0, 5); // Limit to 5

  // Find current milestone (nearest incomplete milestone)
  const currentMilestone = project.milestones
    .filter((m) => m.status !== 'DONE' && m.dueDate)
    .sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    )[0];

  // Extract recent risks and decisions from meetings
  const recentRisks: Array<{
    meetingId: number;
    snippet: string;
    date: string;
  }> = [];
  const recentDecisions: Array<{
    meetingId: number;
    snippet: string;
    date: string;
  }> = [];

  for (const meeting of project.meetings) {
    if (meeting.risks && meeting.risks.trim().length > 0) {
      recentRisks.push({
        meetingId: meeting.id,
        snippet: meeting.risks.substring(0, 200), // Truncate to 200 chars
        date: meeting.date.toISOString(),
      });
    }

    if (meeting.decisions && meeting.decisions.trim().length > 0) {
      recentDecisions.push({
        meetingId: meeting.id,
        snippet: meeting.decisions.substring(0, 200),
        date: meeting.date.toISOString(),
      });
    }
  }

  return {
    projectId: project.id,
    healthStatus:
      (project.healthStatus as 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK') ||
      'ON_TRACK',
    statusSummary: project.statusSummary,
    statusUpdatedAt: project.statusUpdatedAt?.toISOString() || null,
    taskCounts,
    overdueTasks,
    upcomingTasks,
    upcomingMilestones,
    currentMilestone: currentMilestone
      ? {
          id: currentMilestone.id,
          name: currentMilestone.name,
          dueDate: currentMilestone.dueDate!.toISOString(),
          status: currentMilestone.status,
        }
      : null,
    recentRisks: recentRisks.slice(0, 5), // Limit to 5
    recentDecisions: recentDecisions.slice(0, 5), // Limit to 5
  };
}

/**
 * Build a time-boxed status summary for copy-paste into reports
 */
export async function buildStatusSummary(
  options: StatusSummaryOptions,
): Promise<StatusSummaryResponse> {
  const { projectId } = options;

  // Determine date range
  let from: Date;
  let to: Date;

  if (options.from && options.to) {
    from = new Date(options.from);
    to = new Date(options.to);
  } else if (options.rangeDays) {
    to = new Date();
    to.setHours(23, 59, 59, 999);
    from = new Date(to);
    from.setDate(to.getDate() - options.rangeDays);
    from.setHours(0, 0, 0, 0);
  } else {
    // Default to last 7 days
    to = new Date();
    to.setHours(23, 59, 59, 999);
    from = new Date(to);
    from.setDate(to.getDate() - 7);
    from.setHours(0, 0, 0, 0);
  }

  // Load project and data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: true,
      milestones: true,
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Get completed tasks in the range
  const completedTasks = project.tasks
    .filter(
      (task) =>
        task.status === TaskStatus.DONE &&
        task.updatedAt >= from &&
        task.updatedAt <= to,
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      completedAt: task.updatedAt.toISOString(),
    }));

  // Get upcoming tasks (after 'to' date)
  const futureDate = new Date(to);
  futureDate.setDate(futureDate.getDate() + 7);

  const upcomingTasks = project.tasks
    .filter(
      (task) =>
        task.dueDate &&
        new Date(task.dueDate) > to &&
        new Date(task.dueDate) <= futureDate &&
        task.status !== TaskStatus.DONE,
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate!.toISOString(),
    }));

  // Get upcoming milestones
  const upcomingMilestones = project.milestones
    .filter(
      (milestone) =>
        milestone.dueDate &&
        new Date(milestone.dueDate) > to &&
        new Date(milestone.dueDate) <= futureDate,
    )
    .map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      dueDate: milestone.dueDate!.toISOString(),
    }));

  // Generate markdown
  const markdown = generateMarkdownSummary({
    projectName: project.name,
    healthStatus: project.healthStatus as 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK',
    from,
    to,
    completedTasks,
    upcomingTasks,
    upcomingMilestones,
  });

  return {
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    completedTasks,
    upcomingTasks,
    upcomingMilestones,
    markdown,
  };
}

/**
 * Generate a markdown-formatted status summary
 * OPTIMIZED: Use array.join() instead of string concatenation
 * String concatenation creates new string objects on each iteration (O(n²))
 * Array.join() collects parts and joins once (O(n))
 */
function generateMarkdownSummary(data: {
  projectName: string;
  healthStatus: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  from: Date;
  to: Date;
  completedTasks: Array<{ id: number; title: string; completedAt: string }>;
  upcomingTasks: Array<{ id: number; title: string; dueDate: string }>;
  upcomingMilestones: Array<{ id: number; name: string; dueDate: string }>;
}): string {
  const statusMap = {
    ON_TRACK: 'On Track',
    AT_RISK: 'At Risk',
    OFF_TRACK: 'Off Track',
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  // OPTIMIZED: Collect parts in array and join once at the end
  const parts: string[] = [
    `## Status Report – ${data.projectName}\n`,
    `**Status:** ${statusMap[data.healthStatus]}`,
    `**Period:** ${formatDate(data.from)} → ${formatDate(data.to)}\n`,
    `### Completed`,
  ];

  if (data.completedTasks.length > 0) {
    for (const task of data.completedTasks) {
      parts.push(`- ${task.title} (Done ${formatDate(task.completedAt)})`);
    }
  } else {
    parts.push(`- No tasks completed in this period`);
  }

  parts.push(''); // Empty line separator

  if (data.upcomingTasks.length > 0 || data.upcomingMilestones.length > 0) {
    parts.push(`### Upcoming (Next 7 days)`);

    for (const task of data.upcomingTasks) {
      parts.push(`- ${task.title} – due ${formatDate(task.dueDate)}`);
    }

    for (const milestone of data.upcomingMilestones) {
      parts.push(
        `- **Milestone:** ${milestone.name} – target ${formatDate(milestone.dueDate)}`,
      );
    }

    parts.push(''); // Trailing newline
  }

  return parts.join('\n');
}
