/**
 * AI Projects Module Router
 *
 * Provides API endpoints for AI-powered project management features:
 * - Project Assistant (chat-based interactions)
 * - AI Status Summaries
 * - Task Enrichment
 * - Template Matching
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../auth/auth.middleware';
import {
  tenantMiddleware,
  TenantRequest,
} from '../../tenant/tenant.middleware';
import { classifyProjectIntent } from './intents/project.intent';
import {
  handleProjectIntent,
  ProjectContext,
} from './handlers/project.handler';
import { aiStatusService } from './services/ai-status.service';
import { taskEnrichmentService } from './services/task-enrichment.service';
import { templateMatchingService } from './services/template-matching.service';
import { healthPredictionService } from './services/health-prediction.service';
import { scopeDetectionService } from './services/scope-detection.service';
import { riskExtractionService } from './services/risk-extraction.service';
import { digestService } from './services/digest.service';
import { autoSchedulingService } from './services/auto-scheduling.service';
import { smartRemindersService } from './services/smart-reminders.service';
import { projectSimilarityService } from './services/project-similarity.service';
import { documentGeneratorService } from './services/document-generator.service';
import { portfolioDashboardService } from './services/portfolio-dashboard.service';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth, tenantMiddleware);

// Helper to get tenant ID from request
function getTenantId(req: TenantRequest): string {
  const tenantId = req.tenantContext?.tenantId;
  if (!tenantId) {
    throw new Error('Tenant context not available');
  }
  return tenantId;
}

// ============================================================================
// Project Assistant Endpoints
// ============================================================================

/**
 * POST /api/ai-projects/assistant/message
 * Send a message to the project assistant
 */
const assistantMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  projectId: z.number().optional(),
  projectName: z.string().optional(),
  conversationId: z.string().optional(),
});

