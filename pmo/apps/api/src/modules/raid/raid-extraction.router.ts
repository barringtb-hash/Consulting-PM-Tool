/**
 * RAID Extraction Router
 *
 * REST API endpoints for extracting RAID items from text.
 *
 * Routes:
 * - POST /meetings/:meetingId           - Extract RAID from meeting notes
 * - POST /text                          - Extract RAID from arbitrary text
 * - GET  /projects/:projectId/summary   - Get RAID summary for project
 * - GET  /projects/:projectId/trends    - Get RAID trends for project
 *
 * @module modules/raid
 */

import { Router, Response } from 'express';

import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { tenantMiddleware } from '../../tenant/tenant.middleware';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';
import { z } from 'zod';
import {
  raidExtractionOptionsSchema,
  extractFromTextSchema,
} from './validation/raid.schema';
import * as raidExtractionService from './services/raid-extraction.service';
import * as raidSummaryService from './services/raid-summary.service';
import * as actionItemService from './services/action-item.service';
import * as decisionService from './services/decision.service';
import * as projectIssueService from './services/project-issue.service';
import { prisma } from '../../prisma/client';
import { hasProjectAccess } from '../../utils/project-access';

// Schema for accepting extracted items
const extractedItemSchema = z.object({
  type: z.enum(['risk', 'action-item', 'issue', 'decision']),
  title: z.string().min(1),
  description: z.string().optional(),
  confidence: z.number().min(0).max(1),
  sourceText: z.string().optional(),
  suggestedOwner: z.string().optional(),
  suggestedPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  suggestedSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  suggestedDueDate: z.string().optional(),
});

const acceptExtractedItemsSchema = z.object({
  items: z.array(extractedItemSchema).min(1),
});

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

/**
 * Extract RAID items from meeting notes
 *
 * Uses LLM to analyze meeting notes and extract:
 * - Risks
 * - Action Items
 * - Issues
 * - Decisions
 */
router.post(
  '/meetings/:meetingId',
  async (req: AuthenticatedRequest<{ meetingId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const meetingId = Number(req.params.meetingId);
    if (Number.isNaN(meetingId)) {
      res.status(400).json({ error: 'Invalid meeting id' });
      return;
    }

    // Parse extraction options
    const optionsParsed = raidExtractionOptionsSchema.safeParse(req.body);
    const options = optionsParsed.success ? optionsParsed.data : undefined;

    const result = await raidExtractionService.extractFromMeeting(
      meetingId,
      req.userId,
      options,
    );

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'no_notes') {
        res.status(400).json({ error: 'Meeting has no notes to analyze' });
        return;
      }
    }

    // If autoSave option is set, save extracted risks to database
    if (options?.autoSave && 'risks' in result && result.risks.length > 0) {
      const tenantId = hasTenantContext() ? getTenantId() : undefined;
      if (tenantId) {
        const savedIds = await raidExtractionService.saveExtractedRisks(
          result.projectId,
          tenantId,
          result.risks,
          result.meetingId,
        );
        res.json({ ...result, savedRiskIds: savedIds });
        return;
      }
    }

    res.json(result);
  },
);

/**
 * Extract RAID items from arbitrary text
 */
router.post('/text', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = extractFromTextSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request data',
      details: parsed.error.format(),
    });
    return;
  }

  const { text, projectId, context, options } = parsed.data;

  const result = await raidExtractionService.extractFromText(
    text,
    projectId,
    req.userId,
    context,
    options,
  );

  if ('error' in result) {
    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }

  // If autoSave option is set, save extracted risks to database
  if (options?.autoSave && 'risks' in result && result.risks.length > 0) {
    const tenantId = hasTenantContext() ? getTenantId() : undefined;
    if (tenantId) {
      const savedIds = await raidExtractionService.saveExtractedRisks(
        result.projectId,
        tenantId,
        result.risks,
      );
      res.json({ ...result, savedRiskIds: savedIds });
      return;
    }
  }

  res.json(result);
});

/**
 * Get RAID summary for a project
 *
 * Returns aggregated counts, health indicators, and recommendations
 */
router.get(
  '/projects/:projectId/summary',
  async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.projectId);
    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    const result = await raidSummaryService.getSummary(projectId, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json(result);
  },
);

/**
 * Get RAID trends for a project
 *
 * Returns time-series data for RAID item counts
 */
