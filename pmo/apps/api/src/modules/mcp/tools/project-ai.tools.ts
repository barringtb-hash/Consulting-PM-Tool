/**
 * MCP Tools for Project AI Operations
 *
 * Provides MCP-compatible tools for AI-powered project analysis including:
 * - Health analysis and predictions
 * - Smart reminders
 * - Auto-scheduling
 * - Document generation
 * - RAID extraction (Risks, Action Items, Issues, Decisions)
 */

import { z } from 'zod';
import { prisma } from '../../../prisma/client';
import { healthPredictionService } from '../../ai-projects/services/health-prediction.service';
import { smartRemindersService } from '../../ai-projects/services/smart-reminders.service';
import { autoSchedulingService } from '../../ai-projects/services/auto-scheduling.service';
import {
  documentGeneratorService,
  type DocumentType,
} from '../../ai-projects/services/document-generator.service';
import { riskExtractionService } from '../../ai-projects/services/risk-extraction.service';

/**
 * Tool definitions for project AI operations
 */
export const projectAITools = [
  {
    name: 'get_project_health',
    description:
      'Get comprehensive AI-powered health analysis for a project including health score (0-100), risk factors, concerns, and recommendations',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID to analyze',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'predict_project_health',
    description:
      'Predict future project health using ML analysis. Returns predicted status, confidence level, risk factors, and recommendations',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        predictionWindowDays: {
          type: 'number',
          description: 'Days to look ahead (default: 14)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_smart_reminders',
    description:
      'Get pending AI-generated reminders for the current user, optionally filtered by project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'Optional: filter by project',
        },
        limit: {
          type: 'number',
          description: 'Max reminders to return (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'generate_project_schedule',
    description:
      'Generate an optimized AI schedule for project tasks considering dependencies and team availability',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        startDate: {
          type: 'string',
          description: 'Start date (ISO format)',
        },
        respectDependencies: {
          type: 'boolean',
          description: 'Consider task dependencies (default: true)',
        },
        considerAvailability: {
          type: 'boolean',
          description: 'Consider team availability (default: true)',
        },
        allowWeekends: {
          type: 'boolean',
          description: 'Allow weekend scheduling (default: false)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'generate_project_document',
    description:
      'Generate a project document using AI (charter, SOW, status report, executive summary, closure report)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        documentType: {
          type: 'string',
          enum: [
            'PROJECT_CHARTER',
            'STATEMENT_OF_WORK',
            'EXECUTIVE_SUMMARY',
            'STATUS_REPORT',
            'CLOSURE_REPORT',
          ],
          description: 'Type of document to generate',
        },
        additionalContext: {
          type: 'string',
          description: 'Additional context for generation',
        },
      },
      required: ['projectId', 'documentType'],
    },
  },
  {
    name: 'extract_raid_from_meeting',
    description:
      'Extract Risks, Action Items, Issues, and Decisions from meeting notes using AI',
    inputSchema: {
      type: 'object' as const,
      properties: {
        meetingId: {
          type: 'number',
          description: 'Meeting ID with notes to analyze',
        },
      },
      required: ['meetingId'],
    },
  },
  {
    name: 'get_raid_summary',
    description:
      'Get RAID (Risks, Action Items, Issues, Decisions) summary for a project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_project_risks',
    description:
      'Get all risks for a project with optional filtering by status and severity',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        status: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Filter by status (IDENTIFIED, ANALYZING, MITIGATING, MONITORING, RESOLVED)',
        },
        severity: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)',
        },
        limit: {
          type: 'number',
          description: 'Max risks to return (default: 20)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_project_documents',
    description: 'List all AI-generated documents for a project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
      },
      required: ['projectId'],
    },
  },
];

/**
 * Zod schemas for validation
 */
const getProjectHealthSchema = z.object({
  projectId: z.number(),
  _tenantId: z.string().optional(),
  _userId: z.number().optional(),
});

const predictHealthSchema = z.object({
  projectId: z.number(),
  predictionWindowDays: z.number().min(1).max(90).optional().default(14),
  _tenantId: z.string().optional(),
  _userId: z.number().optional(),
});

const getSmartRemindersSchema = z.object({
  projectId: z.number().optional(),
  limit: z.number().min(1).max(50).optional().default(10),
  _tenantId: z.string().optional(),
  _userId: z.number().optional(),
});

const generateScheduleSchema = z.object({
  projectId: z.number(),
  startDate: z.string().optional(),
  respectDependencies: z.boolean().optional().default(true),
  considerAvailability: z.boolean().optional().default(true),
  allowWeekends: z.boolean().optional().default(false),
  _tenantId: z.string().optional(),
  _userId: z.number().optional(),
});