router.post('/assistant/message', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = assistantMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { message, projectId, projectName } = parsed.data;
    const tenantId = getTenantId(req);
    const userId = req.userId!;

    // Classify the intent
    const classification = await classifyProjectIntent(message);

    // Build context
    const context: ProjectContext = {
      tenantId,
      userId,
      projectId,
      projectName,
    };

    // Handle the intent
    const response = await handleProjectIntent(
      classification.intent,
      message,
      context,
    );

    return res.json({
      data: {
        ...response,
        intent: classification.intent,
        confidence: classification.confidence,
        entities: classification.entities,
      },
    });
  } catch (error) {
    console.error('Project assistant error:', error);
    return res.status(500).json({
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/ai-projects/assistant/classify
 * Classify intent without handling (useful for preview)
 */
router.post(
  '/assistant/classify',
  async (req: TenantRequest, res: Response) => {
    try {
      const { message } = req.body as { message?: string };

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const classification = await classifyProjectIntent(message);

      return res.json({ data: classification });
    } catch (error) {
      console.error('Classification error:', error);
      return res.status(500).json({ error: 'Failed to classify intent' });
    }
  },
);

// ============================================================================
// AI Status Summary Endpoints
// ============================================================================

/**
 * GET /api/ai-projects/status/:projectId/summary
 * Get AI-generated status summary for a project
 */
router.get(
  '/status/:projectId/summary',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const summary = await aiStatusService.generateStatusSummary(
        projectId,
        tenantId,
      );

      // Optionally store for historical tracking
      const store = req.query.store === 'true';
      if (store) {
        await aiStatusService.storeSummary(projectId, tenantId, summary);
      }

      return res.json({ data: summary });
    } catch (error) {
      console.error('Status summary error:', error);
      return res.status(500).json({
        error: 'Failed to generate status summary',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * GET /api/ai-projects/status/:projectId/quick
 * Get quick status one-liner for a project
 */
router.get(
  '/status/:projectId/quick',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const quickStatus = await aiStatusService.generateQuickStatus(
        projectId,
        tenantId,
      );

      return res.json({ data: { status: quickStatus } });
    } catch (error) {
      console.error('Quick status error:', error);
      return res.status(500).json({ error: 'Failed to generate quick status' });
    }
  },
);

// ============================================================================
// Task Enrichment Endpoints
// ============================================================================

/**
 * GET /api/ai-projects/tasks/:taskId/enrich
 * Get AI enrichment suggestions for a task
 */
router.get(
  '/tasks/:taskId/enrich',
  async (req: TenantRequest, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }

      const enrichment = await taskEnrichmentService.enrichTask(
        taskId,
        tenantId,
      );

      return res.json({ data: enrichment });
    } catch (error) {
      console.error('Task enrichment error:', error);
      return res.status(500).json({
        error: 'Failed to enrich task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * POST /api/ai-projects/tasks/:taskId/apply-enrichment
 * Apply selected enrichment suggestions to a task
 */
const applyEnrichmentSchema = z.object({
  acceptedFields: z.array(z.string()),
  enrichment: z.object({
    enhancedDescription: z.string().optional(),
    estimatedHours: z.number().optional(),
    suggestedPriority: z.string().optional(),
    suggestedSubtasks: z
      .array(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          estimatedHours: z.number().optional(),
          order: z.number(),
        }),
      )
      .optional(),
  }),
});

router.post(
  '/tasks/:taskId/apply-enrichment',
  async (req: TenantRequest, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }

      const parsed = applyEnrichmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { acceptedFields, enrichment } = parsed.data;

      await taskEnrichmentService.applyEnrichment(
        taskId,
        tenantId,
        enrichment,
        acceptedFields,
      );

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Apply enrichment error:', error);
      return res.status(500).json({ error: 'Failed to apply enrichment' });
    }
  },
);

/**
 * POST /api/ai-projects/tasks/generate-description
 * Generate a smart description for a task title
 */
const generateDescriptionSchema = z.object({
  title: z.string().min(1),
  projectName: z.string().optional(),
  projectDescription: z.string().optional(),
  templateName: z.string().optional(),
});

router.post(
  '/tasks/generate-description',
  async (req: TenantRequest, res: Response) => {
    try {
      const parsed = generateDescriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { title, ...context } = parsed.data;

      const description = await taskEnrichmentService.generateDescription(
        title,
        context.projectName ? context : undefined,
      );

      return res.json({ data: { description } });
    } catch (error) {
      console.error('Generate description error:', error);
      return res.status(500).json({ error: 'Failed to generate description' });
    }
  },
);

/**
 * POST /api/ai-projects/tasks/estimate-duration
 * Estimate task duration based on title and context
 */
const estimateDurationSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.number(),
});

router.post(
  '/tasks/estimate-duration',
  async (req: TenantRequest, res: Response) => {
    try {
      const parsed = estimateDurationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { title, description, projectId } = parsed.data;
      const tenantId = getTenantId(req);

      const estimate = await taskEnrichmentService.estimateDuration(
        title,
        description || null,
        projectId,
        tenantId,
      );

      return res.json({ data: estimate });
    } catch (error) {
      console.error('Estimate duration error:', error);
      return res.status(500).json({ error: 'Failed to estimate duration' });
    }
  },
);

/**
 * POST /api/ai-projects/tasks/suggest-subtasks
 * Suggest subtasks for breaking down a complex task
 */
const suggestSubtasksSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

router.post(
  '/tasks/suggest-subtasks',
  async (req: TenantRequest, res: Response) => {
    try {
      const parsed = suggestSubtasksSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { title, description } = parsed.data;

      const subtasks = await taskEnrichmentService.suggestSubtasks(
        title,
        description || null,
      );

      return res.json({ data: { subtasks } });
    } catch (error) {
      console.error('Suggest subtasks error:', error);
      return res.status(500).json({ error: 'Failed to suggest subtasks' });
    }
  },
);

/**
 * POST /api/ai-projects/tasks/:taskId/record-completion
 * Record actual task completion time for learning
 */
const recordCompletionSchema = z.object({
  actualHours: z.number().min(0),
});

router.post(
  '/tasks/:taskId/record-completion',
  async (req: TenantRequest, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }

      const parsed = recordCompletionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { actualHours } = parsed.data;

      await taskEnrichmentService.recordTaskCompletion(
        taskId,
        tenantId,
        actualHours,
      );

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Record completion error:', error);
      return res.status(500).json({ error: 'Failed to record completion' });
    }
  },
);

// ============================================================================
// Template Matching Endpoints
// ============================================================================

/**
 * POST /api/ai-projects/templates/suggest
 * Get template suggestions for a project
 */
const suggestTemplatesSchema = z.object({
  projectName: z.string().min(1),
  projectDescription: z.string().optional(),
  limit: z.number().min(1).max(10).optional(),
});

router.post('/templates/suggest', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = suggestTemplatesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { projectName, projectDescription, limit } = parsed.data;
    const tenantId = getTenantId(req);

    const suggestions = await templateMatchingService.suggestTemplates(
      projectName,
      projectDescription || null,
      tenantId,
      limit,
    );

    return res.json({ data: { templates: suggestions } });
  } catch (error) {
    console.error('Suggest templates error:', error);
    return res.status(500).json({ error: 'Failed to suggest templates' });
  }
});

/**
 * POST /api/ai-projects/templates/apply
 * Apply a template to a project
 */
const applyTemplateSchema = z.object({
  projectId: z.number(),
  templateId: z.number(),
  adjustDates: z.boolean().optional(),
  assignOwnerToTasks: z.boolean().optional(),
  baselineStartDate: z.string().datetime().optional(),
});

