/**
 * Project ML Context Service
 *
 * Gathers comprehensive project data for ML analysis.
 * Collects task metrics, milestone metrics, team workload,
 * and historical performance for predictions.
 *
 * @module project-ml/services/project-ml-context
 */

import prisma from '../../../prisma/client';
import type {
  ProjectMLContext,
  TaskMetrics,
  MilestoneMetrics,
  TeamMetrics,
  TeamMemberWorkload,
  ActivityMetrics,
  HistoricalPerformance,
} from '../types';

// ============================================================================
// Context Gathering
// ============================================================================

/**
 * Gather complete project context for ML analysis.
 *
 * Collects data from multiple sources:
 * - Project basic info and current health
 * - Task metrics (completion rate, overdue, blocked)
 * - Milestone metrics (on-time rate)
 * - Team metrics (workload distribution)
 * - Historical performance (velocity trends)
 *
 * @param projectId - Project to gather context for
 * @param tenantId - Tenant context
 * @returns Complete project context for ML analysis
 *
 * @throws Error if project not found
 */
export async function gatherProjectContext(
  projectId: number,
  _tenantId: string,
): Promise<ProjectMLContext> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all data in parallel for performance
  const [project, tasks, milestones, members, meetings, recentTasks] =
    await Promise.all([
      // Project basic info
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          status: true,
          healthStatus: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          visibility: true,
        },
      }),

      // All tasks for the project
      prisma.task.findMany({
        where: { projectId },
        select: {
          id: true,
          status: true,
          priority: true,
          dueDate: true,
          estimatedHours: true,
          updatedAt: true,
          createdAt: true,
          assignees: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      // All milestones
      prisma.milestone.findMany({
        where: { projectId },
        select: {
          id: true,
          status: true,
          dueDate: true,
          createdAt: true,
        },
      }),

      // Project members
      prisma.projectMember.findMany({
        where: { projectId },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Meetings in last 30 days
      prisma.meeting.findMany({
        where: {
          projectId,
          date: { gte: thirtyDaysAgo },
        },
        select: {
          id: true,
          risks: true,
          decisions: true,
        },
      }),

      // Tasks completed recently (for velocity) - using updatedAt as proxy for completion date
      prisma.task.findMany({
        where: {
          projectId,
          status: 'DONE',
          updatedAt: { gte: thirtyDaysAgo },
        },
        select: {
          updatedAt: true,
          createdAt: true,
        },
      }),
    ]);

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Calculate task metrics
  const taskMetrics = calculateTaskMetrics(
    tasks,
    now,
    sevenDaysAgo,
    thirtyDaysAgo,
  );

  // Calculate milestone metrics
  const milestoneMetrics = calculateMilestoneMetrics(milestones, now);

  // Calculate team metrics
  const teamMetrics = calculateTeamMetrics(members, tasks);

  // Calculate activity metrics
  const activityMetrics = calculateActivityMetrics(
    recentTasks,
    tasks,
    meetings,
    sevenDaysAgo,
    thirtyDaysAgo,
  );

  // Calculate historical performance
  const historicalPerformance = calculateHistoricalPerformance(
    project,
    recentTasks,
    tasks,
    now,
    sevenDaysAgo,
    thirtyDaysAgo,
  );

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      healthStatus: project.healthStatus,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      visibility: project.visibility,
    },
    taskMetrics,
    milestoneMetrics,
    teamMetrics,
    activityMetrics,
    historicalPerformance,
  };
}

// ============================================================================
// Metric Calculations
// ============================================================================

/**
 * Calculate task metrics from task data
 */
