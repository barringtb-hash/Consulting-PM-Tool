/**
 * Tool 2.2: Content Generation Suite Router
 *
 * API endpoints for content generation, templates, and approval workflows
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import * as contentGeneratorService from './content-generator.service';
import * as intakeContentService from './services/intake-content.service';
import {
  hasClientAccess,
  getClientIdFromContentGeneratorConfig,
  getClientIdFromGeneratedContent,
  getClientIdFromContentTemplate,
} from '../../auth/client-auth.helper';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const contentGeneratorConfigSchema = z.object({
  brandVoiceDescription: z.string().max(2000).optional(),
  toneKeywords: z.array(z.string()).optional(),
  avoidKeywords: z.array(z.string()).optional(),
  voiceSamples: z
    .array(
      z.object({
        text: z.string(),
        type: z.string(),
        source: z.string().optional(),
      }),
    )
    .optional(),
  enableSEO: z.boolean().optional(),
  targetKeywords: z.array(z.string()).optional(),
  enablePlagiarismCheck: z.boolean().optional(),
  defaultTone: z.string().optional(),
  defaultLength: z.enum(['short', 'medium', 'long']).optional(),
  cmsIntegrations: z.record(z.string(), z.unknown()).optional(),
  socialIntegrations: z.record(z.string(), z.unknown()).optional(),
  emailIntegrations: z.record(z.string(), z.unknown()).optional(),
});

const contentGenerationSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.enum([
    'SOCIAL_POST',
    'EMAIL',
    'BLOG_POST',
    'AD_COPY',
    'LANDING_PAGE',
    'NEWSLETTER',
    'PRESS_RELEASE',
    'PRODUCT_COPY',
    'VIDEO_SCRIPT',
    // Phase 1 additions - Business document content types
    'PROPOSAL',
    'CASE_STUDY',
    'FAQ_CONTENT',
    'WELCOME_PACKET',
    'WHITEPAPER',
  ]),
  prompt: z.string().max(5000).optional(),
  templateId: z.number().int().optional(),
  placeholderValues: z.record(z.string(), z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  targetLength: z.enum(['short', 'medium', 'long']).optional(),
  tone: z.string().optional(),
  generateVariants: z.number().int().min(1).max(5).optional(),
});

const contentTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum([
    'SOCIAL_POST',
    'EMAIL',
    'BLOG_POST',
    'AD_COPY',
    'LANDING_PAGE',
    'NEWSLETTER',
    'PRESS_RELEASE',
    'PRODUCT_COPY',
    'VIDEO_SCRIPT',
    // Phase 1 additions - Business document content types
    'PROPOSAL',
    'CASE_STUDY',
    'FAQ_CONTENT',
    'WELCOME_PACKET',
    'WHITEPAPER',
  ]),
  template: z.string().min(1).max(10000),
  placeholders: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        required: z.boolean().optional(),
      }),
    )
    .optional(),
  systemPrompt: z.string().max(2000).optional(),
  exampleOutputs: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
      }),
    )
    .optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

const approvalWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  steps: z.array(
    z.object({
      stepId: z.string(),
      name: z.string(),
      type: z.enum(['CREATE', 'REVIEW', 'REVISE', 'APPROVE', 'PUBLISH']),
      approverIds: z.array(z.number()).optional(),
      required: z.boolean().optional(),
    }),
  ),
  autoAssign: z.boolean().optional(),
  assignmentRules: z.record(z.string(), z.array(z.number())).optional(),
});

// ============================================================================
// CONFIG ROUTES
// ============================================================================

/**
 * GET /api/content-generator/configs
 * List all content generator configurations (filtered by user access)
 */
router.get(
  '/content-generator/configs',
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
        res
          .status(403)
          .json({ error: 'Forbidden: You do not have access to this client' });
        return;
      }
    }

    const configs = await contentGeneratorService.listContentGeneratorConfigs({
      clientId,
    });
    res.json({ configs });
  },
);

/**
 * GET /api/clients/:clientId/content-generator
 * Get content generator configuration for a client
 */
router.get(
  '/clients/:clientId/content-generator',
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
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const config =
      await contentGeneratorService.getContentGeneratorConfig(clientId);
    res.json({ config });
  },
);

/**
 * POST /api/clients/:clientId/content-generator
 * Create content generator configuration for a client
 */