router.post('/templates/apply', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = applyTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const {
      projectId,
      templateId,
      adjustDates,
      assignOwnerToTasks,
      baselineStartDate,
    } = parsed.data;
    const tenantId = getTenantId(req);

    const result = await templateMatchingService.applyTemplate(
      projectId,
      templateId,
      tenantId,
      {
        adjustDates,
        assignOwnerToTasks,
        baselineStartDate: baselineStartDate
          ? new Date(baselineStartDate)
          : undefined,
      },
    );

    return res.json({ data: result });
  } catch (error) {
    console.error('Apply template error:', error);
    return res.status(500).json({
      error: 'Failed to apply template',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/ai-projects/templates/create-from-project
 * Create a template from an existing project
 */
const createFromProjectSchema = z.object({
  projectId: z.number(),
  templateName: z.string().min(1).max(255),
  templateDescription: z.string().max(1000).optional(),
});

router.post(
  '/templates/create-from-project',
  async (req: TenantRequest, res: Response) => {
    try {
      const parsed = createFromProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { projectId, templateName, templateDescription } = parsed.data;
      const tenantId = getTenantId(req);

      const templateId =
        await templateMatchingService.createTemplateFromProject(
          projectId,
          tenantId,
          templateName,
          templateDescription,
        );

      return res.json({ data: { templateId } });
    } catch (error) {
      console.error('Create template error:', error);
      return res.status(500).json({
        error: 'Failed to create template from project',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

// ============================================================================
// Phase 2: Health Prediction Endpoints
// ============================================================================

/**
 * GET /api/ai-projects/health/:projectId/predict
 * Get health prediction for a project
 */
router.get(
  '/health/:projectId/predict',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);
      const windowDays = parseInt(req.query.windowDays as string, 10) || 14;

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const prediction = await healthPredictionService.predictHealth(
        projectId,
        tenantId,
        windowDays,
      );

      return res.json({ data: prediction });
    } catch (error) {
      console.error('Health prediction error:', error);
      return res.status(500).json({ error: 'Failed to predict health' });
    }
  },
);

/**
 * GET /api/ai-projects/health/portfolio
 * Get health predictions for all active projects
 */
router.get('/health/portfolio', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const windowDays = parseInt(req.query.windowDays as string, 10) || 14;

    const predictions = await healthPredictionService.getPredictionsForTenant(
      tenantId,
      windowDays,
    );

    return res.json({ data: { predictions } });
  } catch (error) {
    console.error('Portfolio prediction error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to get portfolio predictions' });
  }
});

// ============================================================================
// Phase 2: Scope Detection Endpoints
// ============================================================================

/**
 * POST /api/ai-projects/scope/:projectId/baseline
 * Create a scope baseline for a project
 */
router.post(
  '/scope/:projectId/baseline',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);
      const { description } = req.body as { description?: string };

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const baseline = await scopeDetectionService.createBaseline(
        projectId,
        tenantId,
        description,
      );

      return res.json({ data: baseline });
    } catch (error) {
      console.error('Baseline creation error:', error);
      return res.status(500).json({ error: 'Failed to create baseline' });
    }
  },
);

/**
 * GET /api/ai-projects/scope/:projectId/analyze
 * Analyze scope changes for a project
 */
router.get(
  '/scope/:projectId/analyze',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const analysis = await scopeDetectionService.analyzeScope(
        projectId,
        tenantId,
      );

      return res.json({ data: analysis });
    } catch (error) {
      console.error('Scope analysis error:', error);
      return res.status(500).json({ error: 'Failed to analyze scope' });
    }
  },
);

/**
 * GET /api/ai-projects/scope/:projectId/changes
 * Get scope change history for a project
 */
router.get(
  '/scope/:projectId/changes',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);
      const limit = parseInt(req.query.limit as string, 10) || 50;

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const changes = await scopeDetectionService.getChangeHistory(
        projectId,
        tenantId,
        limit,
      );

      return res.json({ data: { changes } });
    } catch (error) {
      console.error('Get changes error:', error);
      return res.status(500).json({ error: 'Failed to get scope changes' });
    }
  },
);

/**
 * POST /api/ai-projects/scope/:projectId/detect
 * Run scope change detection
 */
router.post(
  '/scope/:projectId/detect',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const changes = await scopeDetectionService.detectChanges(
        projectId,
        tenantId,
      );

      return res.json({ data: { changes, count: changes.length } });
    } catch (error) {
      console.error('Detect changes error:', error);
      return res.status(500).json({ error: 'Failed to detect changes' });
    }
  },
);

/**
 * POST /api/ai-projects/scope/changes/:changeId/acknowledge
 * Acknowledge a scope change
 */
