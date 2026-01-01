import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { requireAuth, AuthenticatedRequest } from '../../auth/auth.middleware';
import {
  tenantMiddleware,
  optionalTenantMiddleware,
} from '../../tenant/tenant.middleware';
import { runWithTenantContext } from '../../tenant/tenant.context';
import * as bugService from './bug-tracking.service';
import * as errorService from './error-collector.service';
import * as apiKeyService from './api-key.service';
import * as aiPromptService from './ai-prompt.service';
import * as attachmentService from './attachment.service';
import { IssueType, IssuePriority, IssueStatus, IssueSource } from './types';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Max 5 files per upload
  },
  fileFilter: (_req, file, cb) => {
    // Note: SVG is excluded due to XSS risk (can contain embedded JavaScript)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/json',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createIssueSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  type: z.nativeEnum(IssueType).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  source: z.nativeEnum(IssueSource).optional(),
  assignedToId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  accountId: z.number().int().positive().optional(),
  labelIds: z.array(z.number().int().positive()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const updateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(IssueType).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
  accountId: z.number().int().positive().nullable().optional(),
  labelIds: z.array(z.number().int().positive()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  description: z.string().max(255).optional(),
});

const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  description: z.string().max(255).optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).min(1),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

const aiSubmitSchema = z.object({
  type: z.nativeEnum(IssueType),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  priority: z.nativeEnum(IssuePriority).optional(),
  labels: z.array(z.string()).optional(),
  // User context - when provided, automatically sets reportedBy and optionally assignedTo
  reportedById: z.number().int().positive().optional(),
  assignedToId: z.number().int().positive().optional(),
  // Environment context
  environment: z.string().optional(),
  browserInfo: z
    .object({
      browser: z.string().optional(),
      version: z.string().optional(),
      os: z.string().optional(),
      device: z.string().optional(),
      screenSize: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
  metadata: z
    .object({
      conversationId: z.string().optional(),
      userId: z.number().optional(), // @deprecated - use reportedById instead
      context: z.string().optional(),
      suggestedSolution: z.string().optional(),
    })
    .optional(),
});

const clientErrorSchema = z.object({
  message: z.string().min(1),
  stack: z.string().optional(),
  source: z.enum([
    'window.onerror',
    'unhandledrejection',
    'react-error-boundary',
    'manual',
  ]),
  url: z.string(),
  line: z.number().optional(),
  column: z.number().optional(),
  componentStack: z.string().optional(),
  browserInfo: z
    .object({
      userAgent: z.string().optional(),
      language: z.string().optional(),
      platform: z.string().optional(),
      screenSize: z.string().optional(),
      browser: z.string().optional(),
      version: z.string().optional(),
      os: z.string().optional(),
      device: z.string().optional(),
    })
    .optional(),
  sessionId: z.string().optional(),
  userId: z.number().optional(),
  tenantId: z.string().optional(),
  module: z.string().optional(),
  environment: z.string().optional(),
  appVersion: z.string().optional(),
});

const clientErrorBatchSchema = z.object({
  errors: z.array(clientErrorSchema).max(100),
});

const bulkActionSchema = z.object({
  issueIds: z.array(z.number().int().positive()).min(1).max(100),
});

const bulkStatusSchema = bulkActionSchema.extend({
  status: z.nativeEnum(IssueStatus),
});

const bulkAssignSchema = bulkActionSchema.extend({
  assignedToId: z.number().int().positive().nullable(),
});

const bulkLabelSchema = bulkActionSchema.extend({
  labelIds: z.array(z.number().int().positive()).min(1),
});

const aiPromptOptionsSchema = z.object({
  format: z.enum(['markdown', 'plain', 'json']).optional(),
  includeComments: z.boolean().optional(),
  includeErrorLogs: z.boolean().optional(),
  includeRelatedIssues: z.boolean().optional(),
  maxErrorLogs: z.number().int().positive().max(50).optional(),
  customInstructions: z.string().max(2000).optional(),
});

const batchPromptSchema = z.object({
  issueIds: z.array(z.number().int().positive()).min(1).max(20),
  format: z.enum(['markdown', 'plain', 'json']).optional(),
  includeComments: z.boolean().optional(),
  includeErrorLogs: z.boolean().optional(),
  combined: z.boolean().optional(),
});

// ============================================================================
// API KEY AUTHENTICATION MIDDLEWARE
// ============================================================================

interface ApiKeyRequest extends Request {
  apiKey?: {
    tenantId: string;
    permissions: string[];
    keyId: number;
  };
}

async function requireApiKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction,
) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const result = await apiKeyService.validateApiKey(apiKey);

  if (!result.valid) {
    return res.status(401).json({ error: 'Invalid or expired API key' });
  }

  req.apiKey = {
    tenantId: result.tenantId!,
    permissions: result.permissions!,
    keyId: result.keyId!,
  };

  next();
}