function calculateTaskMetrics(
  tasks: Array<{
    id: number;
    status: string;
    priority: string;
    dueDate: Date | null;
    estimatedHours: number | null;
    updatedAt: Date | null;
    createdAt: Date;
  }>,
  now: Date,
  sevenDaysAgo: Date,
  thirtyDaysAgo: Date,
): TaskMetrics {
  const total = tasks.length;

  // Count by status
  const notStarted = tasks.filter((t) => t.status === 'NOT_STARTED').length;
  const backlog = tasks.filter((t) => t.status === 'BACKLOG').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const blocked = tasks.filter((t) => t.status === 'BLOCKED').length;
  const completed = tasks.filter((t) => t.status === 'DONE').length;

  // Count overdue (not done, past due date)
  const overdue = tasks.filter(
    (t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now,
  ).length;

  // Completion rate
  const completionRate = total > 0 ? completed / total : 0;

  // Average completion time (for completed tasks)
  const completedTasks = tasks.filter(
    (t) => t.status === 'DONE' && t.updatedAt,
  );
  let avgCompletionDays = 0;
  if (completedTasks.length > 0) {
    const totalDays = completedTasks.reduce((sum, t) => {
      const created = new Date(t.createdAt).getTime();
      const finished = new Date(t.updatedAt!).getTime();
      return sum + (finished - created) / (1000 * 60 * 60 * 24);
    }, 0);
    avgCompletionDays = totalDays / completedTasks.length;
  }

  // Recent completions
  const completedLast7Days = tasks.filter(
    (t) =>
      t.status === 'DONE' &&
      t.updatedAt &&
      new Date(t.updatedAt) >= sevenDaysAgo,
  ).length;

  const completedLast30Days = tasks.filter(
    (t) =>
      t.status === 'DONE' &&
      t.updatedAt &&
      new Date(t.updatedAt) >= thirtyDaysAgo,
  ).length;

  // By priority
  const byPriority = {
    P0: tasks.filter((t) => t.priority === 'P0').length,
    P1: tasks.filter((t) => t.priority === 'P1').length,
    P2: tasks.filter((t) => t.priority === 'P2').length,
  };

  return {
    total,
    notStarted,
    backlog,
    inProgress,
    blocked,
    completed,
    overdue,
    completionRate,
    avgCompletionDays,
    completedLast7Days,
    completedLast30Days,
    byPriority,
  };
}

/**
 * Calculate milestone metrics
 */
function calculateMilestoneMetrics(
  milestones: Array<{
    id: number;
    status: string;
    dueDate: Date | null;
  }>,
  now: Date,
): MilestoneMetrics {
  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === 'DONE').length;
  const inProgress = milestones.filter(
    (m) => m.status === 'IN_PROGRESS',
  ).length;
  const notStarted = milestones.filter(
    (m) => m.status === 'NOT_STARTED',
  ).length;

  // Overdue (not done, past due date)
  const overdue = milestones.filter(
    (m) => m.status !== 'DONE' && m.dueDate && new Date(m.dueDate) < now,
  ).length;

  // Upcoming (within 14 days)
  const fourteenDaysFromNow = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000,
  );
  const upcoming = milestones.filter(
    (m) =>
      m.status !== 'DONE' &&
      m.dueDate &&
      new Date(m.dueDate) >= now &&
      new Date(m.dueDate) <= fourteenDaysFromNow,
  ).length;

  // On-time rate (completed milestones that were completed by due date)
  // For simplicity, assume completed milestones were on time if not marked overdue
  const onTimeRate =
    total > 0 ? Math.max(0, completed - overdue) / Math.max(1, completed) : 1;

  return {
    total,
    completed,
    inProgress,
    notStarted,
    overdue,
    upcoming,
    onTimeRate,
  };
}

/**
 * Calculate team metrics and workload distribution
 */
