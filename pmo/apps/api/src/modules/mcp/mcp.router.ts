/**
 * MCP Router
 *
 * API endpoints for MCP integration and AI-powered queries
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { tenantMiddleware } from '../../tenant/tenant.middleware';
import { mcpClient } from './mcp-client.service';
import { processAIQuery, executeDirectQuery } from './ai-query.service';

const router = Router();

// Apply auth and tenant middleware to all MCP routes - required for tenant isolation
// requireAuth must come first so req.userId is available for tenant resolution
router.use(requireAuth, tenantMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const aiQuerySchema = z.object({
  query: z.string().min(1).max(2000),
  context: z
    .object({
      clientId: z.number().optional(),
      projectId: z.number().optional(),
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional(),
});

const executeToolSchema = z.object({
  tool: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).optional().default({}),
  serverId: z.string().optional(),
});

const connectServerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  transport: z.enum(['stdio', 'http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(),
});

// ============================================================================
// AI QUERY ROUTES
// ============================================================================

/**
 * POST /api/mcp/query
 * Process a natural language query using AI and MCP tools
 */
router.post(
  '/query',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = aiQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid request', details: parsed.error.format() });
      return;
    }

    try {
      const result = await processAIQuery({
        ...parsed.data,
        userId: req.userId,
      });
      res.json(result);
    } catch (error) {
      console.error('AI Query error:', error);
      res.status(500).json({ error: 'Failed to process query' });
    }
  },
);

// ============================================================================
// TOOL EXECUTION ROUTES
// ============================================================================

/**
 * POST /api/mcp/execute
 * Execute an MCP tool directly
 */
router.post(
  '/execute',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = executeToolSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid request', details: parsed.error.format() });
      return;
    }

    try {
      const result = await executeDirectQuery(
        parsed.data.tool,
        parsed.data.arguments,
        req.userId,
      );
      res.json({ result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/mcp/tools
 * List all available MCP tools
 */
router.get(
  '/tools',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const serverId = req.query.serverId as string | undefined;
      const tools = await mcpClient.listTools(serverId);
      res.json({ tools });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/mcp/resources
 * List all available MCP resources
 */
router.get(
  '/resources',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const serverId = req.query.serverId as string | undefined;
      const resources = await mcpClient.listResources(serverId);
      res.json({ resources });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/mcp/resources/:uri
 * Read a specific MCP resource
 * Note: Express 5 uses {*param} syntax for wildcard path segments
 */
router.get(
  '/resources/{*uri}',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const uri = String(req.params.uri);
      const serverId = req.query.serverId as string | undefined;
      const resource = await mcpClient.readResource(uri, serverId);
      res.type(resource.mimeType).send(resource.content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  },
);

// ============================================================================
// SERVER MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/mcp/servers
 * List all connected MCP servers
 */
router.get(
  '/servers',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const servers = await mcpClient.getServers();
      res.json({ servers });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /api/mcp/servers
 * Register and connect to a new MCP server
 */
router.post(
  '/servers',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = connectServerSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid request', details: parsed.error.format() });
      return;
    }

    try {
      mcpClient.registerServer(parsed.data);
      await mcpClient.connect(parsed.data.id);

      const servers = await mcpClient.getServers();
      const server = servers.find((s) => s.id === parsed.data.id);

      res.status(201).json({ server });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * DELETE /api/mcp/servers/:id
 * Disconnect from an MCP server
 */
router.delete(
  '/servers/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      await mcpClient.disconnect(String(req.params.id));
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  },
);

// ============================================================================
// QUICK ACTION ROUTES
// ============================================================================

/**
 * GET /api/mcp/quick/at-risk
 * Quick access to at-risk projects
 */
router.get(
  '/quick/at-risk',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const result = await executeDirectQuery(
        'get_at_risk_projects',
        { limit: 10 },
        req.userId,
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/mcp/quick/recent-meetings
 * Quick access to recent meetings
 */
router.get(
  '/quick/recent-meetings',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const days = Number(req.query.days) || 7;
      const result = await executeDirectQuery(
        'get_recent_meetings',
        { days, limit: 20 },
        req.userId,
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/mcp/quick/meeting-brief/:clientId
 * Quick meeting brief for a client
 */
router.get(
  '/quick/meeting-brief/:clientId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    try {
      const result = await executeDirectQuery(
        'prepare_meeting_brief',
        { clientId },
        req.userId,
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  },
);

export default router;