function requirePermission(permission: string) {
  return (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    if (!apiKeyService.hasPermission(req.apiKey.permissions, permission)) {
      return res
        .status(403)
        .json({ error: `Missing permission: ${permission}` });
    }

    next();
  };
}

// ============================================================================
// WEBHOOK SECRET VERIFICATION
// ============================================================================

function verifyWebhookSecret(secretEnvVar: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const secret = process.env[secretEnvVar];
    if (!secret) {
      // In production, fail closed if no secret is configured
      if (process.env.NODE_ENV === 'production') {
        console.error(`Error: ${secretEnvVar} not configured in production`);
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }
      // In development, allow without secret but warn
      console.warn(`Warning: ${secretEnvVar} not configured`);
      return next();
    }

    const providedSecret = req.headers['x-webhook-secret'] || req.query.secret;
    if (providedSecret !== secret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    next();
  };
}

// ============================================================================
// ISSUE ROUTES (Authenticated)
// ============================================================================

// GET /bug-tracking/issues - List issues
router.get(
  '/bug-tracking/issues',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters = {
        status: req.query.status as IssueStatus | IssueStatus[] | undefined,
        priority: req.query.priority as
          | IssuePriority
          | IssuePriority[]
          | undefined,
        type: req.query.type as IssueType | IssueType[] | undefined,
        source: req.query.source as IssueSource | IssueSource[] | undefined,
        assignedToId: req.query.assignedToId
          ? req.query.assignedToId === 'null'
            ? null
            : Number(req.query.assignedToId)
          : undefined,
        reportedById: req.query.reportedById
          ? Number(req.query.reportedById)
          : undefined,
        projectId: req.query.projectId
          ? Number(req.query.projectId)
          : undefined,
        accountId: req.query.accountId
          ? Number(req.query.accountId)
          : undefined,
        module: req.query.module as string | undefined,
        search: req.query.search as string | undefined,
        createdAfter: req.query.createdAfter
          ? new Date(req.query.createdAfter as string)
          : undefined,
        createdBefore: req.query.createdBefore
          ? new Date(req.query.createdBefore as string)
          : undefined,
        includeClosed: req.query.includeClosed === 'true',
      };

      const pagination = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Math.min(Number(req.query.limit), 100) : 20,
        sortBy:
          (req.query.sortBy as
            | 'createdAt'
            | 'updatedAt'
            | 'priority'
            | 'status') || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await bugService.listIssues(filters, pagination);
      res.json(result);
    } catch (error) {
      console.error('Error listing issues:', error);
      res.status(500).json({ error: 'Failed to list issues' });
    }
  },
);

// POST /bug-tracking/issues - Create issue
router.post(
  '/bug-tracking/issues',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = createIssueSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const issue = await bugService.createIssue(parsed.data, req.userId);
      res.status(201).json(issue);
    } catch (error) {
      console.error('Error creating issue:', error);
      res.status(500).json({ error: 'Failed to create issue' });
    }
  },
);

// GET /bug-tracking/issues/stats - Get statistics
router.get(
  '/bug-tracking/issues/stats',
  requireAuth,
  tenantMiddleware,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await bugService.getIssueStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting issue stats:', error);
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  },
);

// GET /bug-tracking/issues/:id - Get issue by ID
router.get(
  '/bug-tracking/issues/:id',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const issue = await bugService.getIssueById(id);

      if (!issue) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      res.json(issue);
    } catch (error) {
      console.error('Error getting issue:', error);
      res.status(500).json({ error: 'Failed to get issue' });
    }
  },
);

// PUT /bug-tracking/issues/:id - Update issue
router.put(
  '/bug-tracking/issues/:id',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const parsed = updateIssueSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const issue = await bugService.updateIssue(id, parsed.data, req.userId);
      res.json(issue);
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error updating issue:', error);
      res.status(500).json({ error: 'Failed to update issue' });
    }
  },
);

