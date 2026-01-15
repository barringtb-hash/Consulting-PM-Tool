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
import {
  raidExtractionOptionsSchema,
  extractFromTextSchema,
} from './validation/raid.schema';
import * as raidExtractionService from './services/raid-extraction.service';
import * as raidSummaryService from './services/raid-summary.service';

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

export default router;
