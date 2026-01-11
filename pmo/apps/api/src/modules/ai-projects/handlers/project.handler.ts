/**
 * Project Intent Handlers
 *
 * Handles responses for project-related intents in the Project Assistant.
 */

import { prisma } from '../../../prisma/client';
import { getProjectStatus } from '../../../services/projectStatus.service';
import { llmService } from '../../../services/llm.service';
import { IntentType } from '../intents/project.intent';

export interface ProjectContext {
  tenantId: string;
  userId: number;
  projectId?: number;
  projectName?: string;
}

export interface BotResponse {
  content: string;
  suggestedActions?: SuggestedAction[];
  expectingInput?: string;
  metadata?: Record<string, unknown>;
}

export interface SuggestedAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

/**
 * Main handler for project intents
 */
export async function handleProjectIntent(
  intent: IntentType,
  message: string,
  context: ProjectContext,
): Promise<BotResponse> {
  switch (intent) {
    case 'PROJECT_STATUS':
      return handleProjectStatusQuery(message, context);
    case 'TASK_STATUS':
      return handleTaskStatusQuery(message, context);
    case 'TASK_CREATE':
      return handleTaskCreateIntent(message, context);
    case 'MILESTONE_STATUS':
      return handleMilestoneStatusQuery(message, context);
    case 'TEAM_QUERY':
      return handleTeamQuery(message, context);
    case 'SCHEDULE_QUERY':
      return handleScheduleQuery(message, context);
    case 'REPORT_REQUEST':
      return handleReportRequest(message, context);
    case 'PROJECT_CREATE':
      return handleProjectCreateIntent(message, context);
    default:
      return {
        content:
          "I'm not sure how to help with that. Try asking about project status, tasks, milestones, or team members.",
        suggestedActions: [
          {
            label: 'Project status',
            action: 'query',
            payload: { query: 'What is the project status?' },
          },
          {
            label: 'Overdue tasks',
            action: 'query',
            payload: { query: 'What tasks are overdue?' },
          },
          {
            label: 'This week',
            action: 'query',
            payload: { query: "What's due this week?" },
          },
        ],
      };
  }
}

/**
 * Handle project status queries
 */
async function handleProjectStatusQuery(
  message: string,
  context: ProjectContext,
): Promise<BotResponse> {
  const projectId = context.projectId;

  if (!projectId) {
    // Get list of active projects for the user
    const projects = await prisma.project.findMany({
      where: {
        tenantId: context.tenantId,
        status: { in: ['PLANNING', 'IN_PROGRESS'] },
        OR: [
          { ownerId: context.userId },
          { members: { some: { userId: context.userId } } },
        ],
      },
      select: { id: true, name: true, status: true, healthStatus: true },
      take: 10,
    });

    if (projects.length === 0) {
      return {
        content:
          "You don't have any active projects. Would you like to create one?",
        suggestedActions: [
          {
            label: 'Create project',
            action: 'navigate',
            payload: { path: '/projects/new' },
          },
        ],
      };
    }

    return {
      content:
        'Which project would you like to check? Here are your active projects:',
      suggestedActions: projects.map((p) => ({
        label: `${p.name} (${p.healthStatus})`,
        action: 'setProjectContext',
        payload: { projectId: p.id, projectName: p.name },
      })),
    };
  }

  // Get project status
  const status = await getProjectStatus(projectId);

  // Calculate derived values
  const totalTasks = Object.values(status.taskCounts).reduce(
    (sum: number, count: number) => sum + count,
    0,
  );
  const doneTasks = status.taskCounts['DONE'] || 0;
  const inProgressTasks = status.taskCounts['IN_PROGRESS'] || 0;
  const overdueTasks = status.overdueTasks.length;
  const completionRate =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const completedMilestones = status.upcomingMilestones.filter(
    (m: { status: string }) => m.status === 'COMPLETED',
  ).length;
  const totalMilestones = status.upcomingMilestones.length;
  const upcomingMilestones = status.upcomingMilestones.filter(
    (m: { status: string }) => m.status !== 'COMPLETED',
  ).length;

  const healthEmoji: Record<string, string> = {
    ON_TRACK: '🟢',
    AT_RISK: '🟡',
    OFF_TRACK: '🔴',
  };

  const summary = `${healthEmoji[status.healthStatus] || '⚪'} **${context.projectName || 'Project'}** is ${status.healthStatus.replace('_', ' ')}.

**Tasks**: ${doneTasks}/${totalTasks} completed (${completionRate}%)
- In Progress: ${inProgressTasks}
- Overdue: ${overdueTasks}

**Milestones**: ${completedMilestones}/${totalMilestones} completed
${upcomingMilestones > 0 ? `- ${upcomingMilestones} upcoming` : ''}`;

  return {
    content: summary,
    suggestedActions: [
      {
        label: 'View tasks',
        action: 'navigate',
        payload: { path: `/projects/${projectId}?tab=tasks` },
      },
      {
        label: 'Generate report',
        action: 'generateReport',
        payload: { projectId },
      },
      {
        label: 'See risks',
        action: 'query',
        payload: { query: 'What are the project risks?' },
      },
    ],
    metadata: { status },
  };
}