// DELETE /bug-tracking/issues/:id - Delete issue
router.delete(
  '/bug-tracking/issues/:id',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await bugService.deleteIssue(id);
      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error deleting issue:', error);
      res.status(500).json({ error: 'Failed to delete issue' });
    }
  },
);

// POST /bug-tracking/issues/:id/assign - Assign issue
router.post(
  '/bug-tracking/issues/:id/assign',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const body = req.body as { assignedToId?: number | null };
      const assignedToId = body.assignedToId ?? null;

      const issue = await bugService.assignIssue(id, assignedToId);
      res.json(issue);
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error assigning issue:', error);
      res.status(500).json({ error: 'Failed to assign issue' });
    }
  },
);

// POST /bug-tracking/issues/:id/status - Change status
router.post(
  '/bug-tracking/issues/:id/status',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const body = req.body as { status?: IssueStatus };
      const status = body.status;

      if (!status || !Object.values(IssueStatus).includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const issue = await bugService.changeIssueStatus(id, status);
      res.json(issue);
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error changing status:', error);
      res.status(500).json({ error: 'Failed to change status' });
    }
  },
);

// ============================================================================
// BULK OPERATIONS
// ============================================================================

// POST /bug-tracking/issues/bulk/status - Bulk update status
router.post(
  '/bug-tracking/issues/bulk/status',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = bulkStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await bugService.bulkUpdateStatus(
        parsed.data.issueIds,
        parsed.data.status,
      );
      res.json({ updated: result.count });
    } catch (error) {
      console.error('Error bulk updating status:', error);
      res.status(500).json({ error: 'Failed to bulk update status' });
    }
  },
);

// POST /bug-tracking/issues/bulk/assign - Bulk assign
router.post(
  '/bug-tracking/issues/bulk/assign',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = bulkAssignSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await bugService.bulkAssign(
        parsed.data.issueIds,
        parsed.data.assignedToId,
      );
      res.json({ updated: result.count });
    } catch (error) {
      console.error('Error bulk assigning:', error);
      res.status(500).json({ error: 'Failed to bulk assign' });
    }
  },
);

// POST /bug-tracking/issues/bulk/labels - Bulk add labels
router.post(
  '/bug-tracking/issues/bulk/labels',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = bulkLabelSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await bugService.bulkAddLabels(
        parsed.data.issueIds,
        parsed.data.labelIds,
      );
      res.json(result);
    } catch (error) {
      console.error('Error bulk adding labels:', error);
      res.status(500).json({ error: 'Failed to bulk add labels' });
    }
  },
);

// ============================================================================
// COMMENT ROUTES
// ============================================================================

// GET /bug-tracking/issues/:id/comments - List comments
router.get(
  '/bug-tracking/issues/:id/comments',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);
      const comments = await bugService.listComments(issueId);
      res.json(comments);
    } catch (error) {
      console.error('Error listing comments:', error);
      res.status(500).json({ error: 'Failed to list comments' });
    }
  },
);

// POST /bug-tracking/issues/:id/comments - Add comment
router.post(
  '/bug-tracking/issues/:id/comments',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);
      const parsed = createCommentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const comment = await bugService.addComment(
        issueId,
        parsed.data,
        req.userId,
      );
      res.status(201).json(comment);
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  },
);

// DELETE /bug-tracking/comments/:id - Delete comment
router.delete(
  '/bug-tracking/comments/:id',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await bugService.deleteComment(id, req.userId);
      res.status(204).send();
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'Comment not found') {
        return res.status(404).json({ error: message });
      }
      if (message.includes('Cannot delete')) {
        return res.status(403).json({ error: message });
      }
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  },
);

// ============================================================================
// ATTACHMENT ROUTES
// ============================================================================

// GET /bug-tracking/issues/:id/attachments - List attachments for an issue
router.get(
  '/bug-tracking/issues/:id/attachments',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);
      const attachments = await attachmentService.getAttachments(issueId);
      res.json(attachments);
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error listing attachments:', error);
      res.status(500).json({ error: 'Failed to list attachments' });
    }
  },
);