router.post(
  '/scope/changes/:changeId/acknowledge',
  async (req: TenantRequest, res: Response) => {
    try {
      const changeId = parseInt(req.params.changeId, 10);
      const tenantId = getTenantId(req);
      const userId = req.userId!;

      if (isNaN(changeId)) {
        return res.status(400).json({ error: 'Invalid change ID' });
      }

      await scopeDetectionService.acknowledgeChange(changeId, userId, tenantId);

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Acknowledge change error:', error);
      return res.status(500).json({ error: 'Failed to acknowledge change' });
    }
  },
);

// ============================================================================
// Phase 2: Risk Extraction Endpoints
// ============================================================================

/**
 * POST /api/ai-projects/risks/extract/meeting/:meetingId
 * Extract risks from meeting notes
 */
router.post(
  '/risks/extract/meeting/:meetingId',
  async (req: TenantRequest, res: Response) => {
    try {
      const meetingId = parseInt(req.params.meetingId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(meetingId)) {
        return res.status(400).json({ error: 'Invalid meeting ID' });
      }

      const result = await riskExtractionService.extractFromMeeting(
        meetingId,
        tenantId,
      );

      return res.json({ data: result });
    } catch (error) {
      console.error('Risk extraction error:', error);
      return res.status(500).json({ error: 'Failed to extract risks' });
    }
  },
);

/**
 * POST /api/ai-projects/risks/extract/text
 * Extract risks from arbitrary text
 */
const extractFromTextSchema = z.object({
  text: z.string().min(1).max(10000),
  projectId: z.number(),
  context: z.string().optional(),
});

router.post(
  '/risks/extract/text',
  async (req: TenantRequest, res: Response) => {
    try {
      const parsed = extractFromTextSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { text, projectId, context } = parsed.data;
      const tenantId = getTenantId(req);

      const result = await riskExtractionService.extractFromText(
        text,
        projectId,
        tenantId,
        context ? { context } : undefined,
      );

      return res.json({ data: result });
    } catch (error) {
      console.error('Text extraction error:', error);
      return res.status(500).json({ error: 'Failed to extract from text' });
    }
  },
);

/**
 * GET /api/ai-projects/risks/:projectId
 * Get all risks for a project
 */
router.get('/risks/:projectId', async (req: TenantRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const tenantId = getTenantId(req);

    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const risks = await riskExtractionService.getProjectRisks(
      projectId,
      tenantId,
    );

    return res.json({ data: { risks } });
  } catch (error) {
    console.error('Get risks error:', error);
    return res.status(500).json({ error: 'Failed to get risks' });
  }
});

/**
 * GET /api/ai-projects/risks/:projectId/trends
 * Get risk trends for a project
 */
router.get(
  '/risks/:projectId/trends',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const trends = await riskExtractionService.analyzeRiskTrends(
        projectId,
        tenantId,
      );

      return res.json({ data: trends });
    } catch (error) {
      console.error('Risk trends error:', error);
      return res.status(500).json({ error: 'Failed to analyze risk trends' });
    }
  },
);

// ============================================================================
// Phase 3: Digest Endpoints
// ============================================================================

/**
 * POST /api/ai-projects/digests/config
 * Create or update digest configuration
 */
const digestConfigSchema = z.object({
  id: z.number().optional(),
  projectId: z.number(),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1),
  recipientRole: z.enum(['EXECUTIVE', 'MANAGER', 'TEAM_LEAD', 'STAKEHOLDER']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  preferredDay: z.number().min(0).max(6).optional(),
  preferredTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  includeMetrics: z.boolean(),
  includeRisks: z.boolean(),
  includeActionItems: z.boolean(),
  customSections: z.array(z.string()).optional(),
  enabled: z.boolean(),
});

router.post('/digests/config', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = digestConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const tenantId = getTenantId(req);
    const config = await digestService.configureDigest(parsed.data, tenantId);

    return res.json({ data: config });
  } catch (error) {
    console.error('Digest config error:', error);
    return res.status(500).json({ error: 'Failed to configure digest' });
  }
});

/**
 * GET /api/ai-projects/digests/:projectId/configs
 * Get digest configurations for a project
 */
router.get(
  '/digests/:projectId/configs',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const configs = await digestService.getDigestConfigs(projectId, tenantId);

      return res.json({ data: { configs } });
    } catch (error) {
      console.error('Get configs error:', error);
      return res.status(500).json({ error: 'Failed to get digest configs' });
    }
  },
);

/**
 * POST /api/ai-projects/digests/:projectId/preview
 * Generate a digest preview without sending
 */