function calculateTeamMetrics(
  members: Array<{
    userId: number;
    user: { id: number; name: string };
  }>,
  tasks: Array<{
    id: number;
    status: string;
    estimatedHours: number | null;
    dueDate: Date | null;
    assignees: Array<{ userId: number; user: { id: number; name: string } }>;
  }>,
): TeamMetrics {
  const now = new Date();
  const totalMembers = members.length;

  // Build workload map
  const workloadMap = new Map<number, TeamMemberWorkload>();

  // Initialize all members
  for (const member of members) {
    workloadMap.set(member.userId, {
      userId: member.userId,
      name: member.user.name,
      taskCount: 0,
      inProgressCount: 0,
      estimatedHours: 0,
      overdueCount: 0,
    });
  }

  // Count tasks per member
  for (const task of tasks) {
    for (const assignee of task.assignees ?? []) {
      const workload = workloadMap.get(assignee.userId);
      if (workload) {
        workload.taskCount++;
        if (task.status === 'IN_PROGRESS') {
          workload.inProgressCount++;
        }
        if (task.estimatedHours) {
          workload.estimatedHours += task.estimatedHours;
        }
        if (
          task.status !== 'DONE' &&
          task.dueDate &&
          new Date(task.dueDate) < now
        ) {
          workload.overdueCount++;
        }
      }
    }
  }

  const workloadDistribution = Array.from(workloadMap.values());

  // Calculate workload imbalance (Gini coefficient approximation)
  const activeMembers = workloadDistribution.filter(
    (w) => w.taskCount > 0,
  ).length;
  let workloadImbalance = 0;

  if (activeMembers > 1) {
    const taskCounts = workloadDistribution.map((w) => w.taskCount);
    const mean = taskCounts.reduce((a, b) => a + b, 0) / taskCounts.length;
    if (mean > 0) {
      // Coefficient of variation as imbalance measure
      const variance =
        taskCounts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) /
        taskCounts.length;
      workloadImbalance = Math.sqrt(variance) / mean;
      // Normalize to 0-1 range
      workloadImbalance = Math.min(1, workloadImbalance);
    }
  }

  return {
    totalMembers,
    activeMembers,
    workloadDistribution,
    workloadImbalance,
  };
}

/**
 * Calculate activity metrics
 */
function calculateActivityMetrics(
  recentCompletedTasks: Array<{ updatedAt: Date | null; createdAt: Date }>,
  allTasks: Array<{ createdAt: Date }>,
  meetings: Array<{ risks: string | null; decisions: string | null }>,
  sevenDaysAgo: Date,
  _thirtyDaysAgo: Date,
): ActivityMetrics {
  const tasksCompletedLast7Days = recentCompletedTasks.filter(
    (t) => t.updatedAt && new Date(t.updatedAt) >= sevenDaysAgo,
  ).length;

  const tasksCompletedLast30Days = recentCompletedTasks.length;

  const tasksCreatedLast7Days = allTasks.filter(
    (t) => new Date(t.createdAt) >= sevenDaysAgo,
  ).length;

  const meetingsLast30Days = meetings.length;

  // Count risks and decisions from meetings
  let risksIdentified = 0;
  let decisionsRecorded = 0;

  for (const meeting of meetings) {
    if (meeting.risks) {
      // Count non-empty risks (assuming it's stored as text or array)
      const riskText = meeting.risks;
      if (typeof riskText === 'string' && riskText.trim()) {
        risksIdentified++;
      }
    }
    if (meeting.decisions) {
      const decisionText = meeting.decisions;
      if (typeof decisionText === 'string' && decisionText.trim()) {
        decisionsRecorded++;
      }
    }
  }

  return {
    tasksCompletedLast7Days,
    tasksCompletedLast30Days,
    tasksCreatedLast7Days,
    meetingsLast30Days,
    risksIdentified,
    decisionsRecorded,
  };
}

/**
 * Calculate historical performance metrics
 */