router.post(
  '/clients/:clientId/content-generator',
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
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = contentGeneratorConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const config = await contentGeneratorService.createContentGeneratorConfig(
        clientId,
        {
          ...parsed.data,
          voiceSamples: parsed.data.voiceSamples as Prisma.InputJsonValue,
          cmsIntegrations: parsed.data.cmsIntegrations as Prisma.InputJsonValue,
          socialIntegrations: parsed.data
            .socialIntegrations as Prisma.InputJsonValue,
          emailIntegrations: parsed.data
            .emailIntegrations as Prisma.InputJsonValue,
        },
      );
      res.status(201).json({ config });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res
          .status(409)
          .json({ error: 'Config already exists for this client' });
        return;
      }
      throw error;
    }
  },
);

/**
 * PATCH /api/clients/:clientId/content-generator
 * Update content generator configuration
 */
router.patch(
  '/clients/:clientId/content-generator',
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
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = contentGeneratorConfigSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await contentGeneratorService.updateContentGeneratorConfig(
      clientId,
      {
        ...parsed.data,
        voiceSamples: parsed.data.voiceSamples as Prisma.InputJsonValue,
        cmsIntegrations: parsed.data.cmsIntegrations as Prisma.InputJsonValue,
        socialIntegrations: parsed.data
          .socialIntegrations as Prisma.InputJsonValue,
        emailIntegrations: parsed.data
          .emailIntegrations as Prisma.InputJsonValue,
      },
    );
    res.json({ config });
  },
);

// ============================================================================
// CONTENT GENERATION ROUTES
// ============================================================================

/**
 * POST /api/content-generator/:configId/generate
 * Generate content
 */
router.post(
  '/content-generator/:configId/generate',
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
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = contentGenerationSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const result = await contentGeneratorService.generateContent(
        configId,
        parsed.data,
      );
      res.status(201).json(result);
    } catch (error) {
      if ((error as Error).message === 'Config not found') {
        res.status(404).json({ error: 'Config not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * GET /api/content-generator/:configId/contents
 * List generated contents
 */
router.get(
  '/content-generator/:configId/contents',
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
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const type = req.query.type as string | undefined;
    const approvalStatus = req.query.status as string | undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const contents = await contentGeneratorService.getContents(configId, {
      type: type as
        | 'SOCIAL_POST'
        | 'EMAIL'
        | 'BLOG_POST'
        | 'AD_COPY'
        | 'LANDING_PAGE'
        | 'NEWSLETTER'
        | 'PRESS_RELEASE'
        | 'PRODUCT_COPY'
        | 'VIDEO_SCRIPT'
        | undefined,
      approvalStatus: approvalStatus as
        | 'DRAFT'
        | 'PENDING_REVIEW'
        | 'REVISION_REQUESTED'
        | 'APPROVED'
        | 'REJECTED'
        | 'PUBLISHED'
        | undefined,
      limit,
      offset,
    });

    res.json({ contents });
  },
);

/**
 * GET /api/content-generator/contents/:id
 * Get a specific content
 */
router.get(
  '/content-generator/contents/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid content ID' });
      return;
    }

    // Authorization check via content
    const clientId = await getClientIdFromGeneratedContent(id);
    if (!clientId) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const content = await contentGeneratorService.getContent(id);
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    res.json({ content });
  },
);

/**
 * PATCH /api/content-generator/contents/:id
 * Update content
 */
router.patch(
  '/content-generator/contents/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid content ID' });
      return;
    }

    // Authorization check via content
    const clientId = await getClientIdFromGeneratedContent(id);
    if (!clientId) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const { title, content, contentHtml, approvalStatus, revisionNotes } =
      req.body as {
        title?: string;
        content?: string;
        contentHtml?: string;
        approvalStatus?:
          | 'DRAFT'
          | 'PENDING_REVIEW'
          | 'REVISION_REQUESTED'
          | 'APPROVED'
          | 'REJECTED'
          | 'PUBLISHED';
        revisionNotes?: string;
      };

    try {
      const updated = await contentGeneratorService.updateContent(id, {
        title,
        content,
        contentHtml,
        approvalStatus,
        revisionNotes,
      });
      res.json({ content: updated });
    } catch (error) {
      if ((error as Error).message === 'Content not found') {
        res.status(404).json({ error: 'Content not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * DELETE /api/content-generator/contents/:id
 * Delete content
 */
router.delete(
  '/content-generator/contents/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid content ID' });
      return;
    }

    // Authorization check via content
    const clientId = await getClientIdFromGeneratedContent(id);
    if (!clientId) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    await contentGeneratorService.deleteContent(id);
    res.status(204).send();
  },
);