/**
 * Handle task status queries
 */
async function handleTaskStatusQuery(
  message: string,
  context: ProjectContext,
): Promise<BotResponse> {
  const lowerMessage = message.toLowerCase();

  // Determine which tasks to show
  let statusFilter: string[] = [];
  let title = 'Tasks';

  if (lowerMessage.includes('overdue')) {
    title = 'Overdue Tasks';
  } else if (lowerMessage.includes('blocked')) {
    title = 'Blocked Tasks';
  } else if (lowerMessage.includes('in progress')) {
    statusFilter = ['IN_PROGRESS'];
    title = 'Tasks In Progress';
  } else if (
    lowerMessage.includes('todo') ||
    lowerMessage.includes('pending')
  ) {
    statusFilter = ['TODO', 'BACKLOG'];
    title = 'Pending Tasks';
  }

  const whereClause: Record<string, unknown> = {
    tenantId: context.tenantId,
    ...(context.projectId && { projectId: context.projectId }),
  };

  if (statusFilter.length > 0) {
    whereClause.status = { in: statusFilter };
  }

  // Check for overdue separately
  if (lowerMessage.includes('overdue')) {
    whereClause.dueDate = { lt: new Date() };
    whereClause.status = { notIn: ['DONE'] };
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      project: { select: { name: true } },
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    take: 10,
  });

  if (tasks.length === 0) {
    return {
      content: `No ${title.toLowerCase()} found.`,
      suggestedActions: [
        { label: 'Create a task', action: 'createTask', payload: {} },
        {
          label: 'View all tasks',
          action: 'navigate',
          payload: { path: '/projects?tab=tasks' },
        },
      ],
    };
  }

  const taskList = tasks
    .map((t) => {
      const dueStr = t.dueDate
        ? ` (due ${t.dueDate.toLocaleDateString()})`
        : '';
      return `- **${t.title}** [${t.status}]${dueStr}`;
    })
    .join('\n');

  return {
    content: `**${title}** (${tasks.length}):\n\n${taskList}`,
    suggestedActions: [
      {
        label: 'View details',
        action: 'navigate',
        payload: {
          path: context.projectId
            ? `/projects/${context.projectId}?tab=tasks`
            : '/tasks',
        },
      },
      { label: 'Add a task', action: 'createTask', payload: {} },
    ],
    metadata: { tasks },
  };
}

/**
 * Handle task creation intent
 */
