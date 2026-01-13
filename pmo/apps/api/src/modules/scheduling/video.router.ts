/**
 * Video Conferencing Router
 *
 * Handles video conferencing API endpoints:
 * - OAuth flows for Zoom, Google Meet, Microsoft Teams
 * - Video config management
 * - Meeting creation/management
 */

import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../../auth/auth.middleware';
import * as videoService from './video.service';
import { VideoPlatform } from '@prisma/client';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const platformSchema = z.enum(['ZOOM', 'GOOGLE_MEET', 'TEAMS']);

const videoConfigSettingsSchema = z.object({
  autoRecord: z.boolean().optional(),
  waitingRoom: z.boolean().optional(),
  muteParticipantsOnEntry: z.boolean().optional(),
  joinBeforeHost: z.boolean().optional(),
  defaultDurationMinutes: z.number().min(15).max(480).optional(),
});

const updateVideoConfigSchema = z.object({
  isActive: z.boolean().optional(),
  defaultSettings: videoConfigSettingsSchema.optional(),
});

// ============================================================================
// OAUTH ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/video/oauth/status
 * Check which video platforms have OAuth properly configured
 */
router.get('/video/oauth/status', requireAuth, async (_req, res) => {
  const status = videoService.getVideoOAuthStatus();
  return res.json({ data: status });
});

/**
 * GET /api/scheduling/:configId/video/oauth/:platform
 * Get OAuth authorization URL for a video platform
 */
router.get(
  '/:configId/video/oauth/:platform',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(String(req.params.configId));
      const platform = String(
        req.params.platform,
      ).toUpperCase() as VideoPlatform;

      const parsed = platformSchema.safeParse(platform);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid platform' });
      }

      // Generate CSRF token for OAuth state validation
      const csrfToken = crypto.randomBytes(32).toString('hex');
      const authUrl = videoService.getOAuthUrl(platform, configId, csrfToken);

      return res.json({
        data: {
          authUrl,
          csrfToken, // Return CSRF token for frontend to store in sessionStorage
        },
      });
    } catch (error) {
      console.error('Failed to get OAuth URL:', error);

      // Check if this is a configuration error and return a helpful message
      if (error instanceof Error && error.message.includes('not configured')) {
        return res.status(503).json({
          error: error.message,
          code: 'OAUTH_NOT_CONFIGURED',
        });
      }

      return res.status(500).json({ error: 'Failed to get authorization URL' });
    }
  },
);

/**
 * POST /api/scheduling/:configId/video/oauth/:platform/callback
 * Handle OAuth callback and exchange code for tokens
 */
router.post(
  '/:configId/video/oauth/:platform/callback',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(String(req.params.configId));
      const platform = String(
        req.params.platform,
      ).toUpperCase() as VideoPlatform;
      const body = req.body as { code?: string };
      const { code } = body;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code required' });
      }

      const parsed = platformSchema.safeParse(platform);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid platform' });
      }

      // Exchange code for tokens
      const tokens = await videoService.exchangeCodeForTokens(platform, code);

      // Calculate token expiration
      const tokenExpiresAt = tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000)
        : undefined;

      // Save video config
      await videoService.saveVideoConfig(configId, {
        platform,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt,
      });

      return res.json({
        data: {
          success: true,
          platform,
          message: `${platform} connected successfully`,
        },
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'OAuth callback failed',
      });
    }
  },
);

/**
 * GET /api/scheduling/:configId/video/oauth/callback
 * Handle OAuth redirect from provider (GET request)
 */
router.get('/:configId/video/oauth/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(
        `/ai-tools/scheduling?error=${encodeURIComponent(String(oauthError))}`,
      );
    }

    if (!code || !state) {
      return res.redirect('/ai-tools/scheduling?error=missing_params');
    }

    // Decode state to get configId and platform info
    let stateData: { configId: number; state?: string };
    try {
      stateData = JSON.parse(Buffer.from(String(state), 'base64').toString());
    } catch {
      return res.redirect('/ai-tools/scheduling?error=invalid_state');
    }

    // Redirect to frontend with code for processing
    const redirectUrl =
      `/ai-tools/scheduling?` +
      `configId=${stateData.configId}&` +
      `code=${encodeURIComponent(String(code))}&` +
      `state=${encodeURIComponent(String(state))}`;

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth redirect error:', error);
    return res.redirect('/ai-tools/scheduling?error=oauth_failed');
  }
});

// ============================================================================
// VIDEO CONFIG MANAGEMENT
// ============================================================================

/**
 * GET /api/scheduling/:configId/video/config
 * Get video conferencing configurations
 */