// POST /bug-tracking/issues/:id/attachments - Upload attachment(s)
router.post(
  '/bug-tracking/issues/:id/attachments',
  requireAuth,
  tenantMiddleware,
  upload.array('files', 5),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const attachments = await Promise.all(
        files.map((file) =>
          attachmentService.createAttachment({
            issueId,
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            data: file.buffer,
          }),
        ),
      );

      res.status(201).json(attachments);
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'Issue not found') {
        return res.status(404).json({ error: message });
      }
      if (
        message.includes('Invalid file type') ||
        message.includes('File too large')
      ) {
        return res.status(400).json({ error: message });
      }
      console.error('Error uploading attachments:', error);
      res.status(500).json({ error: 'Failed to upload attachments' });
    }
  },
);

// GET /bug-tracking/attachments/:id - Get a single attachment
router.get(
  '/bug-tracking/attachments/:id',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const attachment = await attachmentService.getAttachment(id);
      res.json(attachment);
    } catch (error) {
      if ((error as Error).message === 'Attachment not found') {
        return res.status(404).json({ error: 'Attachment not found' });
      }
      console.error('Error getting attachment:', error);
      res.status(500).json({ error: 'Failed to get attachment' });
    }
  },
);

// DELETE /bug-tracking/attachments/:id - Delete an attachment
router.delete(
  '/bug-tracking/attachments/:id',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await attachmentService.deleteAttachment(id);
      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === 'Attachment not found') {
        return res.status(404).json({ error: 'Attachment not found' });
      }
      console.error('Error deleting attachment:', error);
      res.status(500).json({ error: 'Failed to delete attachment' });
    }
  },
);

// GET /bug-tracking/issues/:id/attachments/ai - Get attachment info for AI prompts
router.get(
  '/bug-tracking/issues/:id/attachments/ai',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);
      const includeImages = req.query.includeImages === 'true';

      const descriptions =
        await attachmentService.getAttachmentDescriptions(issueId);

      if (includeImages) {
        const images =
          await attachmentService.getImageAttachmentsForAI(issueId);
        res.json({ descriptions, images });
      } else {
        res.json({ descriptions });
      }
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error getting attachment info for AI:', error);
      res.status(500).json({ error: 'Failed to get attachment info' });
    }
  },
);

// ============================================================================
// LABEL ROUTES
// ============================================================================

// GET /bug-tracking/labels - List labels
router.get(
  '/bug-tracking/labels',
  requireAuth,
  tenantMiddleware,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const labels = await bugService.listLabels();
      res.json(labels);
    } catch (error) {
      console.error('Error listing labels:', error);
      res.status(500).json({ error: 'Failed to list labels' });
    }
  },
);

// POST /bug-tracking/labels - Create label
router.post(
  '/bug-tracking/labels',
  requireAuth,
  tenantMiddleware,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = createLabelSchema.safeParse(_req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const label = await bugService.createLabel(parsed.data);
      res.status(201).json(label);
    } catch (error) {
      console.error('Error creating label:', error);
      res.status(500).json({ error: 'Failed to create label' });
    }
  },
);

// PUT /bug-tracking/labels/:id - Update label
router.put(
  '/bug-tracking/labels/:id',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const parsed = updateLabelSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const label = await bugService.updateLabel(id, parsed.data);
      res.json(label);
    } catch (error) {
      if ((error as Error).message === 'Label not found') {
        return res.status(404).json({ error: 'Label not found' });
      }
      console.error('Error updating label:', error);
      res.status(500).json({ error: 'Failed to update label' });
    }
  },
);

// DELETE /bug-tracking/labels/:id - Delete label
router.delete(
  '/bug-tracking/labels/:id',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await bugService.deleteLabel(id);
      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === 'Label not found') {
        return res.status(404).json({ error: 'Label not found' });
      }
      console.error('Error deleting label:', error);
      res.status(500).json({ error: 'Failed to delete label' });
    }
  },
);

// ============================================================================
// API KEY MANAGEMENT ROUTES
// ============================================================================

// GET /bug-tracking/api-keys - List API keys
router.get(
  '/bug-tracking/api-keys',
  requireAuth,
  tenantMiddleware,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const keys = await apiKeyService.listApiKeys();
      res.json(keys);
    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(500).json({ error: 'Failed to list API keys' });
    }
  },
);

// POST /bug-tracking/api-keys - Create API key
router.post(
  '/bug-tracking/api-keys',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = createApiKeySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const key = await apiKeyService.createApiKey(parsed.data);
      res.status(201).json(key);
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({ error: 'Failed to create API key' });
    }
  },
);

