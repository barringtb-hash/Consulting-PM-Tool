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
import { encryptString, decryptString, isEncrypted } from '../../utils/crypto';

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

// Microsoft/Outlook OAuth configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MICROSOFT_REDIRECT_URI =
  process.env.MICROSOFT_REDIRECT_URI ||
  'http://localhost:3001/api/scheduling/calendar/outlook/callback';
const MICROSOFT_TENANT = process.env.MICROSOFT_TENANT || 'common';

const MICROSOFT_SCOPES = ['openid', 'offline_access', 'Calendars.ReadWrite'];

// ============================================================================
// MICROSOFT TYPES
// ============================================================================

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface OutlookCalendarEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: 'required' | 'optional';
  }>;
  reminderMinutesBeforeStart?: number;
  isReminderOn?: boolean;
}

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
 * Supports both Google and Microsoft/Outlook tokens
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

  // Decrypt access token (supports both encrypted and legacy plaintext)
  const accessToken = isEncrypted(integration.accessToken)
    ? decryptString(integration.accessToken)
    : integration.accessToken;

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = integration.tokenExpiresAt
    ? new Date(integration.tokenExpiresAt)
    : new Date(0);
  const isExpired = expiresAt.getTime() - 5 * 60 * 1000 < now.getTime();

  if (!isExpired) {
    return accessToken;
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
    // Decrypt refresh token (supports both encrypted and legacy plaintext)
    const refreshToken = isEncrypted(integration.refreshToken)
      ? decryptString(integration.refreshToken)
      : integration.refreshToken;

    // Use appropriate refresh function based on platform
    let tokens;
    if (integration.platform === 'OUTLOOK') {
      tokens = await refreshMicrosoftToken(refreshToken);
    } else {
      tokens = await refreshGoogleToken(refreshToken);
    }

    // Encrypt new tokens before storage
    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        accessToken: encryptString(tokens.access_token),
        refreshToken: tokens.refresh_token
          ? encryptString(tokens.refresh_token)
          : integration.refreshToken, // Keep existing encrypted refresh token
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

  // Encrypt tokens before storage
  const data = {
    accessToken: encryptString(tokens.access_token),
    refreshToken: tokens.refresh_token
      ? encryptString(tokens.refresh_token)
      : null,
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
  try {
    return await prisma.calendarIntegration.findMany({
      where: { configId },
      include: {
        provider: {
          select: { id: true, name: true },
        },
      },
    });
  } catch (error) {
    // Handle case where table doesn't exist yet (P2021 = table does not exist)
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2021'
    ) {
      console.warn(
        'CalendarIntegration table does not exist yet. Run migrations to create it.',
      );
      return [];
    }
    throw error;
  }
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
// MICROSOFT OAUTH FLOW
// ============================================================================

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    redirect_uri: MICROSOFT_REDIRECT_URI,
    response_type: 'code',
    scope: MICROSOFT_SCOPES.join(' '),
    response_mode: 'query',
    state,
  });

  return `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange Microsoft authorization code for tokens
 */
export async function exchangeMicrosoftCode(
  code: string,
): Promise<MicrosoftTokenResponse> {
  const response = await fetch(
    `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: MICROSOFT_REDIRECT_URI,
        scope: MICROSOFT_SCOPES.join(' '),
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Microsoft OAuth error: ${error.error_description || error.error}`,
    );
  }

  return response.json();
}

/**
 * Refresh Microsoft access token using refresh token
 */
export async function refreshMicrosoftToken(
  refreshToken: string,
): Promise<MicrosoftTokenResponse> {
  const response = await fetch(
    `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: MICROSOFT_SCOPES.join(' '),
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Microsoft token refresh error: ${error.error_description || error.error}`,
    );
  }

  return response.json();
}

// ============================================================================
// OUTLOOK CALENDAR API
// ============================================================================

/**
 * List Outlook calendars for the connected account
 */
export async function listOutlookCalendars(
  accessToken: string,
): Promise<Array<{ id: string; name: string; isDefault: boolean }>> {
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/calendars',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to list Outlook calendars');
  }

  const data = await response.json();
  return data.value.map(
    (cal: { id: string; name: string; isDefaultCalendar?: boolean }) => ({
      id: cal.id,
      name: cal.name,
      isDefault: cal.isDefaultCalendar || false,
    }),
  );
}

/**
 * Create an Outlook Calendar event
 */
export async function createOutlookCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEventInput,
): Promise<string> {
  // Convert timezone to Windows format if needed
  const windowsTimezone = convertToWindowsTimezone(event.timezone);

  const outlookEvent: OutlookCalendarEvent = {
    subject: event.title,
    body: event.description
      ? {
          contentType: 'HTML',
          content: event.description.replace(/\n/g, '<br>'),
        }
      : undefined,
    start: {
      dateTime: event.startTime.toISOString().replace('Z', ''),
      timeZone: windowsTimezone,
    },
    end: {
      dateTime: event.endTime.toISOString().replace('Z', ''),
      timeZone: windowsTimezone,
    },
    reminderMinutesBeforeStart: 30,
    isReminderOn: true,
  };

  if (event.attendeeEmail) {
    outlookEvent.attendees = [
      {
        emailAddress: {
          address: event.attendeeEmail,
          name: event.attendeeName,
        },
        type: 'required',
      },
    ];
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(outlookEvent),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Failed to create Outlook event: ${error.error?.message || 'Unknown error'}`,
    );
  }

  const createdEvent = await response.json();
  return createdEvent.id;
}

