/**
 * Calendar Integration Service
 *
 * Handles OAuth flows and calendar sync for Google Calendar and Microsoft Outlook.
 * Supports:
 * - OAuth authorization and token management
 * - Creating calendar events for appointments
 * - Updating events on reschedule
 * - Deleting events on cancellation
 */

import { prisma } from '../../prisma/client';
import { CalendarPlatform } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

interface CalendarEventInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  attendeeEmail?: string;
  attendeeName?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  'http://localhost:3001/api/scheduling/calendar/google/callback';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

// ============================================================================
// GOOGLE OAUTH FLOW
// ============================================================================

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGoogleCode(
  code: string,
): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Google OAuth error: ${error.error_description || error.error}`,
    );
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshGoogleToken(
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Google token refresh error: ${error.error_description || error.error}`,
    );
  }

  return response.json();
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(
  integrationId: number,
): Promise<string | null> {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { id: integrationId },
  });

  if (!integration || !integration.syncEnabled) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = integration.tokenExpiresAt
    ? new Date(integration.tokenExpiresAt)
    : new Date(0);
  const isExpired = expiresAt.getTime() - 5 * 60 * 1000 < now.getTime();

  if (!isExpired) {
    return integration.accessToken;
  }

  // Token expired, try to refresh
  if (!integration.refreshToken) {
    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        syncEnabled: false,
        lastSyncError: 'Token expired and no refresh token available',
      },
    });
    return null;
  }

  try {
    const tokens = await refreshGoogleToken(integration.refreshToken);

    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || integration.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        lastSyncError: null,
      },
    });

    return tokens.access_token;
  } catch (error) {
    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        syncEnabled: false,
        lastSyncError:
          error instanceof Error ? error.message : 'Token refresh failed',
      },
    });
    return null;
  }
}

// ============================================================================
// CALENDAR INTEGRATION MANAGEMENT
// ============================================================================

/**
 * Save calendar integration after OAuth flow
 */
export async function saveCalendarIntegration(
  configId: number,
  providerId: number | null,
  platform: CalendarPlatform,
  tokens: GoogleTokenResponse,
  calendarId: string,
) {
  // Check for existing integration
  const existing = await prisma.calendarIntegration.findFirst({
    where: {
      configId,
      providerId: providerId || null,
      platform,
    },
  });

  const data = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    calendarId,
    syncEnabled: true,
    lastSyncError: null,
  };

  if (existing) {
    return prisma.calendarIntegration.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.calendarIntegration.create({
    data: {
      configId,
      providerId,
      platform,
      ...data,
    },
  });
}

/**
 * Get calendar integrations for a config
 */