// POST /bug-tracking/api-keys/:id/revoke - Revoke API key
router.post(
  '/bug-tracking/api-keys/:id/revoke',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const key = await apiKeyService.revokeApiKey(id);
      res.json(key);
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'API key not found') {
        return res.status(404).json({ error: message });
      }
      if (message === 'API key is already revoked') {
        return res.status(400).json({ error: message });
      }
      console.error('Error revoking API key:', error);
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  },
);

// DELETE /bug-tracking/api-keys/:id - Delete API key
router.delete(
  '/bug-tracking/api-keys/:id',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await apiKeyService.deleteApiKey(id);
      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === 'API key not found') {
        return res.status(404).json({ error: 'API key not found' });
      }
      console.error('Error deleting API key:', error);
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  },
);

// ============================================================================
// AI ASSISTANT SUBMISSION ROUTE (API Key Auth)
// ============================================================================

// POST /bug-tracking/ai/submit - AI submits issue
router.post(
  '/bug-tracking/ai/submit',
  requireApiKey,
  requirePermission(apiKeyService.PERMISSIONS.ISSUES_WRITE),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const parsed = aiSubmitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      // Determine reportedById - prefer explicit field, fall back to metadata.userId for backward compatibility
      const reportedById =
        parsed.data.reportedById || parsed.data.metadata?.userId;

      // Run with the API key's tenant context
      const issue = await runWithTenantContext(
        {
          tenantId: req.apiKey!.tenantId,
          tenantSlug: '',
          tenantPlan: 'STARTER',
        },
        async () => {
          return bugService.createIssue(
            {
              title: parsed.data.title,
              description: parsed.data.description,
              type: parsed.data.type,
              priority: parsed.data.priority,
              source: 'AI_ASSISTANT',
              assignedToId: parsed.data.assignedToId,
              environment: parsed.data.environment,
              browserInfo: parsed.data.browserInfo as Record<string, unknown>,
              customFields: parsed.data.metadata,
            },
            reportedById,
          );
        },
      );

      res.status(201).json(issue);
    } catch (error) {
      console.error('Error submitting AI issue:', error);
      res.status(500).json({ error: 'Failed to submit issue' });
    }
  },
);

// ============================================================================
// ERROR COLLECTION ROUTES
// ============================================================================

// POST /bug-tracking/errors/client - Client error ingestion
// Note: Uses optional tenant middleware to support both authenticated and anonymous errors
router.post(
  '/bug-tracking/errors/client',
  optionalTenantMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Support both single error and batch
      if (req.body.errors) {
        const parsed = clientErrorBatchSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ errors: parsed.error.flatten() });
        }

        const results = await errorService.ingestClientErrors(
          parsed.data.errors,
        );
        res.status(201).json({ processed: results.length });
      } else {
        const parsed = clientErrorSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ errors: parsed.error.flatten() });
        }

        const issue = await errorService.ingestClientError(parsed.data);
        res.status(201).json({ issueId: issue.id });
      }
    } catch (error) {
      console.error('Error ingesting client error:', error);
      res.status(500).json({ error: 'Failed to ingest error' });
    }
  },
);

// GET /bug-tracking/errors - Get recent error logs
router.get(
  '/bug-tracking/errors',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const options = {
        source: req.query.source as IssueSource | undefined,
        level: req.query.level as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        since: req.query.since
          ? new Date(req.query.since as string)
          : undefined,
      };

      const errors = await errorService.getRecentErrorLogs(options);
      res.json(errors);
    } catch (error) {
      console.error('Error getting error logs:', error);
      res.status(500).json({ error: 'Failed to get error logs' });
    }
  },
);

// GET /bug-tracking/errors/stats - Get error statistics
router.get(
  '/bug-tracking/errors/stats',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const since = req.query.since
        ? new Date(req.query.since as string)
        : undefined;
      const stats = await errorService.getErrorStats(since);
      res.json(stats);
    } catch (error) {
      console.error('Error getting error stats:', error);
      res.status(500).json({ error: 'Failed to get error statistics' });
    }
  },
);

// GET /bug-tracking/issues/:id/errors - Get error logs for an issue
router.get(
  '/bug-tracking/issues/:id/errors',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const errors = await errorService.getErrorLogsForIssue(issueId, limit);
      res.json(errors);
    } catch (error) {
      console.error('Error getting issue errors:', error);
      res.status(500).json({ error: 'Failed to get issue errors' });
    }
  },
);

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