function calculateHistoricalPerformance(
  project: {
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
  },
  recentCompletedTasks: Array<{ updatedAt: Date | null; createdAt: Date }>,
  allTasks: Array<{
    status: string;
    dueDate: Date | null;
    updatedAt: Date | null;
  }>,
  now: Date,
  sevenDaysAgo: Date,
  _thirtyDaysAgo: Date,
): HistoricalPerformance {
  // Days since project started
  const startDate = project.startDate || project.createdAt;
  const daysSinceStart = Math.floor(
    (now.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  // Days remaining
  let daysRemaining: number | null = null;
  if (project.endDate) {
    daysRemaining = Math.floor(
      (new Date(project.endDate).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24),
    );
  }

  // Calculate velocity (tasks per week)
  const tasksLast7Days = recentCompletedTasks.filter(
    (t) => t.updatedAt && new Date(t.updatedAt) >= sevenDaysAgo,
  ).length;

  const tasksLast30Days = recentCompletedTasks.length;

  // Current week velocity
  const currentVelocity = tasksLast7Days;
  // 30-day average velocity (per week)
  const avgVelocity = tasksLast30Days / 4;

  // Determine velocity trend
  let velocityTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (currentVelocity > avgVelocity * 1.2) {
    velocityTrend = 'improving';
  } else if (currentVelocity < avgVelocity * 0.8) {
    velocityTrend = 'declining';
  }

  // Calculate average task delay
  let avgTaskDelay = 0;
  const completedTasksWithDue = allTasks.filter(
    (t) => t.status === 'DONE' && t.dueDate && t.updatedAt,
  );

  if (completedTasksWithDue.length > 0) {
    const totalDelay = completedTasksWithDue.reduce((sum, t) => {
      const dueDate = new Date(t.dueDate!).getTime();
      const completedDate = new Date(t.updatedAt!).getTime();
      const delayDays = (completedDate - dueDate) / (1000 * 60 * 60 * 24);
      return sum + Math.max(0, delayDays); // Only count positive delays
    }, 0);
    avgTaskDelay = totalDelay / completedTasksWithDue.length;
  }

  return {
    velocityTrend,
    avgVelocity,
    avgTaskDelay,
    budgetUtilization: null, // Not available without budget tracking
    daysSinceStart,
    daysRemaining,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a simplified project summary for LLM context
 */
export function formatContextForLLM(context: ProjectMLContext): string {
  const {
    project,
    taskMetrics,
    milestoneMetrics,
    teamMetrics,
    historicalPerformance,
  } = context;

  return `
PROJECT: ${project.name}
Status: ${project.status}, Health: ${project.healthStatus}
Start: ${project.startDate?.toISOString().split('T')[0] || 'Not set'}
End: ${project.endDate?.toISOString().split('T')[0] || 'Not set'}
Days since start: ${historicalPerformance.daysSinceStart}
Days remaining: ${historicalPerformance.daysRemaining ?? 'No end date set'}

TASKS:
- Total: ${taskMetrics.total}
- Completed: ${taskMetrics.completed} (${(taskMetrics.completionRate * 100).toFixed(1)}%)
- In Progress: ${taskMetrics.inProgress}
- Blocked: ${taskMetrics.blocked}
- Overdue: ${taskMetrics.overdue}
- Avg completion time: ${taskMetrics.avgCompletionDays.toFixed(1)} days
- P0 tasks: ${taskMetrics.byPriority.P0}, P1: ${taskMetrics.byPriority.P1}, P2: ${taskMetrics.byPriority.P2}

MILESTONES:
- Total: ${milestoneMetrics.total}
- Completed: ${milestoneMetrics.completed}
- Overdue: ${milestoneMetrics.overdue}
- Upcoming (14 days): ${milestoneMetrics.upcoming}
- On-time rate: ${(milestoneMetrics.onTimeRate * 100).toFixed(1)}%

TEAM:
- Members: ${teamMetrics.totalMembers}
- Active: ${teamMetrics.activeMembers}
- Workload imbalance: ${(teamMetrics.workloadImbalance * 100).toFixed(1)}%
${teamMetrics.workloadDistribution
  .slice(0, 5)
  .map((w) => `  - ${w.name}: ${w.taskCount} tasks, ${w.overdueCount} overdue`)
  .join('\n')}

VELOCITY:
- Trend: ${historicalPerformance.velocityTrend}
- Current: ${historicalPerformance.avgVelocity.toFixed(1)} tasks/week
- Avg task delay: ${historicalPerformance.avgTaskDelay.toFixed(1)} days
`.trim();
}
