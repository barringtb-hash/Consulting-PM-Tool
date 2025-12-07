/**
 * MCP Tools for Client operations
 *
 * Provides MCP-compatible tools for querying and managing clients
 */

import { z } from 'zod';
import { prisma } from '../../../prisma/client';

/**
 * Tool definitions for client operations
 */
export const clientTools = [
  {
    name: 'query_clients',
    description:
      'Search and filter clients. Returns a list of clients matching the criteria.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        search: {
          type: 'string',
          description: 'Search term to filter clients by name or industry',
        },
        industry: {
          type: 'string',
          description: 'Filter by industry',
        },
        companySize: {
          type: 'string',
          enum: ['MICRO', 'SMALL', 'MEDIUM'],
          description: 'Filter by company size',
        },
        aiMaturity: {
          type: 'string',
          enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'],
          description: 'Filter by AI maturity level',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of clients to return (default: 20)',
        },
        includeArchived: {
          type: 'boolean',
          description: 'Include archived clients (default: false)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_client',
    description:
      'Get detailed information about a specific client, including contacts and recent projects.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientId: {
          type: 'number',
          description: 'The ID of the client to retrieve',
        },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'create_client',
    description: 'Create a new client in the CRM.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Client company name',
        },
        industry: {
          type: 'string',
          description: 'Industry sector',
        },
        companySize: {
          type: 'string',
          enum: ['MICRO', 'SMALL', 'MEDIUM'],
          description: 'Company size category',
        },
        aiMaturity: {
          type: 'string',
          enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'],
          description: 'AI maturity level',
        },
        timezone: {
          type: 'string',
          description: 'Client timezone (e.g., America/New_York)',
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the client',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_client',
    description: 'Update an existing client.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clientId: {
          type: 'number',
          description: 'The ID of the client to update',
        },
        name: {
          type: 'string',
          description: 'Updated client name',
        },
        industry: {
          type: 'string',
          description: 'Updated industry',
        },
        companySize: {
          type: 'string',
          enum: ['MICRO', 'SMALL', 'MEDIUM'],
          description: 'Updated company size',
        },
        aiMaturity: {
          type: 'string',
          enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'],
          description: 'Updated AI maturity level',
        },
        notes: {
          type: 'string',
          description: 'Updated notes',
        },
      },
      required: ['clientId'],
    },
  },
];

/**
 * Zod schemas for validation
 */
const queryClientsSchema = z.object({
  search: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.enum(['MICRO', 'SMALL', 'MEDIUM']).optional(),
  aiMaturity: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  includeArchived: z.boolean().optional().default(false),
});

const getClientSchema = z.object({
  clientId: z.number(),
});

const createClientSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  companySize: z.enum(['MICRO', 'SMALL', 'MEDIUM']).optional(),
  aiMaturity: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  timezone: z.string().optional(),
  notes: z.string().optional(),
});

const updateClientSchema = z.object({
  clientId: z.number(),
  name: z.string().min(1).optional(),
  industry: z.string().optional(),
  companySize: z.enum(['MICRO', 'SMALL', 'MEDIUM']).optional(),
  aiMaturity: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  notes: z.string().optional(),
});

/**
 * Execute a client tool
 */
export async function executeClientTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (toolName) {
      case 'query_clients': {
        const parsed = queryClientsSchema.parse(args);
        const clients = await prisma.client.findMany({
          where: {
            AND: [
              parsed.search
                ? {
                    OR: [
                      {
                        name: { contains: parsed.search, mode: 'insensitive' },
                      },
                      {
                        industry: {
                          contains: parsed.search,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  }
                : {},
              parsed.industry ? { industry: parsed.industry } : {},
              parsed.companySize ? { companySize: parsed.companySize } : {},
              parsed.aiMaturity ? { aiMaturity: parsed.aiMaturity } : {},
              !parsed.includeArchived ? { archived: false } : {},
            ],
          },
          take: parsed.limit,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            industry: true,
            companySize: true,
            aiMaturity: true,
            archived: true,
            createdAt: true,
            _count: {
              select: {
                projects: true,
                contacts: true,
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
                  count: clients.length,
                  clients: clients.map((c) => ({
                    id: c.id,
                    name: c.name,
                    industry: c.industry,
                    companySize: c.companySize,
                    aiMaturity: c.aiMaturity,
                    archived: c.archived,
                    projectCount: c._count.projects,
                    contactCount: c._count.contacts,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'get_client': {
        const parsed = getClientSchema.parse(args);
        const client = await prisma.client.findUnique({
          where: { id: parsed.clientId },
          include: {
            contacts: {
              take: 10,
              orderBy: { createdAt: 'desc' },
            },
            projects: {
              take: 5,
              orderBy: { updatedAt: 'desc' },
              select: {
                id: true,
                name: true,
                status: true,
                healthStatus: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        });

        if (!client) {
          return {
            content: [{ type: 'text', text: 'Client not found' }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(client, null, 2),
            },
          ],
        };
      }

      case 'create_client': {
        const parsed = createClientSchema.parse(args);
        const client = await prisma.client.create({
          data: parsed,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Client created successfully', client },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'update_client': {
        const parsed = updateClientSchema.parse(args);
        const { clientId, ...updateData } = parsed;

        const client = await prisma.client.update({
          where: { id: clientId },
          data: updateData,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Client updated successfully', client },
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
