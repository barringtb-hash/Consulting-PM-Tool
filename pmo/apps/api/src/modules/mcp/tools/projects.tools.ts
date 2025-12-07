/**
 * MCP Tools for Project and Task operations
 *
 * Provides MCP-compatible tools for querying and managing projects and tasks
 */

import { z } from 'zod';
import { prisma } from '../../../prisma/client';

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
});

const getProjectSchema = z.object({
  projectId: z.number(),
});

const queryTasksSchema = z.object({
  projectId: z.number().optional(),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  priority: z.enum(['P0', 'P1', 'P2']).optional(),
  ownerId: z.number().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
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
});

const updateTaskSchema = z.object({
  taskId: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['P0', 'P1', 'P2']).optional(),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  ownerId: z.number().optional(),
});

const atRiskProjectsSchema = z.object({
  limit: z.number().min(1).max(50).optional().default(10),
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
        const { taskId, ...updateData } = parsed;

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