const generateDocumentSchema = z.object({
  projectId: z.number(),
  documentType: z.enum([
    'PROJECT_CHARTER',
    'STATEMENT_OF_WORK',
    'EXECUTIVE_SUMMARY',
    'STATUS_REPORT',
    'CLOSURE_REPORT',
  ]),
  additionalContext: z.string().optional(),
  _tenantId: z.string().optional(),
  _userId: z.number().optional(),
});

const extractRaidSchema = z.object({
  meetingId: z.number(),
  _tenantId: z.string().optional(),
  _userId: z.number().optional(),
});

const getRaidSummarySchema = z.object({
  projectId: z.number(),
  _tenantId: z.string().optional(),
  _userId: z.number().optional(),
});

const getProjectRisksSchema = z.object({
  projectId: z.number(),
  status: z.array(z.string()).optional(),
  severity: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  _tenantId: z.string().optional(),
  _userId: z.number().optional(),
});

const getProjectDocumentsSchema = z.object({
  projectId: z.number(),
  _tenantId: z.string().optional(),
  _userId: z.number().optional(),
});

/**
 * Execute a project AI tool
 */
export async function executeProjectAITool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    // Extract tenantId from args - in MCP context this should be injected
    const tenantId = (args._tenantId as string) || 'default';

    switch (toolName) {
      case 'get_project_health': {
        const parsed = getProjectHealthSchema.parse(args);

        // Get project with related data
        const project = await prisma.project.findFirst({
          where: {
            id: parsed.projectId,
            ...(tenantId !== 'default' ? { tenantId } : {}),
          },
          include: {
            tasks: {
              select: {
                id: true,
                status: true,
                priority: true,
                dueDate: true,
              },
            },
            milestones: {
              select: {
                id: true,
                status: true,
                dueDate: true,
              },
            },
            projectRisks: {
              where: { status: { not: 'RESOLVED' } },
              select: {
                id: true,
                title: true,
                severity: true,
                status: true,
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

        // Calculate health metrics
        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter(
          (t) => t.status === 'DONE',
        ).length;
        const overdueTasks = project.tasks.filter(
          (t) =>
            t.dueDate &&
            new Date(t.dueDate) < new Date() &&
            t.status !== 'DONE',
        ).length;
        const blockedTasks = project.tasks.filter(
          (t) => t.status === 'BLOCKED',
        ).length;
        const p0Tasks = project.tasks.filter(
          (t) => t.priority === 'P0' && t.status !== 'DONE',
        ).length;

        const completionRate =
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const healthScore = Math.max(
          0,
          Math.min(
            100,
            completionRate - overdueTasks * 5 - blockedTasks * 10 - p0Tasks * 3,
          ),
        );

        // Build concerns array
        const concerns: string[] = [];
        if (overdueTasks > 0) {
          concerns.push(
            `${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`,
          );
        }
        if (blockedTasks > 0) {
          concerns.push(
            `${blockedTasks} blocked task${blockedTasks > 1 ? 's' : ''}`,
          );
        }
        if (p0Tasks > 0) {
          concerns.push(
            `${p0Tasks} critical (P0) task${p0Tasks > 1 ? 's' : ''} pending`,
          );
        }
        if (project.projectRisks.length > 0) {
          const criticalRisks = project.projectRisks.filter(
            (r) => r.severity === 'CRITICAL' || r.severity === 'HIGH',
          ).length;
          if (criticalRisks > 0) {
            concerns.push(
              `${criticalRisks} high/critical risk${criticalRisks > 1 ? 's' : ''}`,
            );
          }
        }

        // Build recommendations
        const recommendations: string[] = [];
        if (overdueTasks > 0) {
          recommendations.push(
            'Address overdue tasks immediately by reassigning or adjusting deadlines',
          );
        }
        if (blockedTasks > 0) {
          recommendations.push(
            'Schedule a blockers review meeting to resolve dependencies',
          );
        }
        if (p0Tasks > 0) {
          recommendations.push(
            'Focus team capacity on P0 tasks to reduce critical backlog',
          );
        }
        if (completionRate < 30 && totalTasks > 5) {
          recommendations.push(
            'Consider breaking down large tasks into smaller deliverables',
          );
        }

        const result = {
          projectId: project.id,
          projectName: project.name,
          healthScore: Math.round(healthScore),
          currentStatus: project.healthStatus || 'UNKNOWN',
          metrics: {
            totalTasks,
            completedTasks,
            overdueTasks,
            blockedTasks,
            p0Tasks,
            completionRate: Math.round(completionRate),
            totalMilestones: project.milestones.length,
            openRisks: project.projectRisks.length,
          },
          concerns,
          recommendations,
          activeRisks: project.projectRisks.slice(0, 5).map((r) => ({
            title: r.title,
            severity: r.severity,
            status: r.status,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'predict_project_health': {
        const parsed = predictHealthSchema.parse(args);

        try {
          const prediction = await healthPredictionService.predictHealth(
            parsed.projectId,
            tenantId,
            parsed.predictionWindowDays,
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    projectId: prediction.projectId,
                    currentHealth: prediction.currentHealth,
                    predictedHealth: prediction.predictedHealth,
                    confidence: Math.round(prediction.confidence * 100) + '%',
                    predictionWindow: prediction.predictionWindow,
                    riskFactors: prediction.riskFactors
                      .slice(0, 5)
                      .map((f) => ({
                        factor: f.factor,
                        severity: f.severity,
                        trend: f.trend,
                        description: f.description,
                      })),
                    recommendations: prediction.recommendations.slice(0, 5),
                    validUntil: prediction.validUntil.toISOString(),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error predicting health: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'get_smart_reminders': {
        const parsed = getSmartRemindersSchema.parse(args);

        if (!parsed._userId) {
          return {
            content: [{ type: 'text', text: 'User ID required for reminders' }],
            isError: true,
          };
        }

        // Get pending reminders
        const reminders = await smartRemindersService.getPendingReminders(
          parsed._userId,
          tenantId,
          parsed.limit,
        );

        // Filter by project if specified
        const filteredReminders = parsed.projectId
          ? reminders.filter((r) => r.projectId === parsed.projectId)
          : reminders;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: filteredReminders.length,
                  reminders: filteredReminders.map((r) => ({
                    id: r.id,
                    type: r.type,
                    priority: r.priority,
                    title: r.title,
                    message: r.message,
                    projectId: r.projectId,
                    actionUrl: r.actionUrl,
                    scheduledFor: r.scheduledFor.toISOString(),
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'generate_project_schedule': {
        const parsed = generateScheduleSchema.parse(args);

        try {
          const schedule = await autoSchedulingService.scheduleProject(
            {
              projectId: parsed.projectId,
              startDate: parsed.startDate
                ? new Date(parsed.startDate)
                : undefined,
              respectDependencies: parsed.respectDependencies,
              considerAvailability: parsed.considerAvailability,
              allowWeekends: parsed.allowWeekends,
              workingHoursPerDay: 8,
            },
            tenantId,
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    projectId: schedule.projectId,
                    estimatedEndDate: schedule.estimatedEndDate.toISOString(),
                    scheduledTasks: schedule.scheduledTasks
                      .slice(0, 20)
                      .map((t) => ({
                        taskId: t.taskId,
                        title: t.title,
                        scheduledStart: t.scheduledStart.toISOString(),
                        scheduledEnd: t.scheduledEnd.toISOString(),
                        estimatedHours: t.estimatedHours,
                        dependsOn: t.dependsOn,
                      })),
                    unscheduledTasks: schedule.unscheduledTasks,
                    warnings: schedule.warnings,
                    criticalPathTasks: schedule.criticalPath.length,
                    utilizationByMember: schedule.utilizationByMember,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error generating schedule: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'generate_project_document': {
        const parsed = generateDocumentSchema.parse(args);

        try {
          const document = await documentGeneratorService.generateDocument(
            parsed.projectId,
            tenantId,
            parsed.documentType as DocumentType,
            parsed.additionalContext
              ? { customFields: { context: parsed.additionalContext } }
              : undefined,
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    documentId: document.id,
                    projectId: document.projectId,
                    type: document.type,
                    title: document.title,
                    wordCount: document.metadata.wordCount,
                    generatedAt: document.metadata.generatedAt.toISOString(),
                    version: document.metadata.version,
                    sections: document.sections.map((s) => ({
                      id: s.id,
                      title: s.title,
                      contentPreview:
                        s.content.slice(0, 100) +
                        (s.content.length > 100 ? '...' : ''),
                    })),
                    message: `Document "${document.title}" generated successfully`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error generating document: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'extract_raid_from_meeting': {
        const parsed = extractRaidSchema.parse(args);

        try {
          const result = await riskExtractionService.extractFromMeeting(
            parsed.meetingId,
            tenantId,
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    meetingId: result.meetingId,
                    projectId: result.projectId,
                    extractedAt: result.extractedAt.toISOString(),
                    summary: result.summary,
                    risks: result.risks.map((r) => ({
                      title: r.title,
                      severity: r.severity,
                      category: r.category,
                      mitigation: r.mitigation,
                      confidence: r.confidence,
                    })),
                    actionItems: result.actionItems.map((a) => ({
                      title: a.title,
                      assignee: a.assignee,
                      dueDate: a.dueDate,
                      priority: a.priority,
                      confidence: a.confidence,
                    })),
                    decisions: result.decisions.map((d) => ({
                      decision: d.decision,
                      impact: d.impact,
                      madeBy: d.madeBy,
                      confidence: d.confidence,
                    })),
                    totals: {
                      risks: result.risks.length,
                      actionItems: result.actionItems.length,
                      decisions: result.decisions.length,
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error extracting RAID: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'get_raid_summary': {
        const parsed = getRaidSummarySchema.parse(args);

        // Get counts for each RAID category using raw SQL
        // This approach is used because the tenant extension causes TypeScript issues
        // with some Prisma models
        const projectId = parsed.projectId;

        const [risksResult, actionItemsResult, decisionsResult, issuesResult] =
          await Promise.all([
            prisma.projectRisk.count({
              where: {
                projectId,
                ...(tenantId !== 'default' ? { tenantId } : {}),
                status: { not: 'RESOLVED' },
              },
            }),
            prisma.$queryRaw<[{ count: bigint }]>`
              SELECT COUNT(*) as count FROM "ActionItem"
              WHERE project_id = ${projectId}
              AND status NOT IN ('COMPLETED', 'CANCELLED')
            `,
            prisma.$queryRaw<[{ count: bigint }]>`
              SELECT COUNT(*) as count FROM "Decision"
              WHERE project_id = ${projectId}
            `,
            prisma.$queryRaw<[{ count: bigint }]>`
              SELECT COUNT(*) as count FROM "ProjectIssue"
              WHERE project_id = ${projectId}
              AND status NOT IN ('RESOLVED', 'CLOSED')
            `,
          ]);

        const risks = risksResult;
        const actionItems = Number(actionItemsResult[0]?.count ?? 0);
        const decisions = Number(decisionsResult[0]?.count ?? 0);
        const issues = Number(issuesResult[0]?.count ?? 0);

        // Get severity breakdown for risks
        const risksBySeverity = await prisma.projectRisk.groupBy({
          by: ['severity'],
          where: {
            projectId,
            ...(tenantId !== 'default' ? { tenantId } : {}),
            status: { not: 'RESOLVED' },
          },
          _count: true,
        });

        // Get recent items
        const recentRisks = await prisma.projectRisk.findMany({
          where: {
            projectId,
            ...(tenantId !== 'default' ? { tenantId } : {}),
            status: { not: 'RESOLVED' },
          },
          select: { title: true, severity: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        });

        const recentActionsResult = await prisma.$queryRaw<
          { title: string; priority: string; due_date: Date | null }[]
        >`
          SELECT title, priority, due_date FROM "ActionItem"
          WHERE project_id = ${projectId}
          AND status NOT IN ('COMPLETED', 'CANCELLED')
          ORDER BY created_at DESC
          LIMIT 3
        `;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  projectId: parsed.projectId,
                  summary: {
                    openRisks: risks,
                    openActionItems: actionItems,
                    totalDecisions: decisions,
                    openIssues: issues,
                  },
                  risksBySeverity: risksBySeverity.reduce(
                    (acc, r) => {
                      acc[r.severity] = r._count;
                      return acc;
                    },
                    {} as Record<string, number>,
                  ),
                  recentRisks,
                  recentActionItems: recentActionsResult.map((a) => ({
                    title: a.title,
                    priority: a.priority,
                    dueDate: a.due_date?.toISOString(),
                  })),
                  healthIndicator:
                    risks === 0 && actionItems === 0 && issues === 0
                      ? 'healthy'
                      : risks > 5 || issues > 3
                        ? 'needs_attention'
                        : 'moderate',
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'get_project_risks': {
        const parsed = getProjectRisksSchema.parse(args);

        try {
          const risks = await riskExtractionService.getProjectRisks(
            parsed.projectId,
            tenantId,
            {
              status: parsed.status,
              severity: parsed.severity,
              limit: parsed.limit,
            },
          );

          // Also get trend analysis
          const trends = await riskExtractionService.analyzeRiskTrends(
            parsed.projectId,
            tenantId,
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    projectId: parsed.projectId,
                    count: risks.length,
                    risks: risks.map((r) => ({
                      title: r.title,
                      description: r.description,
                      severity: r.severity,
                      category: r.category,
                      mitigation: r.mitigation,
                    })),
                    trends: {
                      totalRisks: trends.totalRisks,
                      openRisks: trends.openRisks,
                      mitigatedRisks: trends.mitigatedRisks,
                      trend: trends.trend,
                      bySeverity: trends.bySeverity,
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting risks: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'get_project_documents': {
        const parsed = getProjectDocumentsSchema.parse(args);

        try {
          const documents = await documentGeneratorService.getProjectDocuments(
            parsed.projectId,
            tenantId,
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    projectId: parsed.projectId,
                    count: documents.length,
                    documents: documents.map((d) => ({
                      id: d.id,
                      type: d.type,
                      title: d.title,
                      createdAt: d.createdAt.toISOString(),
                      version: d.version,
                    })),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
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