async function handleTaskCreateIntent(
  message: string,
  _context: ProjectContext,
): Promise<BotResponse> {
  // Extract task details from message using AI
  const extraction = await extractTaskDetails(message);

  if (!extraction.title) {
    return {
      content: 'I can help you create a task. What should the task be called?',
      expectingInput: 'task_title',
    };
  }

  const preview = {
    title: extraction.title,
    description: extraction.description,
    priority: extraction.priority || 'P3',
    dueDate: extraction.dueDate,
  };

  return {
    content: `I'll create this task:\n\n**${preview.title}**\n${preview.description || ''}\n\nPriority: ${preview.priority}\nDue: ${preview.dueDate ? new Date(preview.dueDate).toLocaleDateString() : 'Not set'}`,
    suggestedActions: [
      { label: 'Create task', action: 'confirmTaskCreate', payload: preview },
      { label: 'Edit details', action: 'editTaskDetails', payload: preview },
      { label: 'Cancel', action: 'cancel', payload: {} },
    ],
  };
}

/**
 * Extract task details from natural language
 */
async function extractTaskDetails(message: string): Promise<{
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  assignee?: string;
}> {
  try {
    const response = await llmService.complete(
      `Extract task details from this request:
"${message}"

Return JSON only:
{
  "title": "Task title (required, extract main action)",
  "description": "Detailed description (optional)",
  "priority": "P1|P2|P3|P4 (optional, P1=urgent, P4=low)",
  "dueDate": "ISO date string if mentioned (optional)",
  "assignee": "Name if mentioned (optional)"
}`,
      { maxTokens: 200, temperature: 0.1 },
    );

    return JSON.parse(response.content);
  } catch {
    // Try to extract title from message
    const words = message
      .replace(/^(add|create|make|new)\s+(a\s+)?task\s*/i, '')
      .trim();
    return { title: words || undefined };
  }
}

/**
 * Handle milestone status queries
 */
