/**
 * Tool 1.1: Customer Service Chatbot Router
 *
 * API endpoints for chatbot configuration, conversations, and analytics
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, ConversationStatus } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import {
  tenantMiddleware,
  requireTenant,
  type TenantRequest,
} from '../../tenant/tenant.middleware';
import * as chatbotService from './chatbot.service';

const router = Router();

// Apply tenant middleware to all routes that require authentication
// This ensures tenant context is available for multi-tenant isolation
router.use(requireAuth, tenantMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const chatbotConfigSchema = z.object({
  name: z.string().min(1).max(100),
  welcomeMessage: z.string().max(500).optional(),
  fallbackMessage: z.string().max(500).optional(),
  enableOrderTracking: z.boolean().optional(),
  enableReturns: z.boolean().optional(),
  enableFAQ: z.boolean().optional(),
  enableHumanHandoff: z.boolean().optional(),
  channelSettings: z.record(z.string(), z.unknown()).optional(),
  businessHours: z.record(z.string(), z.unknown()).optional(),
  // Widget customization fields
  widgetPosition: z.enum(['bottom-right', 'bottom-left']).optional(),
  widgetPrimaryColor: z.string().max(20).optional(),
  widgetTextColor: z.string().max(20).optional(),
  widgetBubbleIcon: z.enum(['chat', 'message', 'support']).optional(),
  widgetTitle: z.string().max(100).nullable().optional(),
  widgetSubtitle: z.string().max(200).nullable().optional(),
  widgetAvatarUrl: z.string().max(500).nullable().optional(),
  widgetAllowedDomains: z.string().max(1000).nullable().optional(),
  widgetCustomCss: z.string().max(5000).nullable().optional(),
});

const conversationCreateSchema = z.object({
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
  channel: z
    .enum([
      'WEB',
      'SMS',
      'FACEBOOK_MESSENGER',
      'WHATSAPP',
      'INSTAGRAM_DM',
      'EMAIL',
    ])
    .optional(),
});

const messageSchema = z.object({
  content: z.string().min(1).max(5000),
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
});

const knowledgeBaseItemSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  keywords: z.array(z.string()).optional(),
  category: z.string().max(100).optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

const feedbackSchema = z.object({
  helpful: z.boolean(),
});

// ============================================================================
// CHATBOT CONFIG ROUTES
// ============================================================================

/**
 * GET /api/chatbot/configs
 * List all chatbot configurations (with optional filtering)
 */
router.get(
  '/chatbot/configs',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
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

    // Use accountId (frontend now sends account IDs via the clientId param)
    const configs = await chatbotService.listChatbotConfigs({
      accountId: clientId,
    });
    res.json({ configs });
  },
);

/**
 * GET /api/clients/:clientId/chatbot
 * Get chatbot configuration for a client
 */
router.get(
  '/clients/:clientId/chatbot',
  requireTenant,
  async (
    req: TenantRequest & { params: { clientId: string } },
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    // Use accountId (frontend now sends account IDs via the clientId param)
    const config = await chatbotService.getChatbotConfig(undefined, clientId);
    res.json({ config });
  },
);

/**
 * POST /api/clients/:clientId/chatbot
 * Create chatbot configuration for a client
 */
router.post(
  '/clients/:clientId/chatbot',
  requireTenant,
  async (
    req: TenantRequest & { params: { clientId: string } },
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const parsed = chatbotConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      // Use accountId (frontend now sends account IDs via the clientId param)
      const config = await chatbotService.createChatbotConfig({
        accountId: clientId,
        ...parsed.data,
        channelSettings: parsed.data.channelSettings as Prisma.InputJsonValue,
        businessHours: parsed.data.businessHours as Prisma.InputJsonValue,
      });
      res.status(201).json({ config });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res
          .status(409)
          .json({ error: 'Chatbot config already exists for this account' });
        return;
      }
      throw error;
    }
  },
);

/**
 * PATCH /api/clients/:clientId/chatbot
 * Update chatbot configuration
 */
router.patch(
  '/clients/:clientId/chatbot',
  requireTenant,
  async (
    req: TenantRequest & { params: { clientId: string } },
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const parsed = chatbotConfigSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    // Use accountId (frontend now sends account IDs via the clientId param)
    const config = await chatbotService.updateChatbotConfig(
      {
        ...parsed.data,
        channelSettings: parsed.data.channelSettings as Prisma.InputJsonValue,
        businessHours: parsed.data.businessHours as Prisma.InputJsonValue,
      },
      undefined,
      clientId,
    );
    res.json({ config });
  },
);

// ============================================================================
// CONVERSATION ROUTES
// ============================================================================

/**
 * POST /api/chatbot/:configId/conversations
 * Start a new conversation
 */