// POST /bug-tracking/webhooks/vercel - Vercel log drain
router.post(
  '/bug-tracking/webhooks/vercel',
  verifyWebhookSecret('VERCEL_WEBHOOK_SECRET'),
  async (req: Request, res: Response) => {
    try {
      const logs = Array.isArray(req.body) ? req.body : [req.body];
      const result = await errorService.processVercelLogs(logs);
      res.json(result);
    } catch (error) {
      console.error('Error processing Vercel logs:', error);
      res.status(500).json({ error: 'Failed to process Vercel logs' });
    }
  },
);

// POST /bug-tracking/webhooks/render - Render log stream
router.post(
  '/bug-tracking/webhooks/render',
  verifyWebhookSecret('RENDER_WEBHOOK_SECRET'),
  async (req: Request, res: Response) => {
    try {
      const logs = Array.isArray(req.body) ? req.body : [req.body];
      const result = await errorService.processRenderLogs(logs);
      res.json(result);
    } catch (error) {
      console.error('Error processing Render logs:', error);
      res.status(500).json({ error: 'Failed to process Render logs' });
    }
  },
);

// ============================================================================
// AI PROMPT GENERATION ROUTES
// ============================================================================

// GET /bug-tracking/issues/:id/ai-prompt - Generate AI prompt for single issue
router.get(
  '/bug-tracking/issues/:id/ai-prompt',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);

      // Parse query params as options
      const options: aiPromptService.AIPromptOptions = {
        format:
          (req.query.format as 'markdown' | 'plain' | 'json') || 'markdown',
        includeComments: req.query.includeComments === 'true',
        includeErrorLogs: req.query.includeErrorLogs !== 'false', // default true
        includeRelatedIssues: req.query.includeRelatedIssues === 'true',
        maxErrorLogs: req.query.maxErrorLogs
          ? Number(req.query.maxErrorLogs)
          : 10,
        customInstructions: req.query.customInstructions as string | undefined,
      };

      const prompt = await aiPromptService.generateAIPrompt(issueId, options);
      res.json(prompt);
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error generating AI prompt:', error);
      res.status(500).json({ error: 'Failed to generate AI prompt' });
    }
  },
);

// POST /bug-tracking/issues/:id/ai-prompt - Generate AI prompt with options in body
router.post(
  '/bug-tracking/issues/:id/ai-prompt',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);
      const parsed = aiPromptOptionsSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const prompt = await aiPromptService.generateAIPrompt(
        issueId,
        parsed.data,
      );
      res.json(prompt);
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error generating AI prompt:', error);
      res.status(500).json({ error: 'Failed to generate AI prompt' });
    }
  },
);

// POST /bug-tracking/ai-prompts/batch - Generate AI prompts for multiple issues
router.post(
  '/bug-tracking/ai-prompts/batch',
  requireAuth,
  tenantMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = batchPromptSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const { issueIds, combined, ...options } = parsed.data;

      if (combined) {
        // Generate a single combined prompt for all issues
        const prompt = await aiPromptService.generateCombinedPrompt(
          issueIds,
          options,
        );
        res.json(prompt);
      } else {
        // Generate individual prompts for each issue
        const prompts = await aiPromptService.generateBatchPrompts(
          issueIds,
          options,
        );
        res.json({ prompts });
      }
    } catch (error) {
      console.error('Error generating batch AI prompts:', error);
      res.status(500).json({ error: 'Failed to generate AI prompts' });
    }
  },
);

// GET /bug-tracking/ai-prompt/formats - Get available prompt formats and options
router.get(
  '/bug-tracking/ai-prompt/formats',
  requireAuth,
  async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      formats: ['markdown', 'plain', 'json'],
      options: {
        includeComments: {
          description: 'Include issue comments in the prompt',
          default: false,
        },
        includeErrorLogs: {
          description: 'Include associated error logs',
          default: true,
        },
        includeRelatedIssues: {
          description: 'Include related issues (same labels)',
          default: false,
        },
        maxErrorLogs: {
          description: 'Maximum number of error logs to include',
          default: 10,
          max: 50,
        },
        customInstructions: {
          description: 'Custom instructions to append to the prompt',
          maxLength: 2000,
        },
      },
      slashCommand: {
        command: '/implement-issue',
        description:
          'Generate an implementation prompt for a bug tracking issue',
        usage: '/implement-issue <issue-id> [options]',
      },
    });
  },
);

