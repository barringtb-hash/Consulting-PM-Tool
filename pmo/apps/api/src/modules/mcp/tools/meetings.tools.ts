/**
 * MCP Tools for Meeting operations
 *
 * Provides MCP-compatible tools for querying and managing meetings
 */

import { z } from 'zod';
import { prisma } from '../../../prisma/client';

/**
 * Tool definitions for meeting operations
 */
export const meetingTools = [
  {
    name: 'query_meetings',
    description:
      'Search and filter meetings. Returns a list of meetings matching the criteria.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'Filter by project ID',
        },
        clientId: {
          type: 'number',
          description: 'Filter by client ID (via project)',
        },
        category: {
          type: 'string',
          enum: ['SALES', 'DELIVERY', 'INTERNAL'],
          description: 'Filter by meeting category',
        },
        startDate: {
          type: 'string',
          description: 'Filter meetings on or after this date (ISO format)',
        },
        endDate: {
          type: 'string',
          description: 'Filter meetings on or before this date (ISO format)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of meetings to return (default: 20)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_meeting',
    description:
      'Get detailed information about a specific meeting, including notes and decisions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        meetingId: {
          type: 'number',
          description: 'The ID of the meeting to retrieve',
        },
      },
      required: ['meetingId'],
    },
  },
  {
    name: 'create_meeting',
    description: 'Create a new meeting for a project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'The project ID to create the meeting in',
        },
        title: {
          type: 'string',
          description: 'Meeting title',
        },
        date: {
          type: 'string',
          description: 'Meeting date (ISO format)',
        },
        time: {
          type: 'string',
          description: 'Meeting time (e.g., "10:00 AM")',
        },
        category: {
          type: 'string',
          enum: ['SALES', 'DELIVERY', 'INTERNAL'],
          description: 'Meeting category',
        },
        notes: {
          type: 'string',
          description: 'Meeting notes',
        },
        decisions: {
          type: 'string',
          description: 'Key decisions made during the meeting',
        },
        risks: {
          type: 'string',
          description: 'Risks identified during the meeting',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of attendee names',
        },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'update_meeting',
    description: 'Update an existing meeting with notes, decisions, or risks.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        meetingId: {
          type: 'number',
          description: 'The ID of the meeting to update',
        },
        title: {
          type: 'string',
          description: 'Updated meeting title',
        },
        notes: {
          type: 'string',
          description: 'Updated meeting notes',
        },
        decisions: {
          type: 'string',
          description: 'Updated decisions',
        },
        risks: {
          type: 'string',
          description: 'Updated risks',
        },
      },
      required: ['meetingId'],
    },
  },
  {
    name: 'get_recent_meetings',
    description:
      'Get the most recent meetings across all projects, useful for catching up.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 7)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of meetings to return (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'prepare_meeting_brief',
    description:
      'Generate a meeting brief for a client, including recent activity, open tasks, and project status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientId: {
          type: 'number',
          description: 'The client ID to prepare the brief for',
        },
      },
      required: ['clientId'],
    },
  },
];

/**
 * Zod schemas for validation
 */
const queryMeetingsSchema = z.object({
  projectId: z.number().optional(),
  clientId: z.number().optional(),
  category: z.enum(['SALES', 'DELIVERY', 'INTERNAL']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
});

const getMeetingSchema = z.object({
  meetingId: z.number(),
});

const createMeetingSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1),
  date: z.string().optional(),
  time: z.string().optional().default('12:00 PM'),
  category: z.enum(['SALES', 'DELIVERY', 'INTERNAL']).optional(),
  notes: z.string().optional(),
  decisions: z.string().optional(),
  risks: z.string().optional(),
  attendees: z.array(z.string()).optional().default([]),
});

const updateMeetingSchema = z.object({
  meetingId: z.number(),
  title: z.string().optional(),
  notes: z.string().optional(),
  decisions: z.string().optional(),
  risks: z.string().optional(),
});

const recentMeetingsSchema = z.object({
  days: z.number().min(1).max(90).optional().default(7),
  limit: z.number().min(1).max(50).optional().default(10),
});

const meetingBriefSchema = z.object({
  clientId: z.number(),
});

/**
 * Execute a meeting tool
 */
