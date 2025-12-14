/**
 * MCP Tools for Account operations
 *
 * Provides MCP-compatible tools for querying and managing CRM Accounts.
 * Accounts represent companies/organizations (prospects, customers, partners, etc.)
 */

import { z } from 'zod';
import { prisma } from '../../../prisma/client';

/**
 * Tool definitions for account operations
 */
export const accountTools = [
  {
    name: 'query_accounts',
    description:
      'Search and filter CRM accounts (companies/organizations). Returns a list of accounts matching the criteria.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        search: {
          type: 'string',
          description: 'Search term to filter accounts by name or industry',
        },
        industry: {
          type: 'string',
          description: 'Filter by industry',
        },
        type: {
          type: 'string',
          enum: [
            'PROSPECT',
            'CUSTOMER',
            'PARTNER',
            'COMPETITOR',
            'CHURNED',
            'OTHER',
          ],
          description: 'Filter by account type',
        },
        employeeCount: {
          type: 'string',
          enum: ['SOLO', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
          description: 'Filter by company size',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of accounts to return (default: 20)',
        },
        includeArchived: {
          type: 'boolean',
          description: 'Include archived accounts (default: false)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_account',
    description:
      'Get detailed information about a specific account, including contacts, opportunities, and recent activities.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        accountId: {
          type: 'number',
          description: 'The ID of the account to retrieve',
        },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'create_account',
    description: 'Create a new account in the CRM.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Account/company name',
        },
        industry: {
          type: 'string',
          description: 'Industry sector',
        },
        type: {
          type: 'string',
          enum: [
            'PROSPECT',
            'CUSTOMER',
            'PARTNER',
            'COMPETITOR',
            'CHURNED',
            'OTHER',
          ],
          description: 'Account type (default: PROSPECT)',
        },
        employeeCount: {
          type: 'string',
          enum: ['SOLO', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
          description: 'Company size category',
        },
        website: {
          type: 'string',
          description: 'Company website URL',
        },
        phone: {
          type: 'string',
          description: 'Main phone number',
        },
        ownerId: {
          type: 'number',
          description: 'ID of the user who owns this account',
        },
        tenantId: {
          type: 'string',
          description: 'Tenant ID for multi-tenant isolation',
        },
      },
      required: ['name', 'ownerId', 'tenantId'],
    },
  },
  {
    name: 'update_account',
    description: 'Update an existing account.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        accountId: {
          type: 'number',
          description: 'The ID of the account to update',
        },
        name: {
          type: 'string',
          description: 'Updated account name',
        },
        industry: {
          type: 'string',
          description: 'Updated industry',
        },
        type: {
          type: 'string',
          enum: [
            'PROSPECT',
            'CUSTOMER',
            'PARTNER',
            'COMPETITOR',
            'CHURNED',
            'OTHER',
          ],
          description: 'Updated account type',
        },
        employeeCount: {
          type: 'string',
          enum: ['SOLO', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
          description: 'Updated company size',
        },
        website: {
          type: 'string',
          description: 'Updated website URL',
        },
        phone: {
          type: 'string',
          description: 'Updated phone number',
        },
        healthScore: {
          type: 'number',
          description: 'Account health score (0-100)',
        },
      },
      required: ['accountId'],
    },
  },
];

/**
 * Zod schemas for validation
 */
const queryAccountsSchema = z.object({
  search: z.string().optional(),
  industry: z.string().optional(),
  type: z
    .enum(['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR', 'CHURNED', 'OTHER'])
    .optional(),
  employeeCount: z
    .enum(['SOLO', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'])
    .optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  includeArchived: z.boolean().optional().default(false),
});

const getAccountSchema = z.object({
  accountId: z.number(),
});

const createAccountSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  type: z
    .enum(['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR', 'CHURNED', 'OTHER'])
    .optional(),
  employeeCount: z
    .enum(['SOLO', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'])
    .optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  ownerId: z.number(),
  tenantId: z.string(),
});

const updateAccountSchema = z.object({
  accountId: z.number(),
  name: z.string().min(1).optional(),
  industry: z.string().optional(),
  type: z
    .enum(['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR', 'CHURNED', 'OTHER'])
    .optional(),
  employeeCount: z
    .enum(['SOLO', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'])
    .optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  healthScore: z.number().min(0).max(100).optional(),
});

/**
 * Execute an account tool
 */
export async function executeAccountTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (toolName) {
      case 'query_accounts': {
        const parsed = queryAccountsSchema.parse(args);
        const accounts = await prisma.account.findMany({
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
              parsed.type ? { type: parsed.type } : {},
              parsed.employeeCount
                ? { employeeCount: parsed.employeeCount }
                : {},
              !parsed.includeArchived ? { archived: false } : {},
            ],
          },
          take: parsed.limit,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            industry: true,
            type: true,
            employeeCount: true,
            healthScore: true,
            archived: true,
            createdAt: true,
            _count: {
              select: {
                crmContacts: true,
                opportunities: true,
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
                  count: accounts.length,
                  accounts: accounts.map((a) => ({
                    id: a.id,
                    name: a.name,
                    industry: a.industry,
                    type: a.type,
                    employeeCount: a.employeeCount,
                    healthScore: a.healthScore,
                    archived: a.archived,
                    contactCount: a._count.crmContacts,
                    opportunityCount: a._count.opportunities,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'get_account': {
        const parsed = getAccountSchema.parse(args);
        const account = await prisma.account.findUnique({
          where: { id: parsed.accountId },
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
            crmContacts: {
              take: 10,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                title: true,
                lifecycleStage: true,
              },
            },
            opportunities: {
              take: 5,
              orderBy: { updatedAt: 'desc' },
              select: {
                id: true,
                name: true,
                amount: true,
                probability: true,
                expectedCloseDate: true,
              },
            },
            parentAccount: {
              select: { id: true, name: true },
            },
          },
        });

        if (!account) {
          return {
            content: [{ type: 'text', text: 'Account not found' }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(account, null, 2),
            },
          ],
        };
      }

      case 'create_account': {
        const parsed = createAccountSchema.parse(args);
        const account = await prisma.account.create({
          data: {
            name: parsed.name,
            industry: parsed.industry,
            type: parsed.type || 'PROSPECT',
            employeeCount: parsed.employeeCount,
            website: parsed.website,
            phone: parsed.phone,
            ownerId: parsed.ownerId,
            tenantId: parsed.tenantId,
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Account created successfully', account },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'update_account': {
        const parsed = updateAccountSchema.parse(args);
        const { accountId, ...updateData } = parsed;

        const account = await prisma.account.update({
          where: { id: accountId },
          data: updateData,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Account updated successfully', account },
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