// ============================================================================
// EXTERNAL AI ACCESS ROUTES (API Key Auth)
// These routes allow external AI tools (like Claude Code) to access issue data
// using API keys instead of session-based authentication.
// ============================================================================

// GET /bug-tracking/external/issues/:id/prompt - Get AI prompt via API key
router.get(
  '/bug-tracking/external/issues/:id/prompt',
  requireApiKey,
  requirePermission(apiKeyService.PERMISSIONS.ISSUES_READ),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);

      // Parse query params as options
      const options: aiPromptService.AIPromptOptions = {
        format:
          (req.query.format as 'markdown' | 'plain' | 'json') || 'markdown',
        includeComments: req.query.includeComments === 'true',
        includeErrorLogs: req.query.includeErrorLogs !== 'false',
        includeRelatedIssues: req.query.includeRelatedIssues === 'true',
        maxErrorLogs: req.query.maxErrorLogs
          ? Number(req.query.maxErrorLogs)
          : 10,
        customInstructions: req.query.customInstructions as string | undefined,
      };

      // Run with the API key's tenant context
      const prompt = await runWithTenantContext(
        {
          tenantId: req.apiKey!.tenantId,
          tenantSlug: '',
          tenantPlan: 'STARTER',
        },
        async () => {
          return aiPromptService.generateAIPrompt(issueId, options);
        },
      );

      res.json(prompt);
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error generating AI prompt (external):', error);
      res.status(500).json({ error: 'Failed to generate AI prompt' });
    }
  },
);

// GET /bug-tracking/external/issues - List issues via API key
router.get(
  '/bug-tracking/external/issues',
  requireApiKey,
  requirePermission(apiKeyService.PERMISSIONS.ISSUES_READ),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const filters = {
        status: req.query.status as IssueStatus | IssueStatus[] | undefined,
        priority: req.query.priority as
          | IssuePriority
          | IssuePriority[]
          | undefined,
        type: req.query.type as IssueType | IssueType[] | undefined,
        search: req.query.search as string | undefined,
        includeClosed: req.query.includeClosed === 'true',
      };

      const pagination = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Math.min(Number(req.query.limit), 50) : 20,
        sortBy:
          (req.query.sortBy as 'createdAt' | 'updatedAt' | 'priority') ||
          'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      // Run with the API key's tenant context
      const result = await runWithTenantContext(
        {
          tenantId: req.apiKey!.tenantId,
          tenantSlug: '',
          tenantPlan: 'STARTER',
        },
        async () => {
          return bugService.listIssues(filters, pagination);
        },
      );

      res.json(result);
    } catch (error) {
      console.error('Error listing issues (external):', error);
      res.status(500).json({ error: 'Failed to list issues' });
    }
  },
);

// GET /bug-tracking/external/issues/:id - Get single issue via API key
router.get(
  '/bug-tracking/external/issues/:id',
  requireApiKey,
  requirePermission(apiKeyService.PERMISSIONS.ISSUES_READ),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);

      // Run with the API key's tenant context
      const issue = await runWithTenantContext(
        {
          tenantId: req.apiKey!.tenantId,
          tenantSlug: '',
          tenantPlan: 'STARTER',
        },
        async () => {
          return bugService.getIssueById(issueId);
        },
      );

      if (!issue) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      res.json(issue);
    } catch (error) {
      console.error('Error getting issue (external):', error);
      res.status(500).json({ error: 'Failed to get issue' });
    }
  },
);

// POST /bug-tracking/external/issues/:id/status - Update issue status via API key
router.post(
  '/bug-tracking/external/issues/:id/status',
  requireApiKey,
  requirePermission(apiKeyService.PERMISSIONS.ISSUES_WRITE),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const issueId = Number(req.params.id);
      const { status } = req.body as { status?: IssueStatus };

      if (!status || !Object.values(IssueStatus).includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Run with the API key's tenant context
      const issue = await runWithTenantContext(
        {
          tenantId: req.apiKey!.tenantId,
          tenantSlug: '',
          tenantPlan: 'STARTER',
        },
        async () => {
          return bugService.changeIssueStatus(issueId, status);
        },
      );

      res.json(issue);
    } catch (error) {
      if ((error as Error).message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }
      console.error('Error updating issue status (external):', error);
      res.status(500).json({ error: 'Failed to update issue status' });
    }
  },
);

export default router;