router.post(
  '/digests/:projectId/preview',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const parsed = digestConfigSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const config = {
        projectId,
        recipientEmail: parsed.data.recipientEmail || 'preview@example.com',
        recipientName: parsed.data.recipientName || 'Preview User',
        recipientRole: parsed.data.recipientRole || 'MANAGER',
        frequency: parsed.data.frequency || 'WEEKLY',
        includeMetrics: parsed.data.includeMetrics ?? true,
        includeRisks: parsed.data.includeRisks ?? true,
        includeActionItems: parsed.data.includeActionItems ?? true,
        enabled: true,
      } as Parameters<typeof digestService.generateDigest>[2];

      const content = await digestService.generateDigest(
        projectId,
        tenantId,
        config,
      );

      return res.json({ data: content });
    } catch (error) {
      console.error('Digest preview error:', error);
      return res
        .status(500)
        .json({ error: 'Failed to generate digest preview' });
    }
  },
);

// ============================================================================
// Phase 3: Auto-Scheduling Endpoints
// ============================================================================

/**
 * POST /api/ai-projects/scheduling/:projectId/generate
 * Generate an optimized schedule for a project
 */
const scheduleRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  respectDependencies: z.boolean().default(true),
  considerAvailability: z.boolean().default(true),
  allowWeekends: z.boolean().default(false),
  workingHoursPerDay: z.number().min(1).max(24).default(8),
});

router.post(
  '/scheduling/:projectId/generate',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const parsed = scheduleRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const request = {
        projectId,
        ...parsed.data,
        startDate: parsed.data.startDate
          ? new Date(parsed.data.startDate)
          : undefined,
        endDate: parsed.data.endDate
          ? new Date(parsed.data.endDate)
          : undefined,
      };

      const schedule = await autoSchedulingService.scheduleProject(
        request,
        tenantId,
      );

      return res.json({ data: schedule });
    } catch (error) {
      console.error('Schedule generation error:', error);
      return res.status(500).json({ error: 'Failed to generate schedule' });
    }
  },
);

/**
 * POST /api/ai-projects/scheduling/:projectId/apply
 * Apply generated schedule to project tasks
 */
router.post(
  '/scheduling/:projectId/apply',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const { schedule } = req.body as { schedule?: unknown };
      if (!schedule) {
        return res.status(400).json({ error: 'Schedule data required' });
      }

      await autoSchedulingService.applySchedule(
        schedule as Parameters<typeof autoSchedulingService.applySchedule>[0],
        tenantId,
      );

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Apply schedule error:', error);
      return res.status(500).json({ error: 'Failed to apply schedule' });
    }
  },
);

/**
 * GET /api/ai-projects/scheduling/tasks/:taskId/suggest
 * Get scheduling suggestion for a single task
 */
router.get(
  '/scheduling/tasks/:taskId/suggest',
  async (req: TenantRequest, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }

      const suggestion = await autoSchedulingService.suggestTaskSchedule(
        taskId,
        tenantId,
      );

      return res.json({ data: suggestion });
    } catch (error) {
      console.error('Task schedule suggestion error:', error);
      return res.status(500).json({ error: 'Failed to suggest schedule' });
    }
  },
);

/**
 * POST /api/ai-projects/scheduling/dependencies
 * Add a task dependency
 */
const addDependencySchema = z.object({
  dependentTaskId: z.number(),
  dependsOnTaskId: z.number(),
  dependencyType: z
    .enum(['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH'])
    .optional(),
  lagDays: z.number().optional(),
});