router.get('/:configId/video/config', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(String(req.params.configId));
    const configs = await videoService.getVideoConfigs(configId);

    return res.json({ data: configs });
  } catch (error) {
    console.error('Failed to get video configs:', error);
    return res
      .status(500)
      .json({ error: 'Failed to get video configurations' });
  }
});

/**
 * GET /api/scheduling/:configId/video/platforms
 * Get supported video platforms
 */
router.get('/:configId/video/platforms', requireAuth, async (req, res) => {
  try {
    const platforms = videoService.getSupportedPlatforms();

    return res.json({
      data: platforms.map((platform) => ({
        id: platform,
        name: getPlatformDisplayName(platform),
        icon: getPlatformIcon(platform),
      })),
    });
  } catch (error) {
    console.error('Failed to get platforms:', error);
    return res.status(500).json({ error: 'Failed to get platforms' });
  }
});

/**
 * PATCH /api/scheduling/:configId/video/config/:id
 * Update video config settings
 */
router.patch('/:configId/video/config/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));

    const parsed = updateVideoConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const config = await videoService.updateVideoConfig(id, parsed.data);

    return res.json({ data: config });
  } catch (error) {
    console.error('Failed to update video config:', error);
    return res
      .status(500)
      .json({ error: 'Failed to update video configuration' });
  }
});

/**
 * DELETE /api/scheduling/:configId/video/config/:id
 * Disconnect video integration
 */
router.delete('/:configId/video/config/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));

    await videoService.deleteVideoConfig(id);

    return res.json({ data: { success: true } });
  } catch (error) {
    console.error('Failed to delete video config:', error);
    return res
      .status(500)
      .json({ error: 'Failed to disconnect video integration' });
  }
});

// ============================================================================
// MEETING MANAGEMENT
// ============================================================================

/**
 * POST /api/scheduling/:configId/video/meeting/:appointmentId
 * Create a video meeting for an appointment
 */
router.post(
  '/:configId/video/meeting/:appointmentId',
  requireAuth,
  async (req, res) => {
    try {
      const appointmentId = parseInt(String(req.params.appointmentId));

      const meeting =
        await videoService.createMeetingForAppointment(appointmentId);

      if (!meeting) {
        return res
          .status(404)
          .json({ error: 'Video conferencing not configured' });
      }

      return res.json({ data: meeting });
    } catch (error) {
      console.error('Failed to create meeting:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to create meeting',
      });
    }
  },
);

/**
 * PATCH /api/scheduling/:configId/video/meeting/:appointmentId
 * Update a video meeting for a rescheduled appointment
 */
router.patch(
  '/:configId/video/meeting/:appointmentId',
  requireAuth,
  async (req, res) => {
    try {
      const appointmentId = parseInt(String(req.params.appointmentId));

      const meeting =
        await videoService.updateMeetingForAppointment(appointmentId);

      if (!meeting) {
        return res
          .status(404)
          .json({ error: 'No meeting found for this appointment' });
      }

      return res.json({ data: meeting });
    } catch (error) {
      console.error('Failed to update meeting:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to update meeting',
      });
    }
  },
);

/**
 * DELETE /api/scheduling/:configId/video/meeting/:appointmentId
 * Delete a video meeting for a cancelled appointment
 */
router.delete(
  '/:configId/video/meeting/:appointmentId',
  requireAuth,
  async (req, res) => {
    try {
      const appointmentId = parseInt(String(req.params.appointmentId));

      await videoService.deleteMeetingForAppointment(appointmentId);

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to delete meeting',
      });
    }
  },
);

/**
 * GET /api/scheduling/:configId/video/status
 * Check if video conferencing is configured and get status
 */
router.get('/:configId/video/status', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(String(req.params.configId));

    const isConfigured = await videoService.isVideoConfigured(configId);
    const configs = await videoService.getVideoConfigs(configId);

    const activeConfig = configs.find((c) => c.isActive);

    return res.json({
      data: {
        isConfigured,
        activePlatform: activeConfig?.platform || null,
        platforms: configs.map((c) => ({
          platform: c.platform,
          isActive: c.isActive,
          connectedAt: c.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to get video status:', error);
    return res.status(500).json({ error: 'Failed to get video status' });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function getPlatformDisplayName(platform: VideoPlatform): string {
  switch (platform) {
    case 'ZOOM':
      return 'Zoom';
    case 'GOOGLE_MEET':
      return 'Google Meet';
    case 'TEAMS':
      return 'Microsoft Teams';
    default:
      return platform;
  }
}

function getPlatformIcon(platform: VideoPlatform): string {
  switch (platform) {
    case 'ZOOM':
      return 'video';
    case 'GOOGLE_MEET':
      return 'video';
    case 'TEAMS':
      return 'users';
    default:
      return 'video';
  }
}

export { router as videoRouter };
