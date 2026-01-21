/**
 * Intake Analytics Router
 *
 * Handles basic and enhanced analytics endpoints
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import { prisma } from '../../prisma/client';
import * as intakeService from './intake.service';
import * as analyticsService from './analytics';

const router = Router();

// ============================================================================
// BASIC ANALYTICS
// ============================================================================

/**
 * GET /api/intake/:configId/analytics
 * Get intake analytics
 */
router.get(
  '/:configId/analytics',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : new Date();

    const analytics = await intakeService.getIntakeAnalytics(configId, {
      start: startDate,
      end: endDate,
    });

    res.json(analytics);
  },
);

// ============================================================================
// ENHANCED ANALYTICS (Phase 3)
// ============================================================================

/**
 * GET /api/intake/:configId/analytics/dashboard
 * Get comprehensive intake analytics
 */
router.get(
  '/:configId/analytics/dashboard',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : new Date();
    const formId = req.query.formId ? Number(req.query.formId) : undefined;

    try {
      const analytics = await analyticsService.getIntakeAnalytics(configId, {
        startDate,
        endDate,
        formId,
      });
      res.json({ data: analytics });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  },
);

/**
 * GET /api/intake/:configId/analytics/suggestions
 * Get AI-powered optimization suggestions
 */
router.get(
  '/:configId/analytics/suggestions',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : new Date();

    try {
      const suggestions = await analyticsService.getOptimizationSuggestions(
        configId,
        { startDate, endDate },
      );
      res.json({ data: suggestions });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({ error: 'Failed to get optimization suggestions' });
    }
  },
);

/**
 * GET /api/intake/forms/:formId/analytics/dropoff
 * Get drop-off analysis for a specific form
 */
router.get(
  '/forms/:formId/analytics/dropoff',
  async (req: AuthenticatedRequest<{ formId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const formId = Number(req.params.formId);
    if (Number.isNaN(formId)) {
      res.status(400).json({ error: 'Invalid form ID' });
      return;
    }

    // Get configId from form
    const form = await prisma.intakeForm.findUnique({
      where: { id: formId },
      select: { configId: true },
    });

    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    try {
      const analysis = await analyticsService.getDropOffAnalysis(
        form.configId,
        formId,
      );
      res.json({ data: analysis });
    } catch (error) {
      console.error('Drop-off analysis error:', error);
      res.status(500).json({ error: 'Failed to get drop-off analysis' });
    }
  },
);

/**
 * GET /api/intake/:configId/analytics/export
 * Export analytics report
 */
router.get(
  '/:configId/analytics/export',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : new Date();
    const format = (req.query.format as 'csv' | 'json') || 'csv';

    try {
      const report = await analyticsService.exportAnalyticsReport(
        configId,
        { startDate, endDate },
        format,
      );

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="intake-analytics.json"',
        );
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="intake-analytics.csv"',
        );
      }

      res.send(report);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Failed to export analytics' });
    }
  },
);

export default router;