router.post(
  '/scheduling/dependencies',
  async (req: TenantRequest, res: Response) => {
    try {
      const parsed = addDependencySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const tenantId = getTenantId(req);
      const { dependentTaskId, dependsOnTaskId, dependencyType, lagDays } =
        parsed.data;

      await autoSchedulingService.addDependency(
        dependentTaskId,
        dependsOnTaskId,
        tenantId,
        { dependencyType, lagDays },
      );

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Add dependency error:', error);
      return res.status(500).json({
        error: 'Failed to add dependency',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

// ============================================================================
// Phase 3: Smart Reminders Endpoints
// ============================================================================

/**
 * GET /api/ai-projects/reminders/my
 * Get pending reminders for the current user
 */
router.get('/reminders/my', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const tenantId = getTenantId(req);
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const reminders = await smartRemindersService.getPendingReminders(
      userId,
      tenantId,
      limit,
    );

    return res.json({ data: { reminders } });
  } catch (error) {
    console.error('Get reminders error:', error);
    return res.status(500).json({ error: 'Failed to get reminders' });
  }
});

/**
 * POST /api/ai-projects/reminders/generate
 * Generate reminders for the current user
 */
router.post(
  '/reminders/generate',
  async (req: TenantRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const tenantId = getTenantId(req);

      const reminders = await smartRemindersService.generateRemindersForUser(
        userId,
        tenantId,
      );

      return res.json({ data: { reminders, count: reminders.length } });
    } catch (error) {
      console.error('Generate reminders error:', error);
      return res.status(500).json({ error: 'Failed to generate reminders' });
    }
  },
);

/**
 * POST /api/ai-projects/reminders/:reminderId/dismiss
 * Dismiss a reminder
 */
router.post(
  '/reminders/:reminderId/dismiss',
  async (req: TenantRequest, res: Response) => {
    try {
      const reminderId = parseInt(req.params.reminderId, 10);
      const userId = req.userId!;
      const tenantId = getTenantId(req);

      if (isNaN(reminderId)) {
        return res.status(400).json({ error: 'Invalid reminder ID' });
      }

      await smartRemindersService.dismissReminder(reminderId, userId, tenantId);

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Dismiss reminder error:', error);
      return res.status(500).json({ error: 'Failed to dismiss reminder' });
    }
  },
);

/**
 * POST /api/ai-projects/reminders/:reminderId/snooze
 * Snooze a reminder
 */
const snoozeSchema = z.object({
  snoozeUntil: z.string().datetime(),
});

router.post(
  '/reminders/:reminderId/snooze',
  async (req: TenantRequest, res: Response) => {
    try {
      const reminderId = parseInt(req.params.reminderId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(reminderId)) {
        return res.status(400).json({ error: 'Invalid reminder ID' });
      }

      const parsed = snoozeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      await smartRemindersService.snoozeReminder(
        reminderId,
        tenantId,
        new Date(parsed.data.snoozeUntil),
      );

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Snooze reminder error:', error);
      return res.status(500).json({ error: 'Failed to snooze reminder' });
    }
  },
);

/**
 * POST /api/ai-projects/reminders/:reminderId/action-taken
 * Mark a reminder as acted upon
 */
router.post(
  '/reminders/:reminderId/action-taken',
  async (req: TenantRequest, res: Response) => {
    try {
      const reminderId = parseInt(req.params.reminderId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(reminderId)) {
        return res.status(400).json({ error: 'Invalid reminder ID' });
      }

      await smartRemindersService.markActionTaken(reminderId, tenantId);

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Mark action error:', error);
      return res.status(500).json({ error: 'Failed to mark action taken' });
    }
  },
);

/**
 * GET /api/ai-projects/reminders/stats
 * Get reminder statistics for the current user
 */
router.get('/reminders/stats', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const tenantId = getTenantId(req);
    const days = parseInt(req.query.days as string, 10) || 30;

    const stats = await smartRemindersService.getReminderStats(
      userId,
      tenantId,
      days,
    );

    return res.json({ data: stats });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ error: 'Failed to get reminder stats' });
  }
});

// ============================================================================
// Phase 4: Project Similarity & Lessons Learned Endpoints
// ============================================================================

/**
 * POST /api/ai-projects/similarity/search
 * Find similar projects based on project or description
 */
const similaritySearchSchema = z.object({
  projectId: z.number().optional(),
  description: z.string().optional(),
  limit: z.number().min(1).max(50).optional(),
  minSimilarity: z.number().min(0).max(100).optional(),
});

router.post('/similarity/search', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = similaritySearchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { projectId, description, limit, minSimilarity } = parsed.data;
    const tenantId = getTenantId(req);

    if (!projectId && !description) {
      return res
        .status(400)
        .json({ error: 'Either projectId or description is required' });
    }

    const result = await projectSimilarityService.findSimilarProjects(
      { projectId, description },
      tenantId,
      { limit, minSimilarity },
    );

    return res.json({ data: result });
  } catch (error) {
    console.error('Similarity search error:', error);
    return res.status(500).json({ error: 'Failed to search similar projects' });
  }
});

/**
 * GET /api/ai-projects/lessons/:projectId
 * Get lessons learned for a project
 */
router.get('/lessons/:projectId', async (req: TenantRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const tenantId = getTenantId(req);

    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const lessons = await projectSimilarityService.getProjectLessons(
      projectId,
      tenantId,
    );

    return res.json({ data: { lessons } });
  } catch (error) {
    console.error('Get lessons error:', error);
    return res.status(500).json({ error: 'Failed to get lessons' });
  }
});

/**
 * POST /api/ai-projects/lessons/:projectId
 * Add a lesson learned to a project
 */
const addLessonSchema = z.object({
  category: z.enum(['SUCCESS', 'CHALLENGE', 'IMPROVEMENT', 'WARNING']),
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(2000),
  impact: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  tags: z.array(z.string()).optional(),
});

router.post(
  '/lessons/:projectId',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const parsed = addLessonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const lesson = await projectSimilarityService.addLessonLearned(
        projectId,
        tenantId,
        parsed.data,
      );

      return res.json({ data: lesson });
    } catch (error) {
      console.error('Add lesson error:', error);
      return res.status(500).json({ error: 'Failed to add lesson' });
    }
  },
);

/**
 * POST /api/ai-projects/lessons/:projectId/extract
 * AI-extract lessons from a project
 */