// ============================================================================
// APPROVAL ROUTES
// ============================================================================

/**
 * POST /api/content-generator/contents/:id/submit-approval
 * Submit content for approval
 */
router.post(
  '/content-generator/contents/:id/submit-approval',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid content ID' });
      return;
    }

    // Authorization check via content
    const clientId = await getClientIdFromGeneratedContent(id);
    if (!clientId) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const { workflowId } = req.body as { workflowId: number };
    if (!workflowId) {
      res.status(400).json({ error: 'workflowId is required' });
      return;
    }

    try {
      const content = await contentGeneratorService.submitForApproval(
        id,
        workflowId,
      );
      res.json({ content });
    } catch (error) {
      if ((error as Error).message === 'Workflow not found') {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * POST /api/content-generator/contents/:id/approve
 * Approve content
 */
router.post(
  '/content-generator/contents/:id/approve',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid content ID' });
      return;
    }

    // Authorization check via content
    const clientId = await getClientIdFromGeneratedContent(id);
    if (!clientId) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const content = await contentGeneratorService.approveContent(
      id,
      req.userId,
    );
    res.json({ content });
  },
);

/**
 * POST /api/content-generator/contents/:id/reject
 * Reject content with revision notes
 */
router.post(
  '/content-generator/contents/:id/reject',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid content ID' });
      return;
    }

    // Authorization check via content
    const clientId = await getClientIdFromGeneratedContent(id);
    if (!clientId) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const { revisionNotes } = req.body as { revisionNotes: string };
    if (!revisionNotes) {
      res.status(400).json({ error: 'revisionNotes is required' });
      return;
    }

    const content = await contentGeneratorService.rejectContent(
      id,
      req.userId,
      revisionNotes,
    );
    res.json({ content });
  },
);

// ============================================================================
// TEMPLATE ROUTES
// ============================================================================

/**
 * GET /api/content-generator/:configId/templates
 * List content templates
 */
router.get(
  '/content-generator/:configId/templates',
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
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const type = req.query.type as string | undefined;
    const category = req.query.category as string | undefined;
    const isActive =
      req.query.active === 'true'
        ? true
        : req.query.active === 'false'
          ? false
          : undefined;

    const templates = await contentGeneratorService.getContentTemplates(
      configId,
      {
        type: type as
          | 'SOCIAL_POST'
          | 'EMAIL'
          | 'BLOG_POST'
          | 'AD_COPY'
          | 'LANDING_PAGE'
          | 'NEWSLETTER'
          | 'PRESS_RELEASE'
          | 'PRODUCT_COPY'
          | 'VIDEO_SCRIPT'
          | undefined,
        category,
        isActive,
      },
    );

    res.json({ templates });
  },
);

/**
 * POST /api/content-generator/:configId/templates
 * Create a content template
 */
router.post(
  '/content-generator/:configId/templates',
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
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = contentTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const template = await contentGeneratorService.createContentTemplate(
      configId,
      {
        ...parsed.data,
        placeholders: parsed.data.placeholders as Prisma.InputJsonValue,
        exampleOutputs: parsed.data.exampleOutputs as Prisma.InputJsonValue,
      },
    );
    res.status(201).json({ template });
  },
);

/**
 * PATCH /api/content-generator/templates/:id
 * Update a content template
 */
router.patch(
  '/content-generator/templates/:id',
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
    const clientId = await getClientIdFromContentTemplate(id);
    if (!clientId) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = contentTemplateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const template = await contentGeneratorService.updateContentTemplate(id, {
      ...parsed.data,
      placeholders: parsed.data.placeholders as Prisma.InputJsonValue,
      exampleOutputs: parsed.data.exampleOutputs as Prisma.InputJsonValue,
    });
    res.json({ template });
  },
);

/**
 * DELETE /api/content-generator/templates/:id
 * Delete a content template
 */
router.delete(
  '/content-generator/templates/:id',
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
    const clientId = await getClientIdFromContentTemplate(id);
    if (!clientId) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    await contentGeneratorService.deleteContentTemplate(id);
    res.status(204).send();
  },
);

// ============================================================================
// WORKFLOW ROUTES
// ============================================================================

/**
 * GET /api/content-generator/:configId/workflows
 * List approval workflows
 */
router.get(
  '/content-generator/:configId/workflows',
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
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const workflows =
      await contentGeneratorService.getApprovalWorkflows(configId);
    res.json({ workflows });
  },
);

