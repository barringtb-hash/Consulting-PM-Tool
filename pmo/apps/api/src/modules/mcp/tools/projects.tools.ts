/**
 * MCP Tools for Project and Task operations
 *
 * Provides MCP-compatible tools for querying and managing projects and tasks,
 * including AI-powered project building from templates.
 */

import { z } from 'zod';
import { prisma } from '../../../prisma/client';
import {
  PROJECT_TEMPLATES,
  getProjectTemplate,
  calculateTemplateDates,
} from '../templates/project-templates';

/**
 * Tool definitions for project operations
 */
export const projectTools = [
  {
    name: 'query_projects',
    description:
      'Search and filter projects. Returns a list of projects matching the criteria.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientId: {
          type: 'number',
          description: 'Filter by client ID',
        },
        status: {
          type: 'string',
          enum: [
            'PLANNING',
            'IN_PROGRESS',
            'ON_HOLD',
            'COMPLETED',
            'CANCELLED',
          ],
          description: 'Filter by project status',
        },
        healthStatus: {
          type: 'string',
          enum: ['ON_TRACK', 'AT_RISK', 'OFF_TRACK'],
          description: 'Filter by project health status',
        },
        search: {
          type: 'string',
          description: 'Search term to filter projects by name',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of projects to return (default: 20)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_project',
    description:
      'Get detailed information about a specific project, including tasks and milestones.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project to retrieve',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'query_tasks',
    description: 'Search and filter tasks across projects.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'Filter by project ID',
        },
        status: {
          type: 'string',
          enum: ['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE'],
          description: 'Filter by task status',
        },
        priority: {
          type: 'string',
          enum: ['P0', 'P1', 'P2'],
          description: 'Filter by priority level',
        },
        ownerId: {
          type: 'number',
          description: 'Filter by owner user ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (default: 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task for a project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'The project ID to create the task in',
        },
        title: {
          type: 'string',
          description: 'Task title',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        priority: {
          type: 'string',
          enum: ['P0', 'P1', 'P2'],
          description: 'Task priority (default: P1)',
        },
        status: {
          type: 'string',
          enum: ['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE'],
          description: 'Task status (default: BACKLOG)',
        },
        ownerId: {
          type: 'number',
          description: 'User ID to assign the task to',
        },
        milestoneId: {
          type: 'number',
          description: 'Milestone ID to associate the task with',
        },
        dueDate: {
          type: 'string',
          description: 'Due date in ISO format',
        },
      },
      required: ['projectId', 'title', 'ownerId'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'number',
          description: 'The ID of the task to update',
        },
        title: {
          type: 'string',
          description: 'Updated task title',
        },
        description: {
          type: 'string',
          description: 'Updated task description',
        },
        priority: {
          type: 'string',
          enum: ['P0', 'P1', 'P2'],
          description: 'Updated priority',
        },
        status: {
          type: 'string',
          enum: ['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE'],
          description: 'Updated status',
        },
        ownerId: {
          type: 'number',
          description: 'Updated owner user ID',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'get_at_risk_projects',
    description:
      'Get all projects that are at risk or off track, useful for status reviews.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of projects to return (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_project',
    description:
      'Create a new project. Use this when the user wants to create a project from scratch without a template.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'The name of the project',
        },
        accountId: {
          type: 'number',
          description:
            'The account/client ID to associate the project with. If not provided, you should ask the user which account to use.',
        },
        startDate: {
          type: 'string',
          description:
            'Project start date in ISO format (e.g., "2024-01-15"). Defaults to today if not provided.',
        },
        endDate: {
          type: 'string',
          description: 'Project end date in ISO format (e.g., "2024-04-15")',
        },
        status: {
          type: 'string',
          enum: [
            'PLANNING',
            'IN_PROGRESS',
            'ON_HOLD',
            'COMPLETED',
            'CANCELLED',
          ],
          description: 'Initial project status (default: PLANNING)',
        },
        visibility: {
          type: 'string',
          enum: ['PRIVATE', 'TEAM', 'TENANT'],
          description:
            'Project visibility (default: TEAM). PRIVATE = only owner, TEAM = project members, TENANT = entire organization',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_project',
    description: 'Update an existing project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project to update',
        },
        name: {
          type: 'string',
          description: 'Updated project name',
        },
        status: {
          type: 'string',
          enum: [
            'PLANNING',
            'IN_PROGRESS',
            'ON_HOLD',
            'COMPLETED',
            'CANCELLED',
          ],
          description: 'Updated project status',
        },
        healthStatus: {
          type: 'string',
          enum: ['ON_TRACK', 'AT_RISK', 'OFF_TRACK'],
          description: 'Updated project health status',
        },
        startDate: {
          type: 'string',
          description: 'Updated start date in ISO format',
        },
        endDate: {
          type: 'string',
          description: 'Updated end date in ISO format',
        },
        visibility: {
          type: 'string',
          enum: ['PRIVATE', 'TEAM', 'TENANT'],
          description: 'Updated visibility setting',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_project_templates',
    description:
      'List available project templates. Use this to show the user what pre-built project structures are available.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['consulting', 'software', 'marketing', 'operations', 'general'],
          description: 'Filter templates by category',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_project_from_template',
    description:
      'Create a new project from a template. This creates the project with pre-defined milestones and tasks based on the selected template.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        templateId: {
          type: 'string',
          enum: [
            'software-implementation',
            'website-redesign',
            'ai-strategy-assessment',
            'process-improvement',
            'blank-project',
          ],
          description:
            'The template ID to use. Use list_project_templates to see available options.',
        },
        name: {
          type: 'string',
          description: 'The name for the new project',
        },
        accountId: {
          type: 'number',
          description:
            'The account/client ID to associate the project with. Required.',
        },
        startDate: {
          type: 'string',
          description:
            'Project start date in ISO format. Milestone and task dates will be calculated from this date. Defaults to today.',
        },
        visibility: {
          type: 'string',
          enum: ['PRIVATE', 'TEAM', 'TENANT'],
          description: 'Project visibility (default: TEAM)',
        },
      },
      required: ['templateId', 'name', 'accountId'],
    },
  },
  {
    name: 'create_milestone',
    description:
      'Create a new milestone for a project. Milestones are major project phases or deliverables.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'The project ID to create the milestone in',
        },
        name: {
          type: 'string',
          description: 'Milestone name',
        },
        description: {
          type: 'string',
          description: 'Milestone description',
        },
        dueDate: {
          type: 'string',
          description: 'Due date in ISO format',
        },
        status: {
          type: 'string',
          enum: ['NOT_STARTED', 'IN_PROGRESS', 'DONE'],
          description: 'Milestone status (default: NOT_STARTED)',
        },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'update_milestone',
    description: 'Update an existing milestone.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        milestoneId: {
          type: 'number',
          description: 'The ID of the milestone to update',
        },
        name: {
          type: 'string',
          description: 'Updated milestone name',
        },
        description: {
          type: 'string',
          description: 'Updated description',
        },
        dueDate: {
          type: 'string',
          description: 'Updated due date in ISO format',
        },
        status: {
          type: 'string',
          enum: ['NOT_STARTED', 'IN_PROGRESS', 'DONE'],
          description: 'Updated status',
        },
      },
      required: ['milestoneId'],
    },
  },
  {
    name: 'list_milestones',
    description: 'List all milestones for a project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'The project ID to list milestones for',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_subtask',
    description:
      'Create a subtask under an existing task. Subtasks help break down complex tasks into smaller steps.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        parentTaskId: {
          type: 'number',
          description: 'The ID of the parent task',
        },
        title: {
          type: 'string',
          description: 'Subtask title',
        },
        description: {
          type: 'string',
          description: 'Subtask description',
        },
        status: {
          type: 'string',
          enum: ['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE'],
          description: 'Subtask status (default: BACKLOG)',
        },
        dueDate: {
          type: 'string',
          description: 'Due date in ISO format',
        },
      },
      required: ['parentTaskId', 'title'],
    },
  },
  {
    name: 'bulk_create_tasks',
    description:
      'Create multiple tasks at once for a project. Useful when setting up a project with many tasks.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'The project ID to create tasks in',
        },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Task title',
              },
              description: {
                type: 'string',
                description: 'Task description',
              },
              priority: {
                type: 'string',
                enum: ['P0', 'P1', 'P2'],
                description: 'Task priority (default: P1)',
              },
              milestoneId: {
                type: 'number',
                description: 'Milestone ID to associate the task with',
              },
              dueDate: {
                type: 'string',
                description: 'Due date in ISO format',
              },
            },
            required: ['title'],
          },
          description: 'Array of tasks to create',
        },
      },
      required: ['projectId', 'tasks'],
    },
  },
];