router.get(
  '/projects/:projectId/trends',
  async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.projectId);
    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    const days = req.query.days ? Number(req.query.days) : 30;
    if (Number.isNaN(days) || days < 1 || days > 365) {
      res.status(400).json({ error: 'Invalid days parameter (1-365)' });
      return;
    }

    const result = await raidSummaryService.getTrends(
      projectId,
      req.userId,
      days,
    );

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json({ trends: result });
  },
);

/**
 * Accept extracted RAID items and save to database
 *
 * Accepts an array of extracted items and creates them as first-class entities
 */
router.post(
  '/projects/:projectId/accept',
  async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.projectId);
    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    // Validate request body
    const parsed = acceptExtractedItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request data',
        details: parsed.error.format(),
      });
      return;
    }

    // Validate project access
    const tenantId = hasTenantContext() ? getTenantId() : undefined;
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: {
        id: true,
        ownerId: true,
        isSharedWithTenant: true,
        visibility: true,
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!hasProjectAccess(project, req.userId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { items } = parsed.data;
    const created: unknown[] = [];
    const failed: { item: unknown; error: string }[] = [];

    // Process each item
    for (const item of items) {
      try {
        switch (item.type) {
          case 'action-item': {
            const result = await actionItemService.create(
              {
                projectId,
                title: item.title,
                description: item.description,
                sourceText: item.sourceText,
                priority: mapPriorityToActionItem(item.suggestedPriority),
                status: 'OPEN',
                dueDate: item.suggestedDueDate
                  ? new Date(item.suggestedDueDate)
                  : undefined,
                assigneeName: item.suggestedOwner,
              },
              req.userId,
            );
            if ('actionItem' in result) {
              created.push({ ...result.actionItem, type: 'action-item' });
            } else {
              failed.push({ item, error: result.error });
            }
            break;
          }

          case 'decision': {
            const result = await decisionService.create(
              {
                projectId,
                title: item.title,
                description: item.description,
                sourceText: item.sourceText,
                confidence: item.confidence,
                sourceType: 'AI_EXTRACTED',
                impact: mapPriorityToImpact(item.suggestedPriority),
                category: 'PROJECT',
                status: 'PENDING',
              },
              req.userId,
            );
            if ('decision' in result) {
              created.push({ ...result.decision, type: 'decision' });
            } else {
              failed.push({ item, error: result.error });
            }
            break;
          }

          case 'issue': {
            const result = await projectIssueService.create(
              {
                projectId,
                title: item.title,
                description: item.description ?? '',
                sourceText: item.sourceText,
                confidence: item.confidence,
                sourceType: 'AI_EXTRACTED',
                severity: item.suggestedSeverity ?? 'MEDIUM',
                reportedByName: item.suggestedOwner,
                affectedAreas: [],
                escalationLevel: 0,
                status: 'OPEN',
              },
              req.userId,
            );
            if ('issue' in result) {
              created.push({ ...result.issue, type: 'issue' });
            } else {
              failed.push({ item, error: result.error });
            }
            break;
          }

          case 'risk': {
            // Create risk directly using Prisma (no service)
            const risk = await prisma.projectRisk.create({
              data: {
                projectId,
                tenantId: tenantId ?? '',
                title: item.title,
                description: item.description ?? '',
                severity: mapPriorityToSeverity(item.suggestedSeverity),
                likelihood: 'POSSIBLE',
                status: 'IDENTIFIED',
                category: 'TECHNICAL',
                sourceType: 'AI_DETECTED',
                relatedQuote: item.sourceText,
                confidence: item.confidence,
              },
            });
            created.push({ ...risk, type: 'risk' });
            break;
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        failed.push({ item, error: errorMessage });
      }
    }

    res.json({ created, failed });
  },
);

// Helper functions for mapping frontend types to backend enums
function mapPriorityToActionItem(
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
): 'P0' | 'P1' | 'P2' {
  switch (priority) {
    case 'CRITICAL':
    case 'HIGH':
      return 'P0';
    case 'MEDIUM':
      return 'P1';
    case 'LOW':
    default:
      return 'P2';
  }
}

function mapPriorityToImpact(
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  return priority ?? 'MEDIUM';
}

function mapPriorityToSeverity(
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  return severity ?? 'MEDIUM';
}

export default router;
