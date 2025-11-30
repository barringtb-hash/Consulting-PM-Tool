/**
 * Tool 3.2: Compliance Monitoring System Router
 *
 * API endpoints for compliance monitoring, rules, violations, audits, and risk assessments
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { ViolationStatus, AuditStatus, RiskLevel } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import * as complianceService from './compliance-monitor.service';
import {
  hasClientAccess,
  getClientIdFromComplianceMonitorConfig,
} from '../../auth/client-auth.helper';

const router = Router();

// ============ Validation Schemas ============

const createConfigSchema = z.object({
  industry: z.string().min(1).optional(),
  jurisdiction: z.string().optional(),
  organizationName: z.string().optional(),
  enableHipaa: z.boolean().optional(),
  enableSox: z.boolean().optional(),
  enableGdpr: z.boolean().optional(),
  enablePci: z.boolean().optional(),
  enableFinra: z.boolean().optional(),
  customFrameworks: z.array(z.string()).optional(),
  realTimeMonitoring: z.boolean().optional(),
  monitoringFrequency: z.string().optional(),
  alertThreshold: z.string().optional(),
  notificationEmails: z.array(z.string()).optional(),
  dataSourceConfigs: z.record(z.string(), z.any()).optional(),
});

const updateConfigSchema = z.object({
  industry: z.string().optional(),
  jurisdiction: z.string().optional(),
  organizationName: z.string().optional(),
  enableHipaa: z.boolean().optional(),
  enableSox: z.boolean().optional(),
  enableGdpr: z.boolean().optional(),
  enablePci: z.boolean().optional(),
  enableFinra: z.boolean().optional(),
  customFrameworks: z.array(z.string()).optional(),
  realTimeMonitoring: z.boolean().optional(),
  monitoringFrequency: z.string().optional(),
  alertThreshold: z.string().optional(),
  notificationEmails: z.array(z.string()).optional(),
  dataSourceConfigs: z.record(z.string(), z.any()).optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  framework: z.string().min(1),
  category: z.string().optional(),
  ruleType: z.string().min(1),
  ruleDefinition: z.record(z.string(), z.any()),
  severity: z.nativeEnum(RiskLevel).optional(),
  isRealtime: z.boolean().optional(),
  checkFrequency: z.string().optional(),
  autoRemediate: z.boolean().optional(),
  remediationAction: z.record(z.string(), z.any()).optional(),
});

const updateRuleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  ruleDefinition: z.record(z.string(), z.any()).optional(),
  severity: z.nativeEnum(RiskLevel).optional(),
  isRealtime: z.boolean().optional(),
  checkFrequency: z.string().optional(),
  autoRemediate: z.boolean().optional(),
  remediationAction: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

const createViolationSchema = z.object({
  ruleId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.nativeEnum(RiskLevel),
  sourceSystem: z.string().optional(),
  sourceReference: z.string().optional(),
  violationData: z.record(z.string(), z.any()).optional(),
  affectedEntities: z.record(z.string(), z.any()).optional(),
});

const updateViolationSchema = z.object({
  status: z.nativeEnum(ViolationStatus).optional(),
  remediationNotes: z.string().optional(),
  remediatedAt: z.string().datetime().optional(),
  remediatedBy: z.number().int().optional(),
  acknowledgedAt: z.string().datetime().optional(),
  acknowledgedBy: z.number().int().optional(),
  remediationEvidence: z.record(z.string(), z.any()).optional(),
});

const createAuditSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  framework: z.string().min(1),
  scope: z.record(z.string(), z.any()).optional(),
  scheduledDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  leadAuditor: z.string().optional(),
  auditTeam: z.array(z.string()).optional(),
});

const updateAuditSchema = z.object({
  status: z.nativeEnum(AuditStatus).optional(),
  findings: z.record(z.string(), z.any()).optional(),
  recommendations: z.record(z.string(), z.any()).optional(),
  overallScore: z.number().int().optional(),
  passedControls: z.number().int().optional(),
  failedControls: z.number().int().optional(),
  totalControls: z.number().int().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  remediationPlan: z.record(z.string(), z.any()).optional(),
  reportUrl: z.string().optional(),
});

const createRiskAssessmentSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  entityName: z.string().optional(),
  overallRiskScore: z.number().int().min(0).max(100),
  riskLevel: z.nativeEnum(RiskLevel),
  scoreBreakdown: z.record(z.string(), z.any()).optional(),
  riskFactors: z.record(z.string(), z.any()).optional(),
  mitigationPlan: z.record(z.string(), z.any()).optional(),
  mitigationStatus: z.string().optional(),
  nextAssessmentAt: z.string().datetime().optional(),
});

const updateRiskAssessmentSchema = z.object({
  entityName: z.string().optional(),
  overallRiskScore: z.number().int().min(0).max(100).optional(),
  riskLevel: z.nativeEnum(RiskLevel).optional(),
  scoreBreakdown: z.record(z.string(), z.any()).optional(),
  previousScore: z.number().int().optional(),
  scoreTrend: z.string().optional(),
  riskFactors: z.record(z.string(), z.any()).optional(),
  mitigationPlan: z.record(z.string(), z.any()).optional(),
  mitigationStatus: z.string().optional(),
  nextAssessmentAt: z.string().datetime().optional(),
});

const generateReportSchema = z.object({
  reportType: z.string().min(1),
  title: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  generatedBy: z.string().min(1),
});

// ============ Configuration Routes ============

router.get(
  '/clients/:clientId/compliance-monitor',
  requireAuth,
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const config = await complianceService.getComplianceConfig(clientId);
    res.json({ config });
  },
);

router.post(
  '/clients/:clientId/compliance-monitor',
  requireAuth,
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = createConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await complianceService.createComplianceConfig({
      clientId,
      ...parsed.data,
    });
    res.status(201).json({ config });
  },
);

router.patch(
  '/compliance-monitor/:configId',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = updateConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await complianceService.updateComplianceConfig(
      configId,
      parsed.data,
    );
    res.json({ config });
  },
);

// ============ Rules Routes ============

router.get(
  '/compliance-monitor/:configId/rules',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { framework, category, isActive } = req.query;
    const rules = await complianceService.getRules(configId, {
      framework: framework as string,
      category: category as string,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
    res.json({ rules });
  },
);

router.post(
  '/compliance-monitor/:configId/rules',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = createRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const rule = await complianceService.createRule({
      configId,
      ...parsed.data,
    });
    res.status(201).json({ rule });
  },
);

router.patch(
  '/compliance-monitor/rules/:ruleId',
  requireAuth,
  async (req: AuthenticatedRequest<{ ruleId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const ruleId = Number(req.params.ruleId);
    if (Number.isNaN(ruleId)) {
      res.status(400).json({ error: 'Invalid rule ID' });
      return;
    }

    const clientId = await complianceService.getClientIdFromRule(ruleId);
    if (!clientId) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = updateRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const rule = await complianceService.updateRule(ruleId, parsed.data);
    res.json({ rule });
  },
);

router.delete(
  '/compliance-monitor/rules/:ruleId',
  requireAuth,
  async (req: AuthenticatedRequest<{ ruleId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const ruleId = Number(req.params.ruleId);
    if (Number.isNaN(ruleId)) {
      res.status(400).json({ error: 'Invalid rule ID' });
      return;
    }

    const clientId = await complianceService.getClientIdFromRule(ruleId);
    if (!clientId) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await complianceService.deleteRule(ruleId);
    res.status(204).send();
  },
);

// ============ Violations Routes ============

router.get(
  '/compliance-monitor/:configId/violations',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { status, ruleId, severity, startDate, endDate } = req.query;
    const violations = await complianceService.getViolations(configId, {
      status: status ? (status as ViolationStatus) : undefined,
      ruleId: ruleId ? Number(ruleId) : undefined,
      severity: severity ? (severity as RiskLevel) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json({ violations });
  },
);

router.post(
  '/compliance-monitor/:configId/violations',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = createViolationSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const violation = await complianceService.createViolation({
      configId,
      ...parsed.data,
    });
    res.status(201).json({ violation });
  },
);

router.patch(
  '/compliance-monitor/violations/:violationId',
  requireAuth,
  async (req: AuthenticatedRequest<{ violationId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const violationId = Number(req.params.violationId);
    if (Number.isNaN(violationId)) {
      res.status(400).json({ error: 'Invalid violation ID' });
      return;
    }

    const clientId =
      await complianceService.getClientIdFromViolation(violationId);
    if (!clientId) {
      res.status(404).json({ error: 'Violation not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = updateViolationSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const violation = await complianceService.updateViolation(violationId, {
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      resolvedAt: parsed.data.resolvedAt
        ? new Date(parsed.data.resolvedAt)
        : undefined,
    });
    res.json({ violation });
  },
);

// ============ Audits Routes ============

router.get(
  '/compliance-monitor/:configId/audits',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { status, auditType } = req.query;
    const audits = await complianceService.getAudits(configId, {
      status: status as AuditStatus,
      auditType: auditType as string,
    });
    res.json({ audits });
  },
);

router.post(
  '/compliance-monitor/:configId/audits',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = createAuditSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const audit = await complianceService.createAudit({
      configId,
      ...parsed.data,
      scheduledDate: new Date(parsed.data.scheduledDate),
    });
    res.status(201).json({ audit });
  },
);

router.patch(
  '/compliance-monitor/audits/:auditId',
  requireAuth,
  async (req: AuthenticatedRequest<{ auditId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const auditId = Number(req.params.auditId);
    if (Number.isNaN(auditId)) {
      res.status(400).json({ error: 'Invalid audit ID' });
      return;
    }

    const clientId = await complianceService.getClientIdFromAudit(auditId);
    if (!clientId) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = updateAuditSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const audit = await complianceService.updateAudit(auditId, {
      ...parsed.data,
      completedDate: parsed.data.completedDate
        ? new Date(parsed.data.completedDate)
        : undefined,
      nextAuditDate: parsed.data.nextAuditDate
        ? new Date(parsed.data.nextAuditDate)
        : undefined,
    });
    res.json({ audit });
  },
);

// ============ Risk Assessments Routes ============

router.get(
  '/compliance-monitor/:configId/risks',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { riskLevel, category, status } = req.query;
    const risks = await complianceService.getRiskAssessments(configId, {
      riskLevel: riskLevel as RiskLevel,
      category: category as string,
      status: status as string,
    });
    res.json({ risks });
  },
);

router.post(
  '/compliance-monitor/:configId/risks',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = createRiskAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const risk = await complianceService.createRiskAssessment({
      configId,
      ...parsed.data,
      reviewDate: parsed.data.reviewDate
        ? new Date(parsed.data.reviewDate)
        : undefined,
    });
    res.status(201).json({ risk });
  },
);

router.patch(
  '/compliance-monitor/risks/:assessmentId',
  requireAuth,
  async (
    req: AuthenticatedRequest<{ assessmentId: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const assessmentId = Number(req.params.assessmentId);
    if (Number.isNaN(assessmentId)) {
      res.status(400).json({ error: 'Invalid assessment ID' });
      return;
    }

    const clientId =
      await complianceService.getClientIdFromRiskAssessment(assessmentId);
    if (!clientId) {
      res.status(404).json({ error: 'Risk assessment not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = updateRiskAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const risk = await complianceService.updateRiskAssessment(assessmentId, {
      ...parsed.data,
      reviewDate: parsed.data.reviewDate
        ? new Date(parsed.data.reviewDate)
        : undefined,
    });
    res.json({ risk });
  },
);

// ============ Compliance Scanning Routes ============

router.post(
  '/compliance-monitor/:configId/scan',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const results = await complianceService.runComplianceScan(configId);
    res.json({ results });
  },
);

// ============ Reports Routes ============

router.get(
  '/compliance-monitor/:configId/reports',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { reportType, startDate, endDate } = req.query;
    const reports = await complianceService.getReports(configId, {
      reportType: reportType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json({ reports });
  },
);

router.post(
  '/compliance-monitor/:configId/reports',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = generateReportSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const report = await complianceService.generateComplianceReport({
      configId,
      ...parsed.data,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd: new Date(parsed.data.periodEnd),
    });
    res.status(201).json({ report });
  },
);

// ============ Analytics Routes ============

router.get(
  '/compliance-monitor/:configId/analytics',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { startDate, endDate } = req.query;
    const analytics = await complianceService.getComplianceAnalytics(configId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json({ analytics });
  },
);

router.post(
  '/compliance-monitor/:configId/analytics/record',
  requireAuth,
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

    const clientId = await getClientIdFromComplianceMonitorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const analytics = await complianceService.recordDailyAnalytics(configId);
    res.json({ analytics });
  },
);

export default router;