/**
 * Update an Outlook Calendar event
 */
export async function updateOutlookCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: CalendarEventInput,
): Promise<void> {
  const windowsTimezone = convertToWindowsTimezone(event.timezone);

  const outlookEvent: OutlookCalendarEvent = {
    subject: event.title,
    body: event.description
      ? {
          contentType: 'HTML',
          content: event.description.replace(/\n/g, '<br>'),
        }
      : undefined,
    start: {
      dateTime: event.startTime.toISOString().replace('Z', ''),
      timeZone: windowsTimezone,
    },
    end: {
      dateTime: event.endTime.toISOString().replace('Z', ''),
      timeZone: windowsTimezone,
    },
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(outlookEvent),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Failed to update Outlook event: ${error.error?.message || 'Unknown error'}`,
    );
  }
}

/**
 * Delete an Outlook Calendar event
 */
export async function deleteOutlookCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete Outlook event');
  }
}

/**
 * Convert IANA timezone to Windows timezone format
 */
function convertToWindowsTimezone(ianaTimezone: string): string {
  // Common IANA to Windows timezone mappings
  const timezoneMap: Record<string, string> = {
    'America/New_York': 'Eastern Standard Time',
    'America/Chicago': 'Central Standard Time',
    'America/Denver': 'Mountain Standard Time',
    'America/Los_Angeles': 'Pacific Standard Time',
    'America/Phoenix': 'US Mountain Standard Time',
    'America/Anchorage': 'Alaskan Standard Time',
    'Pacific/Honolulu': 'Hawaiian Standard Time',
    'Europe/London': 'GMT Standard Time',
    'Europe/Paris': 'Romance Standard Time',
    'Europe/Berlin': 'W. Europe Standard Time',
    'Asia/Tokyo': 'Tokyo Standard Time',
    'Asia/Shanghai': 'China Standard Time',
    'Australia/Sydney': 'AUS Eastern Standard Time',
    UTC: 'UTC',
  };

  return timezoneMap[ianaTimezone] || 'UTC';
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
    let eventId: string;

    if (integration.platform === 'GOOGLE') {
      eventId = await createGoogleCalendarEvent(
        accessToken,
        integration.calendarId,
        eventInput,
      );

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { googleEventId: eventId },
      });
    } else if (integration.platform === 'OUTLOOK') {
      eventId = await createOutlookCalendarEvent(
        accessToken,
        integration.calendarId,
        eventInput,
      );

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { outlookEventId: eventId },
      });
    }

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
 * Supports both Google and Outlook calendars
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

  if (!appointment) {
    return;
  }

  // Check for Google event
  if (appointment.googleEventId) {
    const googleIntegration = await prisma.calendarIntegration.findFirst({
      where: {
        configId: appointment.configId,
        providerId: appointment.providerId || null,
        syncEnabled: true,
        platform: 'GOOGLE',
      },
    });

    if (googleIntegration) {
      const accessToken = await getValidAccessToken(googleIntegration.id);
      if (accessToken) {
        const endTime = new Date(
          appointment.scheduledAt.getTime() +
            appointment.durationMinutes * 60 * 1000,
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
            googleIntegration.calendarId,
            appointment.googleEventId,
            eventInput,
          );

          await prisma.calendarIntegration.update({
            where: { id: googleIntegration.id },
            data: {
              lastSyncAt: new Date(),
              lastSyncError: null,
            },
          });
        } catch (error) {
          console.error('Google calendar update error:', error);
          await prisma.calendarIntegration.update({
            where: { id: googleIntegration.id },
            data: {
              lastSyncError:
                error instanceof Error ? error.message : 'Update failed',
            },
          });
        }
      }
    }
  }

  // Check for Outlook event
  if (appointment.outlookEventId) {
    const outlookIntegration = await prisma.calendarIntegration.findFirst({
      where: {
        configId: appointment.configId,
        providerId: appointment.providerId || null,
        syncEnabled: true,
        platform: 'OUTLOOK',
      },
    });

    if (outlookIntegration) {
      const accessToken = await getValidAccessToken(outlookIntegration.id);
      if (accessToken) {
        const endTime = new Date(
          appointment.scheduledAt.getTime() +
            appointment.durationMinutes * 60 * 1000,
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
          await updateOutlookCalendarEvent(
            accessToken,
            outlookIntegration.calendarId,
            appointment.outlookEventId,
            eventInput,
          );

          await prisma.calendarIntegration.update({
            where: { id: outlookIntegration.id },
            data: {
              lastSyncAt: new Date(),
              lastSyncError: null,
            },
          });
        } catch (error) {
          console.error('Outlook calendar update error:', error);
          await prisma.calendarIntegration.update({
            where: { id: outlookIntegration.id },
            data: {
              lastSyncError:
                error instanceof Error ? error.message : 'Update failed',
            },
          });
        }
      }
    }
  }
}

/**
 * Delete calendar event when appointment is cancelled
 * Supports both Google and Outlook calendars
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

  if (!appointment) {
    return;
  }

  // Delete Google event if exists
  if (appointment.googleEventId) {
    const googleIntegration = await prisma.calendarIntegration.findFirst({
      where: {
        configId: appointment.configId,
        providerId: appointment.providerId || null,
        syncEnabled: true,
        platform: 'GOOGLE',
      },
    });

    if (googleIntegration) {
      const accessToken = await getValidAccessToken(googleIntegration.id);
      if (accessToken) {
        try {
          await deleteGoogleCalendarEvent(
            accessToken,
            googleIntegration.calendarId,
            appointment.googleEventId,
          );

          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { googleEventId: null },
          });
        } catch (error) {
          console.error('Google calendar delete error:', error);
        }
      }
    }
  }

  // Delete Outlook event if exists
  if (appointment.outlookEventId) {
    const outlookIntegration = await prisma.calendarIntegration.findFirst({
      where: {
        configId: appointment.configId,
        providerId: appointment.providerId || null,
        syncEnabled: true,
        platform: 'OUTLOOK',
      },
    });

    if (outlookIntegration) {
      const accessToken = await getValidAccessToken(outlookIntegration.id);
      if (accessToken) {
        try {
          await deleteOutlookCalendarEvent(
            accessToken,
            outlookIntegration.calendarId,
            appointment.outlookEventId,
          );

          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { outlookEventId: null },
          });
        } catch (error) {
          console.error('Outlook calendar delete error:', error);
        }
      }
    }
  }
}