router.post(
  '/chatbot/:configId/conversations',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = conversationCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const conversation = await chatbotService.createConversation(
        configId,
        parsed.data,
      );
      res.status(201).json({ conversation });
    } catch (error) {
      console.error('Failed to create conversation:', error);
      if (
        error instanceof Error &&
        error.message.includes('Foreign key constraint')
      ) {
        res.status(404).json({ error: 'Chatbot configuration not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  },
);

/**
 * GET /api/chatbot/conversations/:sessionId
 * Get conversation by session ID
 */
router.get(
  '/chatbot/conversations/:sessionId',
  async (req: AuthenticatedRequest<{ sessionId: string }>, res: Response) => {
    const { sessionId } = req.params;

    try {
      const conversation = await chatbotService.getConversation(sessionId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      res.json({ conversation });
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  },
);

/**
 * GET /api/chatbot/:configId/conversations
 * List conversations for a chatbot config (admin view)
 */
router.get(
  '/chatbot/:configId/conversations',
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

    const status = req.query.status as string | undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const conversations = await chatbotService.getConversationsByConfig(
      configId,
      {
        status: status as
          | 'ACTIVE'
          | 'ESCALATED'
          | 'RESOLVED'
          | 'CLOSED'
          | undefined,
        limit,
        offset,
      },
    );

    res.json({ conversations });
  },
);

/**
 * POST /api/chatbot/conversations/:sessionId/messages
 * Send a message in a conversation
 */
router.post(
  '/chatbot/conversations/:sessionId/messages',
  async (
    req: AuthenticatedRequest<{ sessionId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    const { sessionId } = req.params;

    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const result = await chatbotService.processCustomerMessage(
        sessionId,
        parsed.data,
      );
      res.json(result);
    } catch (error) {
      if ((error as Error).message === 'Conversation not found') {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
      next(error);
    }
  },
);

/**
 * PATCH /api/chatbot/conversations/:sessionId/status
 * Update conversation status (for agents)
 */
router.patch(
  '/chatbot/conversations/:sessionId/status',
  requireAuth,
  async (req: AuthenticatedRequest<{ sessionId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { sessionId } = req.params;
    const { status, satisfactionRating, satisfactionFeedback } = req.body as {
      status: string;
      satisfactionRating?: number;
      satisfactionFeedback?: string;
    };

    const validStatuses = [
      'ACTIVE',
      'WAITING_CUSTOMER',
      'WAITING_AGENT',
      'ESCALATED',
      'RESOLVED',
      'CLOSED',
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const conversation = await chatbotService.updateConversationStatus(
      sessionId,
      status as ConversationStatus,
      {
        escalatedToAgentId: status === 'ESCALATED' ? req.userId : undefined,
        satisfactionRating,
        satisfactionFeedback,
      },
    );

    res.json({ conversation });
  },
);

// ============================================================================
// KNOWLEDGE BASE ROUTES
// ============================================================================

/**
 * GET /api/chatbot/:configId/knowledge-base
 * List knowledge base items
 */
router.get(
  '/chatbot/:configId/knowledge-base',
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

    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const isPublished =
      req.query.published === 'true'
        ? true
        : req.query.published === 'false'
          ? false
          : undefined;

    const items = await chatbotService.getKnowledgeBaseItems(configId, {
      category,
      search,
      isPublished,
    });

    res.json({ items });
  },
);

/**
 * POST /api/chatbot/:configId/knowledge-base
 * Create a knowledge base item
 */
router.post(
  '/chatbot/:configId/knowledge-base',
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

    const parsed = knowledgeBaseItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const item = await chatbotService.createKnowledgeBaseItem(
      configId,
      parsed.data,
    );
    res.status(201).json({ item });
  },
);

/**
 * PATCH /api/chatbot/knowledge-base/:id
 * Update a knowledge base item
 */
router.patch(
  '/chatbot/knowledge-base/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const parsed = knowledgeBaseItemSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const item = await chatbotService.updateKnowledgeBaseItem(id, parsed.data);
    res.json({ item });
  },
);

/**
 * DELETE /api/chatbot/knowledge-base/:id
 * Delete a knowledge base item
 */
router.delete(
  '/chatbot/knowledge-base/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    await chatbotService.deleteKnowledgeBaseItem(id);
    res.status(204).send();
  },
);

/**
 * POST /api/chatbot/knowledge-base/:id/feedback
 * Record feedback for a knowledge base item
 */
router.post(
  '/chatbot/knowledge-base/:id/feedback',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    await chatbotService.recordKnowledgeBaseFeedback(id, parsed.data.helpful);
    res.json({ success: true });
  },
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * GET /api/chatbot/:configId/analytics
 * Get chatbot analytics
 */
router.get(
  '/chatbot/:configId/analytics',
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

    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : new Date();

    // Aggregate analytics for each day in the date range before fetching
    // This ensures the ChatAnalytics table is populated with fresh data
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const endDateNormalized = new Date(endDate);
    endDateNormalized.setHours(23, 59, 59, 999);

    while (currentDate <= endDateNormalized) {
      await chatbotService.updateDailyAnalytics(
        configId,
        new Date(currentDate),
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const analytics = await chatbotService.getChatAnalytics(configId, {
      start: startDate,
      end: endDate,
    });

    // Transform to frontend-expected format
    const { summary, daily } = analytics;

    // Calculate resolution rate (as decimal 0-1)
    const resolutionRate =
      summary.totalConversations > 0
        ? summary.resolvedByBot / summary.totalConversations
        : 0;

    // Calculate average response time from conversations
    // For now, we'll estimate based on messages per conversation
    const avgResponseTime =
      summary.totalConversations > 0
        ? (summary.totalMessages / summary.totalConversations) * 1.5 // Estimate ~1.5s per message exchange
        : 0;

    // Aggregate intent breakdown from all daily records
    const intentCounts: Record<string, number> = {};
    for (const dayData of daily) {
      const intentBreakdown = dayData.intentBreakdown as Record<
        string,
        number
      > | null;
      if (intentBreakdown) {
        for (const [intent, count] of Object.entries(intentBreakdown)) {
          intentCounts[intent] = (intentCounts[intent] || 0) + count;
        }
      }
    }

    // Convert to sorted array of top intents
    const topIntents = Object.entries(intentCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      totalConversations: summary.totalConversations,
      avgResponseTime,
      resolutionRate,
      avgSatisfaction: summary.avgSatisfactionRating ?? 0,
      topIntents,
    });
  },
);

export default router;
