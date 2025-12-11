/**
 * Integration Hub Routes
 *
 * API endpoints for managing external integrations.
 */

import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { requireTenant } from '../tenant/tenant.middleware';
import { getTenantContext } from '../tenant/tenant.context';
import * as oauthService from './oauth/oauth.service';
import * as syncService from './sync/sync.service';
import {
  PROVIDER_CONFIGS,
  getProvidersByCategory,
} from './oauth/provider-configs';
import { z } from 'zod';
import type { IntegrationProvider, SyncDirection } from './integration.types';

const router = Router();

// Validation schemas
const syncJobSchema = z.object({
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  entityType: z.string(),
  entityIds: z.array(z.number()).optional(),
  fullSync: z.boolean().optional(),
});

const syncSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  direction: z.enum(['INBOUND', 'OUTBOUND', 'BIDIRECTIONAL']).optional(),
  frequency: z.enum(['REAL_TIME', 'HOURLY', 'DAILY', 'MANUAL']).optional(),
  entities: z.array(z.string()).optional(),
  conflictResolution: z
    .enum(['LAST_MODIFIED', 'SOURCE_WINS', 'DESTINATION_WINS', 'MANUAL'])
    .optional(),
});

// ============================================================================
// PROVIDER CATALOG (Public)
// ============================================================================

/**
 * GET /api/integrations/providers
 * Get all available integration providers.
 */
router.get('/integrations/providers', (_req, res) => {
  const providers = Object.values(PROVIDER_CONFIGS).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    authType: p.authType,
    supportedEntities: p.supportedEntities,
    syncCapabilities: p.syncCapabilities,
  }));

  res.json({ data: providers });
});

/**
 * GET /api/integrations/providers/:category
 * Get providers by category.
 */
router.get('/integrations/providers/:category', (req, res) => {
  const { category } = req.params;
  const providers = getProvidersByCategory(category);

  res.json({
    data: providers.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      authType: p.authType,
      supportedEntities: p.supportedEntities,
    })),
  });
});

// ============================================================================
// INTEGRATION MANAGEMENT (Authenticated)
// ============================================================================

/**
 * GET /api/integrations
 * Get all integrations for the current tenant.
 */
