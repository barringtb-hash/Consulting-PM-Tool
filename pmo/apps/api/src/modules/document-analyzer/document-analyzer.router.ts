/**
 * Tool 2.1: Smart Document Analyzer Router
 *
 * API endpoints for document analysis, extraction templates, and batch processing
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import * as documentAnalyzerService from './document-analyzer.service';
import {
  hasClientAccess,
  getClientIdFromDocumentAnalyzerConfig,
  getClientIdFromAnalyzedDocument,
  getClientIdFromExtractionTemplate,
  getClientIdFromBatchJob,
} from '../../auth/client-auth.helper';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const documentAnalyzerConfigSchema = z.object({
  enableOCR: z.boolean().optional(),
  enableNER: z.boolean().optional(),
  enableCompliance: z.boolean().optional(),
  enableVersionCompare: z.boolean().optional(),
  defaultExtractionFields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean().optional(),
  })).optional(),
  complianceRules: z.array(z.object({
    ruleId: z.string(),
    name: z.string(),
    pattern: z.string().optional(),
    requiredField: z.string().optional(),
    severity: z.enum(['PASS', 'WARNING', 'FAIL']),
  })).optional(),
  retentionDays: z.number().int().min(1).max(3650).optional(),
});

const documentUploadSchema = z.object({
  filename: z.string().min(1).max(500),
  originalUrl: z.string().url(),
  mimeType: z.string(),
  sizeBytes: z.number().int().min(0),
  format: z.enum(['PDF', 'WORD', 'EXCEL', 'IMAGE', 'SCANNED', 'TEXT', 'OTHER']),
});

const extractionTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  documentType: z.string().max(100).optional(),
  extractionRules: z.array(z.object({
    fieldName: z.string(),
    type: z.string(),
    pattern: z.string().optional(),
    location: z.string().optional(),
    required: z.boolean().optional(),
  })),
  useMLExtraction: z.boolean().optional(),
});

const batchJobSchema = z.object({
  documentIds: z.array(z.number().int()),
  extractionTemplateId: z.number().int().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// CONFIG ROUTES
// ============================================================================

/**
 * GET /api/document-analyzer/configs
 * List all document analyzer configurations (filtered by user access)
 */
router.get(
  '/document-analyzer/configs',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = req.query.clientId
      ? Number(req.query.clientId)
      : undefined;
    if (req.query.clientId && Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    // If specific clientId requested, verify access
    if (clientId) {
      const canAccess = await hasClientAccess(req.userId, clientId);
      if (!canAccess) {
        res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
        return;
      }
    }

    const configs = await documentAnalyzerService.listDocumentAnalyzerConfigs({ clientId });
    res.json({ configs });
  },
);

/**
 * GET /api/clients/:clientId/document-analyzer
 * Get document analyzer configuration for a client
 */
router.get(
  '/clients/:clientId/document-analyzer',
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

    // Authorization check
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const config = await documentAnalyzerService.getDocumentAnalyzerConfig(clientId);
    res.json({ config });
  },
);

/**
 * POST /api/clients/:clientId/document-analyzer
 * Create document analyzer configuration for a client
 */
router.post(
  '/clients/:clientId/document-analyzer',
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

    // Authorization check
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = documentAnalyzerConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const config = await documentAnalyzerService.createDocumentAnalyzerConfig(clientId, {
        ...parsed.data,
        defaultExtractionFields: parsed.data.defaultExtractionFields as Prisma.InputJsonValue,
        complianceRules: parsed.data.complianceRules as Prisma.InputJsonValue,
      });
      res.status(201).json({ config });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ error: 'Config already exists for this client' });
        return;
      }
      throw error;
    }
  },
);

/**
 * PATCH /api/clients/:clientId/document-analyzer
 * Update document analyzer configuration
 */
router.patch(
  '/clients/:clientId/document-analyzer',
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

    // Authorization check
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = documentAnalyzerConfigSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await documentAnalyzerService.updateDocumentAnalyzerConfig(clientId, {
      ...parsed.data,
      defaultExtractionFields: parsed.data.defaultExtractionFields as Prisma.InputJsonValue,
      complianceRules: parsed.data.complianceRules as Prisma.InputJsonValue,
    });
    res.json({ config });
  },
);

// ============================================================================
// DOCUMENT ROUTES
// ============================================================================

/**
 * POST /api/document-analyzer/:configId/documents
 * Upload a document for analysis
 */
router.post(
  '/document-analyzer/:configId/documents',
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

    // Authorization check via config
    const clientId = await getClientIdFromDocumentAnalyzerConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = documentUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const document = await documentAnalyzerService.uploadDocument(configId, parsed.data);
    res.status(201).json({ document });
  },
);

/**
 * GET /api/document-analyzer/:configId/documents
 * List documents for a config
 */
router.get(
  '/document-analyzer/:configId/documents',
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

    // Authorization check via config
    const clientId = await getClientIdFromDocumentAnalyzerConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const status = req.query.status as string | undefined;
    const documentType = req.query.documentType as string | undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const documents = await documentAnalyzerService.getDocuments(configId, {
      status: status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW' | undefined,
      documentType,
      limit,
      offset,
    });

    res.json({ documents });
  },
);

/**
 * GET /api/document-analyzer/documents/:id
 * Get a specific document
 */
router.get(
  '/document-analyzer/documents/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    // Authorization check via document
    const clientId = await getClientIdFromAnalyzedDocument(id);
    if (!clientId) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const document = await documentAnalyzerService.getDocument(id);
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({ document });
  },
);

/**
 * POST /api/document-analyzer/documents/:id/analyze
 * Trigger analysis for a document
 */