async function handleMilestoneStatusQuery(
  _message: string,
  context: ProjectContext,
): Promise<BotResponse> {
  const milestones = await prisma.milestone.findMany({
    where: {
      tenantId: context.tenantId,
      ...(context.projectId && { projectId: context.projectId }),
    },
    select: {
      id: true,
      name: true,
      status: true,
      dueDate: true,
      project: { select: { name: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 10,
  });

  if (milestones.length === 0) {
    return {
      content: 'No milestones found.',
      suggestedActions: [
        {
          label: 'Create milestone',
          action: 'navigate',
          payload: {
            path: context.projectId
              ? `/projects/${context.projectId}?tab=milestones`
              : '/projects',
          },
        },
      ],
    };
  }

  const statusEmoji: Record<string, string> = {
    NOT_STARTED: '⚪',
    IN_PROGRESS: '🔵',
    COMPLETED: '✅',
    DELAYED: '🔴',
  };

  const milestoneList = milestones
    .map((m) => {
      const emoji = statusEmoji[m.status] || '⚪';
      const dueStr = m.dueDate
        ? ` (due ${m.dueDate.toLocaleDateString()})`
        : '';
      return `${emoji} **${m.name}**${dueStr}`;
    })
    .join('\n');

  return {
    content: `**Milestones** (${milestones.length}):\n\n${milestoneList}`,
    suggestedActions: [
      {
        label: 'View details',
        action: 'navigate',
        payload: {
          path: context.projectId
            ? `/projects/${context.projectId}?tab=milestones`
            : '/milestones',
        },
      },
    ],
    metadata: { milestones },
  };
}

/**
 * Handle team queries
 */
async function handleTeamQuery(
  _message: string,
  context: ProjectContext,
): Promise<BotResponse> {
  if (!context.projectId) {
    return {
      content: 'Please select a project first to see the team.',
      suggestedActions: [
        {
          label: 'Select project',
          action: 'query',
          payload: { query: 'Show my projects' },
        },
      ],
    };
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId: context.projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const owner = await prisma.project.findUnique({
    where: { id: context.projectId },
    select: { owner: { select: { id: true, name: true, email: true } } },
  });

  const teamList = [
    `- **${owner?.owner.name}** (Owner)`,
    ...members.map((m) => `- **${m.user.name}** (${m.role})`),
  ].join('\n');

  return {
    content: `**Team Members**:\n\n${teamList}`,
    suggestedActions: [
      {
        label: 'Manage team',
        action: 'navigate',
        payload: { path: `/projects/${context.projectId}?tab=team` },
      },
    ],
  };
}

/**
 * Handle schedule queries
 */
async function handleScheduleQuery(
  message: string,
  context: ProjectContext,
): Promise<BotResponse> {
  const lowerMessage = message.toLowerCase();

  const startDate = new Date();
  let endDate = new Date();
  let periodLabel = 'This week';

  if (lowerMessage.includes('today')) {
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59);
    periodLabel = 'Today';
  } else if (lowerMessage.includes('tomorrow')) {
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59);
    periodLabel = 'Tomorrow';
  } else if (lowerMessage.includes('next week')) {
    const dayOfWeek = startDate.getDay();
    const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
    startDate.setDate(startDate.getDate() + daysUntilMonday);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    periodLabel = 'Next week';
  } else {
    // Default to this week
    const dayOfWeek = startDate.getDay();
    const daysUntilSunday = 7 - dayOfWeek;
    endDate.setDate(endDate.getDate() + daysUntilSunday);
  }

  const tasks = await prisma.task.findMany({
    where: {
      tenantId: context.tenantId,
      ...(context.projectId && { projectId: context.projectId }),
      dueDate: { gte: startDate, lte: endDate },
      status: { notIn: ['DONE'] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      priority: true,
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }],
    take: 15,
  });

  if (tasks.length === 0) {
    return {
      content: `No tasks due ${periodLabel.toLowerCase()}.`,
      suggestedActions: [
        {
          label: 'View all tasks',
          action: 'query',
          payload: { query: 'Show all tasks' },
        },
      ],
    };
  }

  const taskList = tasks
    .map((t) => {
      const dueStr = t.dueDate ? t.dueDate.toLocaleDateString() : '';
      return `- **${t.title}** [${t.priority}] - ${dueStr}`;
    })
    .join('\n');

  return {
    content: `**${periodLabel}** (${tasks.length} tasks due):\n\n${taskList}`,
    suggestedActions: [
      {
        label: 'View calendar',
        action: 'navigate',
        payload: { path: '/calendar' },
      },
    ],
    metadata: { tasks, period: { start: startDate, end: endDate } },
  };
}

/**
 * Handle report request
 */
async function handleReportRequest(
  _message: string,
  context: ProjectContext,
): Promise<BotResponse> {
  if (!context.projectId) {
    return {
      content: 'Please select a project to generate a report.',
      suggestedActions: [
        {
          label: 'Select project',
          action: 'query',
          payload: { query: 'Show my projects' },
        },
      ],
    };
  }

  return {
    content: 'What type of report would you like to generate?',
    suggestedActions: [
      {
        label: 'Weekly summary',
        action: 'generateReport',
        payload: { projectId: context.projectId, type: 'weekly' },
      },
      {
        label: 'Status report',
        action: 'generateReport',
        payload: { projectId: context.projectId, type: 'status' },
      },
      {
        label: 'Task breakdown',
        action: 'generateReport',
        payload: { projectId: context.projectId, type: 'tasks' },
      },
    ],
  };
}

/**
 * Handle project creation intent
 */
async function handleProjectCreateIntent(
  _message: string,
  _context: ProjectContext,
): Promise<BotResponse> {
  return {
    content:
      "I'll help you create a new project. Let me redirect you to the project setup wizard.",
    suggestedActions: [
      {
        label: 'Create project',
        action: 'navigate',
        payload: { path: '/projects/new' },
      },
      { label: 'Cancel', action: 'cancel', payload: {} },
    ],
  };
}
