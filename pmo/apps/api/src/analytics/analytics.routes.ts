/**
 * Analytics Routes
 *
 * API endpoints for dashboards and analytics.
 */

import { Router, Response, NextFunction } from 'express';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../auth/auth.middleware';
import { requireTenant, type TenantRequest } from '../tenant/tenant.middleware';
import { getTenantContext } from '../tenant/tenant.context';
import * as analyticsService from './analytics.service';
import * as reportService from '../reports/report.service';
import * as exportService from '../reports/export.service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const dateRangeSchema = z.object({
  period: z
    .enum([
      'TODAY',
      'YESTERDAY',
      'THIS_WEEK',
      'LAST_WEEK',
      'THIS_MONTH',
      'LAST_MONTH',
      'THIS_QUARTER',
      'THIS_YEAR',
      'CUSTOM',
    ])
    .optional()
    .default('THIS_MONTH'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const reportConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['STANDARD', 'CUSTOM']).default('CUSTOM'),
  entity: z.enum(['opportunities', 'accounts', 'contacts', 'activities']),
  columns: z.array(
    z.object({
      field: z.string(),
      label: z.string(),
      type: z.enum([
        'STRING',
        'NUMBER',
        'DATE',
        'CURRENCY',
        'PERCENTAGE',
        'BOOLEAN',
      ]),
      aggregation: z.enum(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']).optional(),
      format: z.string().optional(),
      width: z.number().optional(),
    }),
  ),
  filters: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum([
          'EQUALS',
          'NOT_EQUALS',
          'CONTAINS',
          'GT',
          'GTE',
          'LT',
          'LTE',
          'BETWEEN',
          'IN',
        ]),
        value: z.unknown(),
      }),
    )
    .optional()
    .default([]),
  sortBy: z
    .object({
      column: z.string(),
      direction: z.enum(['ASC', 'DESC']),
    })
    .optional(),
  groupBy: z.array(z.string()).optional(),
});

// ============================================================================
// DASHBOARDS
// ============================================================================

/**
 * GET /api/analytics/dashboards/sales
 * Get sales dashboard data.
 */