/**
 * Zod schemas for validation
 */
const queryProjectsSchema = z.object({
  clientId: z.number().optional(),
  status: z
    .enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .optional(),
  healthStatus: z.enum(['ON_TRACK', 'AT_RISK', 'OFF_TRACK']).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const getProjectSchema = z.object({
  projectId: z.number(),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const queryTasksSchema = z.object({
  projectId: z.number().optional(),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  priority: z.enum(['P0', 'P1', 'P2']).optional(),
  ownerId: z.number().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const createTaskSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2']).optional().default('P1'),
  status: z
    .enum(['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE'])
    .optional()
    .default('BACKLOG'),
  ownerId: z.number(),
  milestoneId: z.number().optional(),
  dueDate: z.string().optional(),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const updateTaskSchema = z.object({
  taskId: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2']).optional(),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  ownerId: z.number().optional(),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const atRiskProjectsSchema = z.object({
  limit: z.number().min(1).max(50).optional().default(10),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const createProjectSchema = z.object({
  name: z.string().min(1),
  accountId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z
    .enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .optional()
    .default('PLANNING'),
  visibility: z.enum(['PRIVATE', 'TEAM', 'TENANT']).optional().default('TEAM'),
  _userId: z.number(), // Required: for ownership
});

const updateProjectSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1).optional(),
  status: z
    .enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .optional(),
  healthStatus: z.enum(['ON_TRACK', 'AT_RISK', 'OFF_TRACK']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'TENANT']).optional(),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const listProjectTemplatesSchema = z.object({
  category: z
    .enum(['consulting', 'software', 'marketing', 'operations', 'general'])
    .optional(),
});

const createProjectFromTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1),
  accountId: z.number(),
  startDate: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'TENANT']).optional().default('TEAM'),
  _userId: z.number(), // Required: for ownership
});

const createMilestoneSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z
    .enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE'])
    .optional()
    .default('NOT_STARTED'),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const updateMilestoneSchema = z.object({
  milestoneId: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE']).optional(),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const listMilestonesSchema = z.object({
  projectId: z.number(),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const createSubtaskSchema = z.object({
  parentTaskId: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z
    .enum(['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE'])
    .optional()
    .default('BACKLOG'),
  dueDate: z.string().optional(),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

const bulkCreateTasksSchema = z.object({
  projectId: z.number(),
  tasks: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(['P0', 'P1', 'P2']).optional().default('P1'),
      milestoneId: z.number().optional(),
      dueDate: z.string().optional(),
    }),
  ),
  _userId: z.number().optional(), // Internal: for ownership filtering
});

/**
 * Execute a project tool
 */
export async function executeProjectTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (toolName) {
      case 'query_projects': {
        const parsed = queryProjectsSchema.parse(args);
        const projects = await prisma.project.findMany({
          where: {
            AND: [
              // Show projects owned by user OR shared with tenant
              parsed._userId
                ? {
                    OR: [
                      { ownerId: parsed._userId },
                      { isSharedWithTenant: true },
                    ],
                  }
                : {},
              parsed.clientId ? { clientId: parsed.clientId } : {},
              parsed.status ? { status: parsed.status } : {},
              parsed.healthStatus ? { healthStatus: parsed.healthStatus } : {},
              parsed.search
                ? { name: { contains: parsed.search, mode: 'insensitive' } }
                : {},
            ],
          },
          take: parsed.limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            client: {
              select: { id: true, name: true },
            },
            _count: {
              select: { tasks: true, milestones: true },
            },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: projects.length,
                  projects: projects.map((p) => ({
                    id: p.id,
                    name: p.name,
                    status: p.status,
                    healthStatus: p.healthStatus,
                    client: p.client,
                    startDate: p.startDate,
                    endDate: p.endDate,
                    taskCount: p._count.tasks,
                    milestoneCount: p._count.milestones,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'get_project': {
        const parsed = getProjectSchema.parse(args);
        const project = await prisma.project.findUnique({
          where: { id: parsed.projectId },
          include: {
            client: {
              select: { id: true, name: true, industry: true },
            },
            tasks: {
              take: 20,
              orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
                owner: {
                  select: { id: true, name: true },
                },
              },
            },
            milestones: {
              orderBy: { dueDate: 'asc' },
              select: {
                id: true,
                name: true,
                status: true,
                dueDate: true,
              },
            },
          },
        });

        if (!project) {
          return {
            content: [{ type: 'text', text: 'Project not found' }],
            isError: true,
          };
        }

        // Check ownership if userId is provided (allow if owner or shared with tenant)
        if (
          parsed._userId &&
          project.ownerId !== parsed._userId &&
          !project.isSharedWithTenant
        ) {
          return {
            content: [{ type: 'text', text: 'Project not found' }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }

      case 'query_tasks': {
        const parsed = queryTasksSchema.parse(args);
        const tasks = await prisma.task.findMany({
          where: {
            AND: [
              // Filter by project ownership or shared with tenant if userId is provided
              parsed._userId
                ? {
                    project: {
                      OR: [
                        { ownerId: parsed._userId },
                        { isSharedWithTenant: true },
                      ],
                    },
                  }
                : {},
              parsed.projectId ? { projectId: parsed.projectId } : {},
              parsed.status ? { status: parsed.status } : {},
              parsed.priority ? { priority: parsed.priority } : {},
              parsed.ownerId ? { ownerId: parsed.ownerId } : {},
            ],
          },
          take: parsed.limit,
          orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
          include: {
            project: {
              select: { id: true, name: true },
            },
            owner: {
              select: { id: true, name: true },
            },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: tasks.length,
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    project: t.project,
                    owner: t.owner,
                    dueDate: t.dueDate,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'create_task': {
        const parsed = createTaskSchema.parse(args);

        // Verify project ownership or shared access if userId is provided
        if (parsed._userId) {
          const project = await prisma.project.findUnique({
            where: { id: parsed.projectId },
            select: { ownerId: true, isSharedWithTenant: true },
          });
          if (
            !project ||
            (project.ownerId !== parsed._userId && !project.isSharedWithTenant)
          ) {
            return {
              content: [{ type: 'text', text: 'Project not found' }],
              isError: true,
            };
          }
        }

        const task = await prisma.task.create({
          data: {
            title: parsed.title,
            description: parsed.description,
            priority: parsed.priority,
            status: parsed.status,
            projectId: parsed.projectId,
            ownerId: parsed.ownerId,
            milestoneId: parsed.milestoneId,
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
          },
          include: {
            project: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true } },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Task created successfully', task },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'update_task': {
        const parsed = updateTaskSchema.parse(args);
        const { taskId, _userId, ...updateData } = parsed;

        // Verify task/project ownership or shared access if userId is provided
        if (_userId) {
          const existingTask = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
              project: { select: { ownerId: true, isSharedWithTenant: true } },
            },
          });
          if (
            !existingTask ||
            (existingTask.project.ownerId !== _userId &&
              !existingTask.project.isSharedWithTenant)
          ) {
            return {
              content: [{ type: 'text', text: 'Task not found' }],
              isError: true,
            };
          }
        }

        const task = await prisma.task.update({
          where: { id: taskId },
          data: updateData,
          include: {
            project: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true } },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Task updated successfully', task },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'get_at_risk_projects': {
        const parsed = atRiskProjectsSchema.parse(args);
        const projects = await prisma.project.findMany({
          where: {
            // Filter by owner if userId is provided
            ...(parsed._userId ? { ownerId: parsed._userId } : {}),
            healthStatus: { in: ['AT_RISK', 'OFF_TRACK'] },
            status: { in: ['PLANNING', 'IN_PROGRESS'] },
          },
          take: parsed.limit,
          orderBy: [{ healthStatus: 'desc' }, { updatedAt: 'desc' }],
          include: {
            client: { select: { id: true, name: true } },
            tasks: {
              where: { status: 'BLOCKED' },
              take: 5,
              select: { id: true, title: true, priority: true },
            },
            _count: {
              select: {
                tasks: true,
                milestones: true,
              },
            },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: projects.length,
                  projects: projects.map((p) => ({
                    id: p.id,
                    name: p.name,
                    healthStatus: p.healthStatus,
                    status: p.status,
                    client: p.client,
                    blockedTasks: p.tasks,
                    taskCount: p._count.tasks,
                    milestoneCount: p._count.milestones,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'create_project': {
        const parsed = createProjectSchema.parse(args);

        const project = await prisma.project.create({
          data: {
            name: parsed.name,
            accountId: parsed.accountId,
            ownerId: parsed._userId,
            status: parsed.status,
            visibility: parsed.visibility,
            startDate: parsed.startDate ? new Date(parsed.startDate) : new Date(),
            endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
            healthStatus: 'ON_TRACK',
            isSharedWithTenant: parsed.visibility === 'TENANT',
          },
          include: {
            account: { select: { id: true, name: true } },
            client: { select: { id: true, name: true } },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'Project created successfully',
                  project: {
                    id: project.id,
                    name: project.name,
                    status: project.status,
                    healthStatus: project.healthStatus,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    account: project.account,
                    client: project.client,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'update_project': {
        const parsed = updateProjectSchema.parse(args);
        const { projectId, _userId, ...updateData } = parsed;

        // Verify project ownership or shared access if userId is provided
        if (_userId) {
          const existingProject = await prisma.project.findUnique({
            where: { id: projectId },
            select: { ownerId: true, isSharedWithTenant: true },
          });
          if (
            !existingProject ||
            (existingProject.ownerId !== _userId &&
              !existingProject.isSharedWithTenant)
          ) {
            return {
              content: [{ type: 'text', text: 'Project not found' }],
              isError: true,
            };
          }
        }

        const project = await prisma.project.update({
          where: { id: projectId },
          data: {
            ...updateData,
            startDate: updateData.startDate
              ? new Date(updateData.startDate)
              : undefined,
            endDate: updateData.endDate
              ? new Date(updateData.endDate)
              : undefined,
            statusUpdatedAt:
              updateData.healthStatus || updateData.status ? new Date() : undefined,
            isSharedWithTenant:
              updateData.visibility === 'TENANT' ? true : undefined,
          },
          include: {
            account: { select: { id: true, name: true } },
            client: { select: { id: true, name: true } },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Project updated successfully', project },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'list_project_templates': {
        const parsed = listProjectTemplatesSchema.parse(args);
        const templates = parsed.category
          ? PROJECT_TEMPLATES.filter((t) => t.category === parsed.category)
          : PROJECT_TEMPLATES;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: templates.length,
                  templates: templates.map((t) => ({
                    id: t.id,
                    name: t.name,
                    description: t.description,
                    category: t.category,
                    defaultDurationDays: t.defaultDurationDays,
                    milestoneCount: t.milestones.length,
                    taskCount: t.milestones.reduce(
                      (sum, m) => sum + m.tasks.length,
                      0,
                    ),
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'create_project_from_template': {
        const parsed = createProjectFromTemplateSchema.parse(args);
        const template = getProjectTemplate(parsed.templateId);

        if (!template) {
          return {
            content: [
              {
                type: 'text',
                text: `Template not found: ${parsed.templateId}. Use list_project_templates to see available templates.`,
              },
            ],
            isError: true,
          };
        }

        const startDate = parsed.startDate
          ? new Date(parsed.startDate)
          : new Date();
        const { endDate, milestones } = calculateTemplateDates(
          template,
          startDate,
        );

        // Create the project
        const project = await prisma.project.create({
          data: {
            name: parsed.name,
            accountId: parsed.accountId,
            ownerId: parsed._userId,
            status: 'PLANNING',
            visibility: parsed.visibility,
            startDate,
            endDate,
            healthStatus: 'ON_TRACK',
            isSharedWithTenant: parsed.visibility === 'TENANT',
          },
        });

        // Create milestones and tasks
        let totalTasksCreated = 0;
        let totalSubtasksCreated = 0;
        const createdMilestones = [];

        for (const milestoneData of milestones) {
          const milestone = await prisma.milestone.create({
            data: {
              projectId: project.id,
              name: milestoneData.name,
              description: milestoneData.description,
              dueDate: milestoneData.dueDate,
              status: 'NOT_STARTED',
            },
          });
          createdMilestones.push(milestone);

          // Create tasks for this milestone
          for (const taskData of milestoneData.tasks) {
            const task = await prisma.task.create({
              data: {
                projectId: project.id,
                milestoneId: milestone.id,
                ownerId: parsed._userId,
                title: taskData.title,
                description: taskData.description,
                priority: taskData.priority,
                status: 'BACKLOG',
                dueDate: taskData.dueDate,
              },
            });
            totalTasksCreated++;

            // Create subtasks if any
            if (taskData.subtasks && taskData.subtasks.length > 0) {
              for (const subtaskData of taskData.subtasks) {
                await prisma.task.create({
                  data: {
                    projectId: project.id,
                    milestoneId: milestone.id,
                    parentTaskId: task.id,
                    ownerId: parsed._userId,
                    title: subtaskData.title,
                    description: subtaskData.description,
                    status: 'BACKLOG',
                  },
                });
                totalSubtasksCreated++;
              }
            }
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: `Project created successfully from template "${template.name}"`,
                  project: {
                    id: project.id,
                    name: project.name,
                    status: project.status,
                    startDate: project.startDate,
                    endDate: project.endDate,
                  },
                  summary: {
                    templateUsed: template.name,
                    milestonesCreated: createdMilestones.length,
                    tasksCreated: totalTasksCreated,
                    subtasksCreated: totalSubtasksCreated,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'create_milestone': {
        const parsed = createMilestoneSchema.parse(args);

        // Verify project ownership or shared access if userId is provided
        if (parsed._userId) {
          const project = await prisma.project.findUnique({
            where: { id: parsed.projectId },
            select: { ownerId: true, isSharedWithTenant: true },
          });
          if (
            !project ||
            (project.ownerId !== parsed._userId && !project.isSharedWithTenant)
          ) {
            return {
              content: [{ type: 'text', text: 'Project not found' }],
              isError: true,
            };
          }
        }

        const milestone = await prisma.milestone.create({
          data: {
            projectId: parsed.projectId,
            name: parsed.name,
            description: parsed.description,
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
            status: parsed.status,
          },
          include: {
            project: { select: { id: true, name: true } },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Milestone created successfully', milestone },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'update_milestone': {
        const parsed = updateMilestoneSchema.parse(args);
        const { milestoneId, _userId, ...updateData } = parsed;

        // Verify milestone/project ownership or shared access if userId is provided
        if (_userId) {
          const existingMilestone = await prisma.milestone.findUnique({
            where: { id: milestoneId },
            include: {
              project: { select: { ownerId: true, isSharedWithTenant: true } },
            },
          });
          if (
            !existingMilestone ||
            (existingMilestone.project.ownerId !== _userId &&
              !existingMilestone.project.isSharedWithTenant)
          ) {
            return {
              content: [{ type: 'text', text: 'Milestone not found' }],
              isError: true,
            };
          }
        }

        const milestone = await prisma.milestone.update({
          where: { id: milestoneId },
          data: {
            ...updateData,
            dueDate: updateData.dueDate
              ? new Date(updateData.dueDate)
              : undefined,
          },
          include: {
            project: { select: { id: true, name: true } },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Milestone updated successfully', milestone },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'list_milestones': {
        const parsed = listMilestonesSchema.parse(args);

        // Verify project ownership or shared access if userId is provided
        if (parsed._userId) {
          const project = await prisma.project.findUnique({
            where: { id: parsed.projectId },
            select: { ownerId: true, isSharedWithTenant: true },
          });
          if (
            !project ||
            (project.ownerId !== parsed._userId && !project.isSharedWithTenant)
          ) {
            return {
              content: [{ type: 'text', text: 'Project not found' }],
              isError: true,
            };
          }
        }

        const milestones = await prisma.milestone.findMany({
          where: { projectId: parsed.projectId },
          orderBy: { dueDate: 'asc' },
          include: {
            _count: { select: { tasks: true } },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: milestones.length,
                  milestones: milestones.map((m) => ({
                    id: m.id,
                    name: m.name,
                    description: m.description,
                    status: m.status,
                    dueDate: m.dueDate,
                    taskCount: m._count.tasks,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'create_subtask': {
        const parsed = createSubtaskSchema.parse(args);

        // Get parent task and verify access
        const parentTask = await prisma.task.findUnique({
          where: { id: parsed.parentTaskId },
          include: {
            project: { select: { id: true, ownerId: true, isSharedWithTenant: true } },
          },
        });

        if (!parentTask) {
          return {
            content: [{ type: 'text', text: 'Parent task not found' }],
            isError: true,
          };
        }

        if (
          parsed._userId &&
          parentTask.project.ownerId !== parsed._userId &&
          !parentTask.project.isSharedWithTenant
        ) {
          return {
            content: [{ type: 'text', text: 'Parent task not found' }],
            isError: true,
          };
        }

        // Check if parent task already has a parent (no nested subtasks)
        if (parentTask.parentTaskId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Cannot create subtask under another subtask. Only single-level nesting is supported.',
              },
            ],
            isError: true,
          };
        }

        const subtask = await prisma.task.create({
          data: {
            projectId: parentTask.project.id,
            parentTaskId: parsed.parentTaskId,
            milestoneId: parentTask.milestoneId,
            ownerId: parsed._userId || parentTask.ownerId,
            title: parsed.title,
            description: parsed.description,
            status: parsed.status,
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
          },
          include: {
            parentTask: { select: { id: true, title: true } },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Subtask created successfully', subtask },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'bulk_create_tasks': {
        const parsed = bulkCreateTasksSchema.parse(args);

        // Verify project ownership or shared access if userId is provided
        if (parsed._userId) {
          const project = await prisma.project.findUnique({
            where: { id: parsed.projectId },
            select: { ownerId: true, isSharedWithTenant: true },
          });
          if (
            !project ||
            (project.ownerId !== parsed._userId && !project.isSharedWithTenant)
          ) {
            return {
              content: [{ type: 'text', text: 'Project not found' }],
              isError: true,
            };
          }
        }

        const createdTasks = [];
        for (const taskData of parsed.tasks) {
          const task = await prisma.task.create({
            data: {
              projectId: parsed.projectId,
              ownerId: parsed._userId || 0, // Will need a valid ownerId
              title: taskData.title,
              description: taskData.description,
              priority: taskData.priority,
              milestoneId: taskData.milestoneId,
              status: 'BACKLOG',
              dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
            },
          });
          createdTasks.push(task);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: `Successfully created ${createdTasks.length} tasks`,
                  tasks: createdTasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    priority: t.priority,
                    status: t.status,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
}
