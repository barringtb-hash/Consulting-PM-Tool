/**
 * Monitoring Assistant Router
 *
 * API endpoints for the AI-powered monitoring assistant.
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth,
  AuthenticatedRequest,
} from '../../../auth/auth.middleware';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';
import { prisma } from '../../../prisma/client';
import {
  chat,
  getSuggestions,
  getConversation,
  getUserConversations,
  clearConversation,
} from './monitoring-assistant.service';
import { DEFAULT_ASSISTANT_CONFIG } from './monitoring-assistant.types';
import { logger } from '../../../utils/logger';

const router = Router();

// Module ID for the monitoring assistant
const MONITORING_ASSISTANT_MODULE_ID = 'monitoring-assistant';

// ============================================================================
// Validation Schemas
// ============================================================================

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
  includeContext: z.boolean().optional().default(true),
});

// ============================================================================
// Helper - Check if monitoring assistant is enabled for a tenant
// ============================================================================

/**
 * Check if the monitoring assistant module is enabled for a specific tenant.
 * This is a custom check that bypasses the global ModuleId type since this
 * is a tenant-specific feature not in the global module system.
 */
async function isMonitoringAssistantEnabled(
  tenantId: string,
): Promise<boolean> {
  try {
    // Check for tenant-specific config first
    const config = await prisma.tenantModuleConfig.findFirst({
      where: {
        tenantId,
        moduleId: MONITORING_ASSISTANT_MODULE_ID,
      },
    });

    if (config) {
      return config.enabled;
    }

    // No tenant-specific config found; fall back to the default tenant config.
    // The default tenant is identified by slug = 'default', not by a literal
    // tenantId of 'default'.
    const defaultTenant = await prisma.tenant.findFirst({
      where: { slug: 'default' },
    });

    if (!defaultTenant) {
      return false;
    }

    const defaultConfig = await prisma.tenantModuleConfig.findFirst({
      where: {
        tenantId: defaultTenant.id,
        moduleId: MONITORING_ASSISTANT_MODULE_ID,
      },
    });

    return defaultConfig?.enabled ?? false;
  } catch (error) {
    logger.error('Error checking monitoring assistant config', {
      error,
      tenantId,
    });
    return false;
  }
}

// ============================================================================
// Middleware - Check if monitoring assistant is enabled for tenant
// ============================================================================

async function requireMonitoringAssistant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!hasTenantContext()) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const tenantId = getTenantId();
    const isEnabled = await isMonitoringAssistantEnabled(tenantId);

    if (!isEnabled) {
      return res.status(403).json({
        error: 'Monitoring Assistant is not enabled for your organization',
        code: 'MODULE_NOT_ENABLED',
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking monitoring assistant access', { error });
    next(error);
  }
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /chat
 * Send a message to the monitoring assistant
 */
router.post(
  '/chat',
  requireAuth,
  requireMonitoringAssistant,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId();
      const userId = req.userId!;

      // Validate request body
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parsed.error.flatten(),
        });
      }

      const { message, conversationId } = parsed.data;

      // Process the chat message
      const response = await chat(
        tenantId,
        userId,
        { message, conversationId },
        DEFAULT_ASSISTANT_CONFIG,
      );

      res.json({ data: response });
    } catch (error) {
      logger.error('Error in monitoring assistant chat', { error });
      next(error);
    }
  },
);

/**
 * GET /suggestions
 * Get suggested queries based on current system state
 */
router.get(
  '/suggestions',
  requireAuth,
  requireMonitoringAssistant,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId();
      const suggestions = await getSuggestions(tenantId);
      res.json({ data: suggestions });
    } catch (error) {
      logger.error('Error getting assistant suggestions', { error });
      next(error);
    }
  },
);

/**
 * GET /conversations
 * Get all conversations for the current user
 */
router.get(
  '/conversations',
  requireAuth,
  requireMonitoringAssistant,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId();
      const userId = req.userId!;

      const conversations = getUserConversations(tenantId, userId);

      // Return summary of each conversation
      const summaries = conversations.map((conv) => ({
        id: conv.id,
        messageCount: conv.messages.length,
        lastMessage: conv.messages[conv.messages.length - 1]?.content.substring(
          0,
          100,
        ),
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      }));

      res.json({ data: summaries });
    } catch (error) {
      logger.error('Error getting conversations', { error });
      next(error);
    }
  },
);

/**
 * GET /conversations/:id
 * Get a specific conversation
 */
router.get(
  '/conversations/:id',
  requireAuth,
  requireMonitoringAssistant,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId();
      const conversationId = String(req.params.id);

      const conversation = getConversation(conversationId, tenantId);

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Ensure user owns this conversation
      if (conversation.userId !== req.userId!) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ data: conversation });
    } catch (error) {
      logger.error('Error getting conversation', { error });
      next(error);
    }
  },
);

/**
 * DELETE /conversations/:id
 * Delete a conversation
 */
router.delete(
  '/conversations/:id',
  requireAuth,
  requireMonitoringAssistant,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId();
      const conversationId = String(req.params.id);

      // Get conversation to check ownership
      const conversation = getConversation(conversationId, tenantId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (conversation.userId !== req.userId!) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const deleted = clearConversation(conversationId, tenantId);

      if (deleted) {
        res.json({ data: { success: true } });
      } else {
        res.status(500).json({ error: 'Failed to delete conversation' });
      }
    } catch (error) {
      logger.error('Error deleting conversation', { error });
      next(error);
    }
  },
);

/**
 * GET /health
 * Health check for the assistant module
 */
router.get('/health', async (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    status: 'healthy',
    module: 'monitoring-assistant',
    timestamp: new Date().toISOString(),
  });
});

export default router;