router.post(
  '/lessons/:projectId/extract',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const lessons = await projectSimilarityService.extractLessonsFromProject(
        projectId,
        tenantId,
      );

      return res.json({ data: { lessons, count: lessons.length } });
    } catch (error) {
      console.error('Extract lessons error:', error);
      return res.status(500).json({ error: 'Failed to extract lessons' });
    }
  },
);

/**
 * POST /api/ai-projects/lessons/search
 * Search lessons across all projects
 */
const searchLessonsSchema = z.object({
  query: z.string().min(1),
  categories: z.array(z.string()).optional(),
  impacts: z.array(z.string()).optional(),
  limit: z.number().min(1).max(50).optional(),
});

router.post('/lessons/search', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = searchLessonsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { query, categories, impacts, limit } = parsed.data;
    const tenantId = getTenantId(req);

    const lessons = await projectSimilarityService.searchLessons(
      tenantId,
      query,
      { categories, impacts, limit },
    );

    return res.json({ data: { lessons } });
  } catch (error) {
    console.error('Search lessons error:', error);
    return res.status(500).json({ error: 'Failed to search lessons' });
  }
});

// ============================================================================
// Phase 4: Document Generation Endpoints
// ============================================================================

/**
 * GET /api/ai-projects/documents/templates
 * Get available document templates
 */
router.get(
  '/documents/templates',
  async (_req: TenantRequest, res: Response) => {
    try {
      const templates = documentGeneratorService.getTemplates();
      return res.json({ data: { templates } });
    } catch (error) {
      console.error('Get templates error:', error);
      return res.status(500).json({ error: 'Failed to get templates' });
    }
  },
);

/**
 * GET /api/ai-projects/documents/templates/:type
 * Get a specific document template
 */
router.get(
  '/documents/templates/:type',
  async (req: TenantRequest, res: Response) => {
    try {
      const type = req.params.type as Parameters<
        typeof documentGeneratorService.getTemplate
      >[0];
      const template = documentGeneratorService.getTemplate(type);

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      return res.json({ data: template });
    } catch (error) {
      console.error('Get template error:', error);
      return res.status(500).json({ error: 'Failed to get template' });
    }
  },
);

/**
 * POST /api/ai-projects/documents/:projectId/generate
 * Generate a document for a project
 */
const generateDocumentSchema = z.object({
  type: z.enum([
    'PROJECT_CHARTER',
    'STATEMENT_OF_WORK',
    'EXECUTIVE_SUMMARY',
    'STATUS_REPORT',
    'CLOSURE_REPORT',
  ]),
  input: z
    .object({
      objectives: z.array(z.string()).optional(),
      scope: z
        .object({
          inScope: z.array(z.string()).optional(),
          outOfScope: z.array(z.string()).optional(),
        })
        .optional(),
      budget: z.number().optional(),
      customFields: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

router.post(
  '/documents/:projectId/generate',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const parsed = generateDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { type, input } = parsed.data;

      const document = await documentGeneratorService.generateDocument(
        projectId,
        tenantId,
        type,
        input as Parameters<
          typeof documentGeneratorService.generateDocument
        >[3],
      );

      return res.json({ data: document });
    } catch (error) {
      console.error('Generate document error:', error);
      return res.status(500).json({ error: 'Failed to generate document' });
    }
  },
);

/**
 * GET /api/ai-projects/documents/:projectId
 * Get saved documents for a project
 */
router.get(
  '/documents/:projectId',
  async (req: TenantRequest, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const documents = await documentGeneratorService.getProjectDocuments(
        projectId,
        tenantId,
      );

      return res.json({ data: { documents } });
    } catch (error) {
      console.error('Get documents error:', error);
      return res.status(500).json({ error: 'Failed to get documents' });
    }
  },
);

/**
 * GET /api/ai-projects/documents/view/:documentId
 * Get a specific document
 */
router.get(
  '/documents/view/:documentId',
  async (req: TenantRequest, res: Response) => {
    try {
      const documentId = parseInt(req.params.documentId, 10);
      const tenantId = getTenantId(req);

      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      const document = await documentGeneratorService.getDocument(
        documentId,
        tenantId,
      );

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      return res.json({ data: document });
    } catch (error) {
      console.error('Get document error:', error);
      return res.status(500).json({ error: 'Failed to get document' });
    }
  },
);

/**
 * PUT /api/ai-projects/documents/:documentId/sections/:sectionId
 * Update a document section
 */
const updateSectionSchema = z.object({
  content: z.string().min(1),
});

router.put(
  '/documents/:documentId/sections/:sectionId',
  async (req: TenantRequest, res: Response) => {
    try {
      const documentId = parseInt(req.params.documentId, 10);
      const sectionId = req.params.sectionId;
      const tenantId = getTenantId(req);

      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      const parsed = updateSectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const document = await documentGeneratorService.updateDocumentSection(
        documentId,
        tenantId,
        sectionId,
        parsed.data.content,
      );

      return res.json({ data: document });
    } catch (error) {
      console.error('Update section error:', error);
      return res.status(500).json({ error: 'Failed to update section' });
    }
  },
);

/**
 * GET /api/ai-projects/documents/:documentId/export
 * Export document to different formats
 */
router.get(
  '/documents/:documentId/export',
  async (req: TenantRequest, res: Response) => {
    try {
      const documentId = parseInt(req.params.documentId, 10);
      const tenantId = getTenantId(req);
      const format =
        (req.query.format as 'markdown' | 'html' | 'text') || 'markdown';

      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      const exported = await documentGeneratorService.exportDocument(
        documentId,
        tenantId,
        format,
      );

      // Set appropriate content type
      const contentTypes: Record<string, string> = {
        markdown: 'text/markdown',
        html: 'text/html',
        text: 'text/plain',
      };

      res.setHeader('Content-Type', contentTypes[format] || 'text/plain');
      return res.send(exported);
    } catch (error) {
      console.error('Export document error:', error);
      return res.status(500).json({ error: 'Failed to export document' });
    }
  },
);

// ============================================================================
// Phase 4: Portfolio Dashboard Endpoints
// ============================================================================

/**
 * GET /api/ai-projects/portfolio/summary
 * Get portfolio summary metrics
 */
router.get('/portfolio/summary', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const summary =
      await portfolioDashboardService.getPortfolioSummary(tenantId);
    return res.json({ data: summary });
  } catch (error) {
    console.error('Portfolio summary error:', error);
    return res.status(500).json({ error: 'Failed to get portfolio summary' });
  }
});