/**
 * POST /api/content-generator/:configId/workflows
 * Create an approval workflow
 */
router.post(
  '/content-generator/:configId/workflows',
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
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = approvalWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const workflow = await contentGeneratorService.createApprovalWorkflow(
      configId,
      {
        ...parsed.data,
        steps: parsed.data.steps as Prisma.InputJsonValue,
        assignmentRules: parsed.data.assignmentRules as Prisma.InputJsonValue,
      },
    );
    res.status(201).json({ workflow });
  },
);

// ============================================================================
// BRAND VOICE TRAINING
// ============================================================================

/**
 * POST /api/content-generator/:configId/train-voice
 * Train brand voice with samples
 */
router.post(
  '/content-generator/:configId/train-voice',
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
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const { samples } = req.body as {
      samples: Array<{ text: string; type: string; source: string }>;
    };

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      res.status(400).json({ error: 'samples array is required' });
      return;
    }

    const config = await contentGeneratorService.trainBrandVoice(
      configId,
      samples,
    );
    res.json({ config });
  },
);

// ============================================================================
// CRM INTEGRATION ROUTES
// ============================================================================

/**
 * GET /api/content-generator/crm-placeholders
 * Get available CRM placeholders for content templates
 */
router.get(
  '/content-generator/crm-placeholders',
  requireAuth,
  async (_req: AuthenticatedRequest, res: Response) => {
    const placeholders = contentGeneratorService.getAvailableCRMPlaceholders();
    res.json({ placeholders });
  },
);

/**
 * GET /api/content-generator/crm-placeholders/account/:accountId
 * Get CRM data preview for a specific account
 */
router.get(
  '/content-generator/crm-placeholders/account/:accountId',
  requireAuth,
  async (req: AuthenticatedRequest<{ accountId: string }>, res: Response) => {
    const accountId = Number(req.params.accountId);
    if (Number.isNaN(accountId)) {
      res.status(400).json({ error: 'Invalid account ID' });
      return;
    }

    try {
      const crmData =
        await contentGeneratorService.getCRMPlaceholdersForAccount(accountId);
      res.json({ crmData });
    } catch (_error) {
      res.status(404).json({ error: 'Account not found' });
    }
  },
);

/**
 * GET /api/content-generator/crm-placeholders/opportunity/:opportunityId
 * Get CRM data preview for a specific opportunity
 */
router.get(
  '/content-generator/crm-placeholders/opportunity/:opportunityId',
  requireAuth,
  async (
    req: AuthenticatedRequest<{ opportunityId: string }>,
    res: Response,
  ) => {
    const opportunityId = Number(req.params.opportunityId);
    if (Number.isNaN(opportunityId)) {
      res.status(400).json({ error: 'Invalid opportunity ID' });
      return;
    }

    try {
      const crmData =
        await contentGeneratorService.getCRMPlaceholdersForOpportunity(
          opportunityId,
        );
      res.json({ crmData });
    } catch (_error) {
      res.status(404).json({ error: 'Opportunity not found' });
    }
  },
);

/**
 * POST /api/content-generator/:configId/generate-for-account/:accountId
 * Generate content personalized for a specific account
 */
