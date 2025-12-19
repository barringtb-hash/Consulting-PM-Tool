/**
 * Calendar Integration Router
 *
 * API endpoints for managing calendar integrations and OAuth flows.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import * as calendarService from './calendar.service';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const initiateOAuthSchema = z.object({
  configId: z.number().int(),
  providerId: z.number().int().optional(),
  platform: z.enum(['GOOGLE', 'OUTLOOK']),
});

// ============================================================================
// OAUTH ENDPOINTS
// ============================================================================

/**
 * POST /api/scheduling/calendar/oauth/initiate
 * Start OAuth flow for calendar integration
 */
router.post(
  '/oauth/initiate',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const parsed = initiateOAuthSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const { configId, providerId, platform } = parsed.data;

      // Create state parameter with config info
      const state = Buffer.from(
        JSON.stringify({
          configId,
          providerId: providerId || null,
          platform,
          userId: req.userId!,
        }),
      ).toString('base64');

      let authUrl: string;

      if (platform === 'GOOGLE') {
        authUrl = calendarService.getGoogleAuthUrl(state);
      } else if (platform === 'OUTLOOK') {
        authUrl = calendarService.getMicrosoftAuthUrl(state);
      } else {
        res.status(400).json({ error: 'Invalid calendar platform' });
        return;
      }

      res.json({
        data: {
          authUrl,
        },
      });
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      res.status(500).json({ error: 'Failed to initiate OAuth flow' });
    }
  },
);

/**
 * GET /api/scheduling/calendar/google/callback
 * Google OAuth callback handler
 */
router.get('/google/callback', async (req, res): Promise<void> => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      res.redirect(
        `/ai-tools/scheduling?calendarError=${encodeURIComponent(String(error))}`,
      );
      return;
    }

    if (!code || !state) {
      res.redirect('/ai-tools/scheduling?calendarError=Missing+parameters');
      return;
    }

    // Decode state
    let stateData: {
      configId: number;
      providerId: number | null;
      platform: string;
      userId: number;
    };

    try {
      stateData = JSON.parse(Buffer.from(String(state), 'base64').toString());
    } catch {
      res.redirect('/ai-tools/scheduling?calendarError=Invalid+state');
      return;
    }

    // Exchange code for tokens
    const tokens = await calendarService.exchangeGoogleCode(String(code));

    // Get available calendars
    const calendars = await calendarService.listGoogleCalendars(
      tokens.access_token,
    );

    // Store temporary tokens in session or return for calendar selection
    // For simplicity, we'll auto-select the primary calendar
    const primaryCalendar = calendars.find((c) => c.primary) || calendars[0];

    if (!primaryCalendar) {
      res.redirect('/ai-tools/scheduling?calendarError=No+calendars+found');
      return;
    }

    // Save the integration
    await calendarService.saveCalendarIntegration(
      stateData.configId,
      stateData.providerId,
      'GOOGLE',
      tokens,
      primaryCalendar.id,
    );

    res.redirect('/ai-tools/scheduling?calendarConnected=true');
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(
      `/ai-tools/scheduling?calendarError=${encodeURIComponent('Failed to connect Google Calendar')}`,
    );
  }
});

/**
 * GET /api/scheduling/calendar/outlook/callback
 * Microsoft/Outlook OAuth callback handler
 */
router.get('/outlook/callback', async (req, res): Promise<void> => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      const errorMsg = error_description
        ? String(error_description)
        : String(error);
      res.redirect(
        `/ai-tools/scheduling?calendarError=${encodeURIComponent(errorMsg)}`,
      );
      return;
    }

    if (!code || !state) {
      res.redirect('/ai-tools/scheduling?calendarError=Missing+parameters');
      return;
    }

    // Decode state
    let stateData: {
      configId: number;
      providerId: number | null;
      platform: string;
      userId: number;
    };

    try {
      stateData = JSON.parse(Buffer.from(String(state), 'base64').toString());
    } catch {
      res.redirect('/ai-tools/scheduling?calendarError=Invalid+state');
      return;
    }

    // Exchange code for tokens
    const tokens = await calendarService.exchangeMicrosoftCode(String(code));

    // Get available calendars
    const calendars = await calendarService.listOutlookCalendars(
      tokens.access_token,
    );

    // Store temporary tokens in session or return for calendar selection
    // For simplicity, we'll auto-select the default calendar
    const defaultCalendar = calendars.find((c) => c.isDefault) || calendars[0];

    if (!defaultCalendar) {
      res.redirect('/ai-tools/scheduling?calendarError=No+calendars+found');
      return;
    }

    // Save the integration
    await calendarService.saveCalendarIntegration(
      stateData.configId,
      stateData.providerId,
      'OUTLOOK',
      tokens,
      defaultCalendar.id,
    );

    res.redirect('/ai-tools/scheduling?calendarConnected=true');
  } catch (error) {
    console.error('Outlook OAuth callback error:', error);
    res.redirect(
      `/ai-tools/scheduling?calendarError=${encodeURIComponent('Failed to connect Outlook Calendar')}`,
    );
  }
});

// ============================================================================
// INTEGRATION MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/calendar/integrations/:configId
 * List calendar integrations for a config
 */
router.get(
  '/integrations/:configId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const configId = parseInt(req.params.configId, 10);

      if (isNaN(configId)) {
        res.status(400).json({ error: 'Invalid config ID' });
        return;
      }

      const integrations =
        await calendarService.getCalendarIntegrations(configId);

      res.json({
        data: integrations.map((i) => ({
          id: i.id,
          platform: i.platform,
          calendarId: i.calendarId,
          syncEnabled: i.syncEnabled,
          lastSyncAt: i.lastSyncAt,
          lastSyncError: i.lastSyncError,
          provider: i.provider,
        })),
      });
    } catch (error) {
      console.error('Error listing integrations:', error);
      res.status(500).json({ error: 'Failed to list calendar integrations' });
    }
  },
);

/**
 * POST /api/scheduling/calendar/integrations/:id/disable
 * Disable a calendar integration
 */
router.post(
  '/integrations/:id/disable',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid integration ID' });
        return;
      }

      await calendarService.disableCalendarIntegration(id);

      res.json({
        data: {
          message: 'Calendar integration disabled',
        },
      });
    } catch (error) {
      console.error('Error disabling integration:', error);
      res.status(500).json({ error: 'Failed to disable calendar integration' });
    }
  },
);

/**
 * DELETE /api/scheduling/calendar/integrations/:id
 * Delete a calendar integration
 */
router.delete(
  '/integrations/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid integration ID' });
        return;
      }

      await calendarService.deleteCalendarIntegration(id);

      res.json({
        data: {
          message: 'Calendar integration deleted',
        },
      });
    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({ error: 'Failed to delete calendar integration' });
    }
  },
);

/**
 * POST /api/scheduling/calendar/sync/:appointmentId
 * Manually sync an appointment to calendar
 */
router.post(
  '/sync/:appointmentId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const appointmentId = parseInt(req.params.appointmentId, 10);

      if (isNaN(appointmentId)) {
        res.status(400).json({ error: 'Invalid appointment ID' });
        return;
      }

      await calendarService.syncAppointmentToCalendar(appointmentId);

      res.json({
        data: {
          message: 'Appointment synced to calendar',
        },
      });
    } catch (error) {
      console.error('Error syncing appointment:', error);
      res.status(500).json({ error: 'Failed to sync appointment to calendar' });
    }
  },
);

export default router;