/**
 * GET /api/ai-projects/portfolio/projects
 * Get detailed project list with health and metrics
 */
const _portfolioProjectsSchema = z.object({
  status: z.array(z.string()).optional(),
  healthStatus: z.array(z.string()).optional(),
  sortBy: z.enum(['health', 'progress', 'name', 'risk']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
});

router.get('/portfolio/projects', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    // Parse query params
    const options: z.infer<typeof _portfolioProjectsSchema> = {};
    if (req.query.status) {
      options.status = (req.query.status as string).split(',');
    }
    if (req.query.healthStatus) {
      options.healthStatus = (req.query.healthStatus as string).split(',');
    }
    if (req.query.sortBy) {
      options.sortBy = req.query.sortBy as
        | 'health'
        | 'progress'
        | 'name'
        | 'risk';
    }
    if (req.query.sortOrder) {
      options.sortOrder = req.query.sortOrder as 'asc' | 'desc';
    }
    if (req.query.limit) {
      options.limit = parseInt(req.query.limit as string, 10);
    }

    const projects = await portfolioDashboardService.getPortfolioProjects(
      tenantId,
      options,
    );

    return res.json({ data: { projects } });
  } catch (error) {
    console.error('Portfolio projects error:', error);
    return res.status(500).json({ error: 'Failed to get portfolio projects' });
  }
});

/**
 * GET /api/ai-projects/portfolio/risk-heatmap
 * Get risk heatmap and trends
 */
router.get(
  '/portfolio/risk-heatmap',
  async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const heatmap = await portfolioDashboardService.getRiskHeatmap(tenantId);
      return res.json({ data: heatmap });
    } catch (error) {
      console.error('Risk heatmap error:', error);
      return res.status(500).json({ error: 'Failed to get risk heatmap' });
    }
  },
);

/**
 * GET /api/ai-projects/portfolio/resources
 * Get resource utilization analysis
 */
router.get(
  '/portfolio/resources',
  async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const resources =
        await portfolioDashboardService.getResourceAnalysis(tenantId);
      return res.json({ data: resources });
    } catch (error) {
      console.error('Resource analysis error:', error);
      return res.status(500).json({ error: 'Failed to get resource analysis' });
    }
  },
);

/**
 * GET /api/ai-projects/portfolio/insights
 * Generate AI-powered portfolio insights
 */
router.get('/portfolio/insights', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const insights = await portfolioDashboardService.generateInsights(tenantId);
    return res.json({ data: insights });
  } catch (error) {
    console.error('Portfolio insights error:', error);
    return res.status(500).json({ error: 'Failed to generate insights' });
  }
});

/**
 * GET /api/ai-projects/portfolio/attention
 * Get projects needing attention
 */
router.get(
  '/portfolio/attention',
  async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const projects =
        await portfolioDashboardService.getProjectsNeedingAttention(
          tenantId,
          limit,
        );

      return res.json({ data: projects });
    } catch (error) {
      console.error('Attention projects error:', error);
      return res
        .status(500)
        .json({ error: 'Failed to get projects needing attention' });
    }
  },
);

export default router;