router.post(
  '/content-generator/:configId/generate-for-account/:accountId',
  requireAuth,
  async (
    req: AuthenticatedRequest<{ configId: string; accountId: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    const accountId = Number(req.params.accountId);

    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    if (Number.isNaN(accountId)) {
      res.status(400).json({ error: 'Invalid account ID' });
      return;
    }

    // Authorization check via config
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = contentGenerationSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const result = await contentGeneratorService.generateContentForAccount(
        configId,
        accountId,
        parsed.data,
      );
      res.status(201).json(result);
    } catch (error) {
      if ((error as Error).message === 'Account not found') {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      if ((error as Error).message === 'Config not found') {
        res.status(404).json({ error: 'Config not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * POST /api/content-generator/:configId/generate-for-opportunity/:opportunityId
 * Generate content personalized for a specific opportunity
 */
router.post(
  '/content-generator/:configId/generate-for-opportunity/:opportunityId',
  requireAuth,
  async (
    req: AuthenticatedRequest<{ configId: string; opportunityId: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    const opportunityId = Number(req.params.opportunityId);

    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    if (Number.isNaN(opportunityId)) {
      res.status(400).json({ error: 'Invalid opportunity ID' });
      return;
    }

    // Authorization check via config
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = contentGenerationSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const result =
        await contentGeneratorService.generateContentForOpportunity(
          configId,
          opportunityId,
          parsed.data,
        );
      res.status(201).json(result);
    } catch (error) {
      if ((error as Error).message === 'Opportunity not found') {
        res.status(404).json({ error: 'Opportunity not found' });
        return;
      }
      if ((error as Error).message === 'Config not found') {
        res.status(404).json({ error: 'Config not found' });
        return;
      }
      throw error;
    }
  },
);

// ============================================================================
// INTAKE CONTENT INTEGRATION ROUTES
// ============================================================================

const intakeQuestionSchema = z.object({
  industry: z.string().min(1),
  questionType: z.enum([
    'qualification',
    'discovery',
    'screening',
    'onboarding',
  ]),
  targetCount: z.number().int().min(1).max(20).default(5),
  existingQuestions: z.array(z.string()).optional(),
  customContext: z.string().max(1000).optional(),
  includeFollowUps: z.boolean().optional(),
});

const chatbotFlowSchema = z.object({
  industry: z.string().min(1),
  flowType: z.enum([
    'greeting',
    'qualification',
    'faq',
    'scheduling',
    'support',
  ]),
  intents: z.array(z.string()).min(1),
  personality: z
    .enum(['professional', 'friendly', 'casual', 'formal'])
    .default('professional'),
  maxTurns: z.number().int().min(1).max(10).optional(),
});

const faqGenerationSchema = z.object({
  submissionIds: z.array(z.number()).optional(),
  industry: z.string().optional(),
  categories: z.array(z.string()).optional(),
  maxItems: z.number().int().min(1).max(50).default(10),
});

/**
 * POST /api/content-generator/:configId/intake-questions
 * Generate intake form questions by industry
 */
router.post(
  '/content-generator/:configId/intake-questions',
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

    // Authorization check
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = intakeQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const result = await intakeContentService.generateIntakeQuestions(
        parsed.data,
      );
      res.json(result);
    } catch (error) {
      console.error('Error generating intake questions:', error);
      res.status(500).json({ error: 'Failed to generate questions' });
    }
  },
);

/**
 * POST /api/content-generator/:configId/chatbot-flow
 * Generate chatbot conversation flow
 */
router.post(
  '/content-generator/:configId/chatbot-flow',
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

    // Authorization check
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = chatbotFlowSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const result = await intakeContentService.generateChatbotFlow(
        parsed.data,
      );
      res.json(result);
    } catch (error) {
      console.error('Error generating chatbot flow:', error);
      res.status(500).json({ error: 'Failed to generate chatbot flow' });
    }
  },
);

/**
 * POST /api/content-generator/:configId/faq-from-intake
 * Generate FAQ content from intake submissions
 */
router.post(
  '/content-generator/:configId/faq-from-intake',
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

    // Authorization check
    const clientId = await getClientIdFromContentGeneratorConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = faqGenerationSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const result = await intakeContentService.generateFAQFromIntakeData(
        configId,
        parsed.data,
      );
      res.json(result);
    } catch (error) {
      console.error('Error generating FAQ content:', error);
      res.status(500).json({ error: 'Failed to generate FAQ content' });
    }
  },
);

/**
 * GET /api/content-generator/engagement-letter-templates
 * Get available engagement letter templates (shared with Intake module)
 */
router.get(
  '/content-generator/engagement-letter-templates',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const industry = req.query.industry as string | undefined;
    const templates =
      intakeContentService.getEngagementLetterTemplates(industry);
    res.json({ templates });
  },
);

/**
 * GET /api/content-generator/engagement-letter-templates/:templateId
 * Get a specific engagement letter template
 */
router.get(
  '/content-generator/engagement-letter-templates/:templateId',
  requireAuth,
  async (req: AuthenticatedRequest<{ templateId: string }>, res: Response) => {
    const template = intakeContentService.getEngagementLetterTemplate(
      req.params.templateId,
    );
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json({ template });
  },
);

/**
 * POST /api/content-generator/engagement-letter-templates/:templateId/preview
 * Preview an engagement letter with sample data
 */
router.post(
  '/content-generator/engagement-letter-templates/:templateId/preview',
  requireAuth,
  async (req: AuthenticatedRequest<{ templateId: string }>, res: Response) => {
    const sampleData = req.body as Record<string, string>;

    try {
      const preview = intakeContentService.previewEngagementLetter(
        req.params.templateId,
        sampleData,
      );
      res.json({ preview });
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      throw error;
    }
  },
);

export default router;