export async function executeMeetingTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (toolName) {
      case 'query_meetings': {
        const parsed = queryMeetingsSchema.parse(args);

        const meetings = await prisma.meeting.findMany({
          where: {
            AND: [
              parsed.projectId ? { projectId: parsed.projectId } : {},
              parsed.clientId ? { project: { clientId: parsed.clientId } } : {},
              parsed.category ? { category: parsed.category } : {},
              parsed.startDate
                ? { date: { gte: new Date(parsed.startDate) } }
                : {},
              parsed.endDate ? { date: { lte: new Date(parsed.endDate) } } : {},
            ],
          },
          take: parsed.limit,
          orderBy: { date: 'desc' },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                client: { select: { id: true, name: true } },
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
                  count: meetings.length,
                  meetings: meetings.map((m) => ({
                    id: m.id,
                    title: m.title,
                    date: m.date,
                    category: m.category,
                    project: m.project,
                    hasNotes: !!m.notes,
                    hasDecisions: !!m.decisions,
                    hasRisks: !!m.risks,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'get_meeting': {
        const parsed = getMeetingSchema.parse(args);
        const meeting = await prisma.meeting.findUnique({
          where: { id: parsed.meetingId },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                client: { select: { id: true, name: true } },
              },
            },
          },
        });

        if (!meeting) {
          return {
            content: [{ type: 'text', text: 'Meeting not found' }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(meeting, null, 2),
            },
          ],
        };
      }

      case 'create_meeting': {
        const parsed = createMeetingSchema.parse(args);
        const meeting = await prisma.meeting.create({
          data: {
            title: parsed.title,
            projectId: parsed.projectId,
            date: parsed.date ? new Date(parsed.date) : new Date(),
            time: parsed.time,
            category: parsed.category,
            notes: parsed.notes,
            decisions: parsed.decisions,
            risks: parsed.risks,
            attendees: parsed.attendees,
          },
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Meeting created successfully', meeting },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'update_meeting': {
        const parsed = updateMeetingSchema.parse(args);
        const { meetingId, ...updateData } = parsed;

        const meeting = await prisma.meeting.update({
          where: { id: meetingId },
          data: updateData,
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Meeting updated successfully', meeting },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'get_recent_meetings': {
        const parsed = recentMeetingsSchema.parse(args);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parsed.days);

        const meetings = await prisma.meeting.findMany({
          where: {
            date: { gte: startDate },
          },
          take: parsed.limit,
          orderBy: { date: 'desc' },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                client: { select: { id: true, name: true } },
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
                  count: meetings.length,
                  lookbackDays: parsed.days,
                  meetings: meetings.map((m) => ({
                    id: m.id,
                    title: m.title,
                    date: m.date,
                    category: m.category,
                    project: m.project,
                    notesSummary: m.notes
                      ? m.notes.substring(0, 200) + '...'
                      : null,
                    decisions: m.decisions,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'prepare_meeting_brief': {
        const parsed = meetingBriefSchema.parse(args);

        // Get client info
        const client = await prisma.client.findUnique({
          where: { id: parsed.clientId },
          include: {
            contacts: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        if (!client) {
          return {
            content: [{ type: 'text', text: 'Client not found' }],
            isError: true,
          };
        }

        // Get active projects
        const projects = await prisma.project.findMany({
          where: {
            clientId: parsed.clientId,
            status: { in: ['PLANNING', 'IN_PROGRESS'] },
          },
          include: {
            _count: {
              select: { tasks: true },
            },
          },
        });

        // Get open tasks across all client projects
        const projectIds = projects.map((p) => p.id);
        const openTasks = await prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            status: { in: ['BACKLOG', 'IN_PROGRESS', 'BLOCKED'] },
          },
          take: 10,
          orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
          include: {
            project: { select: { name: true } },
          },
        });

        // Get recent meetings
        const recentMeetings = await prisma.meeting.findMany({
          where: {
            projectId: { in: projectIds },
          },
          take: 5,
          orderBy: { date: 'desc' },
          select: {
            id: true,
            title: true,
            date: true,
            decisions: true,
            risks: true,
          },
        });

        const brief = {
          client: {
            id: client.id,
            name: client.name,
            industry: client.industry,
            aiMaturity: client.aiMaturity,
            notes: client.notes,
          },
          contacts: client.contacts,
          activeProjects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            healthStatus: p.healthStatus,
            taskCount: p._count.tasks,
          })),
          priorityTasks: openTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            project: t.project.name,
          })),
          recentMeetings: recentMeetings.map((m) => ({
            id: m.id,
            title: m.title,
            date: m.date,
            keyDecisions: m.decisions,
            openRisks: m.risks,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(brief, null, 2),
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