export async function getCalendarIntegrations(configId: number) {
  return prisma.calendarIntegration.findMany({
    where: { configId },
    include: {
      provider: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Disable calendar integration
 */
export async function disableCalendarIntegration(id: number) {
  return prisma.calendarIntegration.update({
    where: { id },
    data: {
      syncEnabled: false,
    },
  });
}

/**
 * Delete calendar integration
 */
export async function deleteCalendarIntegration(id: number) {
  return prisma.calendarIntegration.delete({
    where: { id },
  });
}

// ============================================================================
// GOOGLE CALENDAR API
// ============================================================================

/**
 * List calendars for the connected account
 */
export async function listGoogleCalendars(
  accessToken: string,
): Promise<Array<{ id: string; summary: string; primary: boolean }>> {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to list Google calendars');
  }

  const data = await response.json();
  return data.items.map(
    (cal: { id: string; summary: string; primary?: boolean }) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
    }),
  );
}

/**
 * Create a Google Calendar event
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEventInput,
): Promise<string> {
  const googleEvent: GoogleCalendarEvent = {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: event.startTime.toISOString(),
      timeZone: event.timezone,
    },
    end: {
      dateTime: event.endTime.toISOString(),
      timeZone: event.timezone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  if (event.attendeeEmail) {
    googleEvent.attendees = [
      {
        email: event.attendeeEmail,
        displayName: event.attendeeName,
      },
    ];
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleEvent),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Failed to create Google event: ${error.error?.message || 'Unknown error'}`,
    );
  }

  const createdEvent = await response.json();
  return createdEvent.id;
}

/**
 * Update a Google Calendar event
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: CalendarEventInput,
): Promise<void> {
  const googleEvent: GoogleCalendarEvent = {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: event.startTime.toISOString(),
      timeZone: event.timezone,
    },
    end: {
      dateTime: event.endTime.toISOString(),
      timeZone: event.timezone,
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleEvent),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Failed to update Google event: ${error.error?.message || 'Unknown error'}`,
    );
  }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete Google event');
  }
}

// ============================================================================
// APPOINTMENT SYNC
// ============================================================================

/**
 * Sync appointment to calendar (create event)
 */
export async function syncAppointmentToCalendar(
  appointmentId: number,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      config: true,
      provider: true,
      appointmentType: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Find calendar integration for this provider or config
  const integration = await prisma.calendarIntegration.findFirst({
    where: {
      configId: appointment.configId,
      providerId: appointment.providerId || null,
      syncEnabled: true,
    },
  });

  if (!integration) {
    // No calendar integration configured
    return;
  }

  const accessToken = await getValidAccessToken(integration.id);
  if (!accessToken) {
    return;
  }

  const endTime = new Date(
    appointment.scheduledAt.getTime() + appointment.durationMinutes * 60 * 1000,
  );

  const eventInput: CalendarEventInput = {
    title: `${appointment.appointmentType?.name || 'Appointment'} - ${appointment.patientName}`,
    description: `Patient: ${appointment.patientName}\nEmail: ${appointment.patientEmail || 'N/A'}\nPhone: ${appointment.patientPhone || 'N/A'}`,
    startTime: appointment.scheduledAt,
    endTime,
    timezone: appointment.config.timezone || 'America/New_York',
    attendeeEmail: appointment.patientEmail || undefined,
    attendeeName: appointment.patientName,
  };

  try {
    if (integration.platform === 'GOOGLE') {
      const eventId = await createGoogleCalendarEvent(
        accessToken,
        integration.calendarId,
        eventInput,
      );

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { googleEventId: eventId },
      });
    }
    // TODO: Add Outlook support

    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncError: error instanceof Error ? error.message : 'Sync failed',
      },
    });
  }
}

/**
 * Update calendar event when appointment is rescheduled
 */
export async function updateAppointmentCalendarEvent(
  appointmentId: number,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      config: true,
      appointmentType: true,
    },
  });

  if (!appointment || !appointment.googleEventId) {
    return;
  }

  const integration = await prisma.calendarIntegration.findFirst({
    where: {
      configId: appointment.configId,
      providerId: appointment.providerId || null,
      syncEnabled: true,
      platform: 'GOOGLE',
    },
  });

  if (!integration) {
    return;
  }

  const accessToken = await getValidAccessToken(integration.id);
  if (!accessToken) {
    return;
  }

  const endTime = new Date(
    appointment.scheduledAt.getTime() + appointment.durationMinutes * 60 * 1000,
  );

  const eventInput: CalendarEventInput = {
    title: `${appointment.appointmentType?.name || 'Appointment'} - ${appointment.patientName}`,
    description: `Patient: ${appointment.patientName}\nEmail: ${appointment.patientEmail || 'N/A'}\nPhone: ${appointment.patientPhone || 'N/A'}`,
    startTime: appointment.scheduledAt,
    endTime,
    timezone: appointment.config.timezone || 'America/New_York',
    attendeeEmail: appointment.patientEmail || undefined,
    attendeeName: appointment.patientName,
  };

  try {
    await updateGoogleCalendarEvent(
      accessToken,
      integration.calendarId,
      appointment.googleEventId,
      eventInput,
    );

    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });
  } catch (error) {
    console.error('Calendar update error:', error);
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncError: error instanceof Error ? error.message : 'Update failed',
      },
    });
  }
}

/**
 * Delete calendar event when appointment is cancelled
 */
export async function deleteAppointmentCalendarEvent(
  appointmentId: number,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      config: true,
    },
  });

  if (!appointment || !appointment.googleEventId) {
    return;
  }

  const integration = await prisma.calendarIntegration.findFirst({
    where: {
      configId: appointment.configId,
      providerId: appointment.providerId || null,
      syncEnabled: true,
      platform: 'GOOGLE',
    },
  });

  if (!integration) {
    return;
  }

  const accessToken = await getValidAccessToken(integration.id);
  if (!accessToken) {
    return;
  }

  try {
    await deleteGoogleCalendarEvent(
      accessToken,
      integration.calendarId,
      appointment.googleEventId,
    );

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { googleEventId: null },
    });
  } catch (error) {
    console.error('Calendar delete error:', error);
  }
}