router.post(
  '/document-analyzer/documents/:id/analyze',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    // Authorization check via document
    const clientId = await getClientIdFromAnalyzedDocument(id);
    if (!clientId) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const { extractionTemplateId, forceReanalyze } = req.body as {
      extractionTemplateId?: number;
      forceReanalyze?: boolean;
    };

    try {
      const result = await documentAnalyzerService.analyzeDocument(id, {
        extractionTemplateId,
        forceReanalyze,
      });
      res.json(result);
    } catch (error) {
      if ((error as Error).message === 'Document not found') {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * DELETE /api/document-analyzer/documents/:id
 * Delete a document
 */
router.delete(
  '/document-analyzer/documents/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    // Authorization check via document
    const clientId = await getClientIdFromAnalyzedDocument(id);
    if (!clientId) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    await documentAnalyzerService.deleteDocument(id);
    res.status(204).send();
  },
);

/**
 * POST /api/document-analyzer/documents/compare
 * Compare two document versions
 */
router.post(
  '/document-analyzer/documents/compare',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { currentDocId, previousDocId } = req.body as {
      currentDocId: number;
      previousDocId: number;
    };

    if (!currentDocId || !previousDocId) {
      res.status(400).json({ error: 'Both currentDocId and previousDocId are required' });
      return;
    }

    // Authorization check for both documents
    const clientId1 = await getClientIdFromAnalyzedDocument(currentDocId);
    const clientId2 = await getClientIdFromAnalyzedDocument(previousDocId);

    if (!clientId1 || !clientId2) {
      res.status(404).json({ error: 'One or both documents not found' });
      return;
    }

    const canAccess1 = await hasClientAccess(req.userId, clientId1);
    const canAccess2 = await hasClientAccess(req.userId, clientId2);

    if (!canAccess1 || !canAccess2) {
      res.status(403).json({ error: 'Forbidden: You do not have access to one or both documents' });
      return;
    }

    try {
      const comparison = await documentAnalyzerService.compareDocumentVersions(
        currentDocId,
        previousDocId,
      );
      res.json({ comparison });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        res.status(404).json({ error: (error as Error).message });
        return;
      }
      throw error;
    }
  },
);

// ============================================================================
// EXTRACTION TEMPLATE ROUTES
// ============================================================================

/**
 * GET /api/document-analyzer/:configId/templates
 * List extraction templates
 */
router.get(
  '/document-analyzer/:configId/templates',
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

    // Authorization check via config
    const clientId = await getClientIdFromDocumentAnalyzerConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const documentType = req.query.documentType as string | undefined;
    const isActive = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;

    const templates = await documentAnalyzerService.getExtractionTemplates(configId, {
      documentType,
      isActive,
    });

    res.json({ templates });
  },
);

/**
 * POST /api/document-analyzer/:configId/templates
 * Create an extraction template
 */
router.post(
  '/document-analyzer/:configId/templates',
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

    // Authorization check via config
    const clientId = await getClientIdFromDocumentAnalyzerConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = extractionTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const template = await documentAnalyzerService.createExtractionTemplate(configId, {
      ...parsed.data,
      extractionRules: parsed.data.extractionRules as Prisma.InputJsonValue,
    });
    res.status(201).json({ template });
  },
);

/**
 * PATCH /api/document-analyzer/templates/:id
 * Update an extraction template
 */
router.patch(
  '/document-analyzer/templates/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid template ID' });
      return;
    }

    // Authorization check via template
    const clientId = await getClientIdFromExtractionTemplate(id);
    if (!clientId) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = extractionTemplateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const template = await documentAnalyzerService.updateExtractionTemplate(id, {
      ...parsed.data,
      extractionRules: parsed.data.extractionRules as Prisma.InputJsonValue,
    });
    res.json({ template });
  },
);

/**
 * DELETE /api/document-analyzer/templates/:id
 * Delete an extraction template
 */
router.delete(
  '/document-analyzer/templates/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid template ID' });
      return;
    }

    // Authorization check via template
    const clientId = await getClientIdFromExtractionTemplate(id);
    if (!clientId) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    await documentAnalyzerService.deleteExtractionTemplate(id);
    res.status(204).send();
  },
);

// ============================================================================
// BATCH JOB ROUTES
// ============================================================================

/**
 * POST /api/document-analyzer/:configId/batch-jobs
 * Create a batch processing job
 */
router.post(
  '/document-analyzer/:configId/batch-jobs',
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

    // Authorization check via config
    const clientId = await getClientIdFromDocumentAnalyzerConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = batchJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const job = await documentAnalyzerService.createBatchJob(configId, {
      ...parsed.data,
      settings: parsed.data.settings as Prisma.InputJsonValue,
    });
    res.status(201).json({ job });
  },
);

/**
 * GET /api/document-analyzer/:configId/batch-jobs
 * List batch jobs for a config
 */
router.get(
  '/document-analyzer/:configId/batch-jobs',
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

    // Authorization check via config
    const clientId = await getClientIdFromDocumentAnalyzerConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const status = req.query.status as string | undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const jobs = await documentAnalyzerService.getBatchJobs(configId, {
      status: status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW' | undefined,
      limit,
      offset,
    });

    res.json({ jobs });
  },
);

/**
 * GET /api/document-analyzer/batch-jobs/:id
 * Get a specific batch job
 */
router.get(
  '/document-analyzer/batch-jobs/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid job ID' });
      return;
    }

    // Authorization check via batch job
    const clientId = await getClientIdFromBatchJob(id);
    if (!clientId) {
      res.status(404).json({ error: 'Batch job not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const job = await documentAnalyzerService.getBatchJob(id);
    if (!job) {
      res.status(404).json({ error: 'Batch job not found' });
      return;
    }

    res.json({ job });
  },
);

export default router;