router.get(
  '/analytics/dashboards/sales',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      const validation = dateRangeSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const { period, startDate, endDate } = validation.data;
      const dateRange = analyticsService.getDateRange(
        period,
        startDate && endDate
          ? { start: new Date(startDate), end: new Date(endDate) }
          : undefined,
      );

      const data = await analyticsService.getSalesDashboard(
        tenantId,
        dateRange,
      );

      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/analytics/dashboards/activity
 * Get activity dashboard data.
 */
router.get(
  '/analytics/dashboards/activity',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      const validation = dateRangeSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const { period, startDate, endDate } = validation.data;
      const dateRange = analyticsService.getDateRange(
        period,
        startDate && endDate
          ? { start: new Date(startDate), end: new Date(endDate) }
          : undefined,
      );

      const data = await analyticsService.getActivityDashboard(
        tenantId,
        dateRange,
      );

      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/analytics/dashboards/accounts
 * Get account dashboard data.
 */
router.get(
  '/analytics/dashboards/accounts',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const data = await analyticsService.getAccountDashboard(tenantId);

      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/analytics/dashboards/team
 * Get team dashboard data.
 */
router.get(
  '/analytics/dashboards/team',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      const validation = dateRangeSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const { period, startDate, endDate } = validation.data;
      const dateRange = analyticsService.getDateRange(
        period,
        startDate && endDate
          ? { start: new Date(startDate), end: new Date(endDate) }
          : undefined,
      );

      const data = await analyticsService.getTeamDashboard(tenantId, dateRange);

      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// METRICS
// ============================================================================

/**
 * GET /api/analytics/metrics
 * Get a specific metric value.
 */
router.get(
  '/analytics/metrics',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { entity, aggregation, field } = req.query;

      if (!entity || !aggregation) {
        return res.status(400).json({
          error: 'entity and aggregation are required',
        });
      }

      const value = await analyticsService.getMetricValue(
        tenantId,
        entity as string,
        aggregation as 'COUNT' | 'SUM' | 'AVG',
        field as string | undefined,
      );

      res.json({ data: { value } });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// REPORTS
// ============================================================================

/**
 * GET /api/analytics/reports
 * Get saved reports.
 */
router.get(
  '/analytics/reports',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const reports = await reportService.getSavedReports(tenantId);

      res.json({ data: reports });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/analytics/reports
 * Create a new saved report.
 */
router.post(
  '/analytics/reports',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      const validation = reportConfigSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const report = await reportService.saveReport(
        tenantId,
        req.userId!,
        validation.data,
      );

      res.status(201).json({ data: report });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/analytics/reports/:reportId
 * Get a saved report.
 */
router.get(
  '/analytics/reports/:reportId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const reportId = parseInt(req.params.reportId);

      const report = await reportService.getSavedReport(reportId, tenantId);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json({ data: report });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/analytics/reports/:reportId
 * Delete a saved report.
 */
router.delete(
  '/analytics/reports/:reportId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const reportId = parseInt(req.params.reportId);

      await reportService.deleteSavedReport(reportId, tenantId);

      res.json({ message: 'Report deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/analytics/reports/:reportId/execute
 * Execute a saved report.
 */
router.post(
  '/analytics/reports/:reportId/execute',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const reportId = parseInt(req.params.reportId);

      const report = await reportService.getSavedReport(reportId, tenantId);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const result = await reportService.executeReport(tenantId, report);

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/analytics/reports/adhoc
 * Execute an ad-hoc report without saving.
 */
router.post(
  '/analytics/reports/adhoc',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();

      const validation = reportConfigSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const config = {
        ...validation.data,
        id: 'adhoc',
        filters: validation.data.filters || [],
      };

      const result = await reportService.executeReport(tenantId, config);

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * POST /api/analytics/reports/:reportId/export
 * Export a report.
 */
router.post(
  '/analytics/reports/:reportId/export',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const reportId = parseInt(req.params.reportId);
      const { format } = req.body as { format?: string };

      if (!format || !['CSV', 'EXCEL', 'PDF'].includes(format)) {
        return res.status(400).json({
          error: 'Invalid format',
          message: 'Format must be CSV, EXCEL, or PDF',
        });
      }

      const report = await reportService.getSavedReport(reportId, tenantId);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const result = await reportService.executeReport(tenantId, report);

      let content: string;
      let contentType: string;
      let filename: string;

      switch (format) {
        case 'CSV':
          content = exportService.exportToCsv(result.columns, result.rows);
          contentType = 'text/csv';
          filename = `${report.name.replace(/\s+/g, '_')}.csv`;
          break;
        case 'EXCEL':
          content = exportService.generateExcelXml(result.columns, result.rows);
          contentType = 'application/vnd.ms-excel';
          filename = `${report.name.replace(/\s+/g, '_')}.xls`;
          break;
        case 'PDF':
          content = exportService.exportToPdfHtml(result.columns, result.rows, {
            format: 'PDF',
            title: report.name,
          });
          contentType = 'text/html';
          filename = `${report.name.replace(/\s+/g, '_')}.html`;
          break;
        default:
          content = '';
          contentType = 'text/plain';
          filename = 'report.txt';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(content);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/analytics/export
 * Export ad-hoc data.
 */
router.post(
  '/analytics/export',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext();
      const { format, config } = req.body as {
        format?: string;
        config?: unknown;
      };

      if (!format || !['CSV', 'EXCEL', 'PDF'].includes(format)) {
        return res.status(400).json({
          error: 'Invalid format',
          message: 'Format must be CSV, EXCEL, or PDF',
        });
      }

      const validation = reportConfigSchema.safeParse(config);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const reportConfig = {
        ...validation.data,
        id: 'export',
        filters: validation.data.filters || [],
      };

      const result = await reportService.executeReport(tenantId, reportConfig);

      let content: string;
      let contentType: string;
      let filename: string;

      switch (format) {
        case 'CSV':
          content = exportService.exportToCsv(result.columns, result.rows);
          contentType = 'text/csv';
          filename = 'export.csv';
          break;
        case 'EXCEL':
          content = exportService.generateExcelXml(result.columns, result.rows);
          contentType = 'application/vnd.ms-excel';
          filename = 'export.xls';
          break;
        case 'PDF':
          content = exportService.exportToPdfHtml(result.columns, result.rows, {
            format: 'PDF',
            title: validation.data.name,
          });
          contentType = 'text/html';
          filename = 'export.html';
          break;
        default:
          content = '';
          contentType = 'text/plain';
          filename = 'export.txt';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(content);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