router.get(
  '/integrations',
  requireAuth,
  requireTenant,
  async (_req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const integrations = await oauthService.getTenantIntegrations(tenantId);

      res.json({ data: integrations });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/integrations/:provider
 * Get integration status for a specific provider.
 */
router.get(
  '/integrations/:provider',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const provider = req.params.provider as IntegrationProvider;

      if (!PROVIDER_CONFIGS[provider]) {
        return res.status(404).json({ error: 'Provider not found' });
      }

      const integration = await oauthService.getIntegrationByProvider(
        tenantId,
        provider,
      );

      res.json({
        data: integration || {
          provider,
          status: 'DISCONNECTED',
          name: PROVIDER_CONFIGS[provider].name,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// OAUTH CONNECTION FLOW
// ============================================================================

/**
 * POST /api/integrations/:provider/connect
 * Start OAuth connection flow.
 */
router.post(
  '/integrations/:provider/connect',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const provider = req.params.provider as IntegrationProvider;

      if (!PROVIDER_CONFIGS[provider]) {
        return res.status(404).json({ error: 'Provider not found' });
      }

      const providerConfig = PROVIDER_CONFIGS[provider];

      if (providerConfig.authType !== 'oauth2') {
        return res.status(400).json({
          error: 'Provider does not support OAuth',
          message: `Use ${providerConfig.authType} authentication for this provider`,
        });
      }

      // Generate redirect URI
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
      const redirectUri = `${baseUrl}/api/integrations/callback`;

      const { url, state } = oauthService.generateAuthUrl(
        provider,
        tenantId,
        redirectUri,
      );

      res.json({
        data: {
          authUrl: url,
          state,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/integrations/callback
 * OAuth callback handler.
 */
router.get('/integrations/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        `/settings/integrations?error=${encodeURIComponent(error as string)}`,
      );
    }

    if (!code || !state) {
      return res.redirect('/settings/integrations?error=missing_params');
    }

    // Validate state and get tenant info
    const stateData = oauthService.validateOAuthState(state as string);

    if (!stateData) {
      return res.redirect('/settings/integrations?error=invalid_state');
    }

    const { tenantId, provider } = stateData;

    // Generate redirect URI
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl}/api/integrations/callback`;

    // Exchange code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(
      provider,
      code as string,
      redirectUri,
    );

    // Create integration record
    await oauthService.createIntegration(tenantId, provider, tokens);

    // Redirect back to integrations page
    res.redirect('/settings/integrations?connected=' + provider);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/settings/integrations?error=connection_failed');
  }
});

/**
 * DELETE /api/integrations/:provider
 * Disconnect an integration.
 */
router.delete(
  '/integrations/:provider',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const provider = req.params.provider as IntegrationProvider;

      const integration = await oauthService.getIntegrationByProvider(
        tenantId,
        provider,
      );

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      await oauthService.disconnectIntegration(integration.id, tenantId);

      res.json({ message: 'Integration disconnected successfully' });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// SYNC MANAGEMENT
// ============================================================================

/**
 * POST /api/integrations/:provider/sync
 * Trigger a manual sync.
 */
router.post(
  '/integrations/:provider/sync',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const provider = req.params.provider as IntegrationProvider;

      const validation = syncJobSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const integration = await oauthService.getIntegrationByProvider(
        tenantId,
        provider,
      );

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      if (integration.status !== 'CONNECTED') {
        return res.status(400).json({
          error: 'Integration not connected',
          message: 'Please reconnect the integration before syncing',
        });
      }

      const { direction, entityType, entityIds, fullSync } = validation.data;

      const syncLogId = await syncService.startSyncJob({
        integrationId: integration.id,
        direction: direction as SyncDirection,
        entityType,
        entityIds,
        fullSync,
      });

      res.status(202).json({
        message: 'Sync job started',
        data: { syncLogId },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/integrations/:provider/sync/status
 * Get current sync status.
 */
router.get(
  '/integrations/:provider/sync/status',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const provider = req.params.provider as IntegrationProvider;

      const integration = await oauthService.getIntegrationByProvider(
        tenantId,
        provider,
      );

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json({
        data: {
          lastSyncAt: integration.lastSyncAt,
          lastSyncStatus: integration.lastSyncStatus,
          nextSyncAt: integration.nextSyncAt,
          syncSettings: integration.syncSettings,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/integrations/:provider/sync/logs
 * Get sync history.
 */
router.get(
  '/integrations/:provider/sync/logs',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const provider = req.params.provider as IntegrationProvider;
      const limit = parseInt(req.query.limit as string) || 50;

      const integration = await oauthService.getIntegrationByProvider(
        tenantId,
        provider,
      );

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      const history = await syncService.getSyncHistory(integration.id, limit);

      res.json({ data: history });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/integrations/:provider/sync/settings
 * Update sync settings.
 */
router.put(
  '/integrations/:provider/sync/settings',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const provider = req.params.provider as IntegrationProvider;

      const validation = syncSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const integration = await oauthService.getIntegrationByProvider(
        tenantId,
        provider,
      );

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      await oauthService.updateSyncSettings(integration.id, validation.data);

      res.json({ message: 'Sync settings updated successfully' });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// FIELD MAPPINGS
// ============================================================================

/**
 * GET /api/integrations/:provider/mappings
 * Get field mappings for an integration.
 */
router.get(
  '/integrations/:provider/mappings',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const { tenantId } = getTenantContext();
      const provider = req.params.provider as IntegrationProvider;

      const integration = await oauthService.getIntegrationByProvider(
        tenantId,
        provider,
      );

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      // Get integration with field mappings from database
      const fullIntegration = await oauthService.getIntegrationByProvider(
        tenantId,
        provider,
      );

      res.json({
        data: {
          provider,
          supportedEntities:
            PROVIDER_CONFIGS[provider]?.supportedEntities || [],
          mappings: [], // Would come from integration.fieldMappings
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/integrations/:provider/mappings
 * Update field mappings.
 */
router.put(
  '/integrations/:provider/mappings',
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      // Implementation would update fieldMappings in the integration record
      res.json({ message: 'Field mappings updated successfully' });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// WEBHOOKS
// ============================================================================

/**
 * POST /api/integrations/webhooks
 * Incoming webhook endpoint for external integrations.
 */
router.post('/integrations/webhooks', async (req, res, next) => {
  try {
    const { provider, event, data, signature } = req.body;

    // Validate webhook signature
    // Implementation depends on provider

    // Process webhook event
    console.log(`Received webhook from ${provider}: ${event}`);

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

export default router;
