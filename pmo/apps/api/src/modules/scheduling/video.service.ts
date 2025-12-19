/**
 * Video Conferencing Service
 *
 * Integrates with Zoom, Google Meet, and Microsoft Teams for:
 * - OAuth authentication flows
 * - Meeting creation for appointments
 * - Meeting management (update, delete)
 * - Auto-inclusion of meeting links in appointment confirmations
 */

import { prisma } from '../../prisma/client';
import { VideoPlatform } from '@prisma/client';
import { encryptString, decryptString, isEncrypted } from '../../utils/crypto';

// ============================================================================
// TYPES
// ============================================================================

interface VideoMeetingConfigInput {
  platform: VideoPlatform;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  defaultSettings?: VideoMeetingSettings;
}

interface VideoMeetingSettings {
  autoRecord?: boolean;
  waitingRoom?: boolean;
  muteParticipantsOnEntry?: boolean;
  joinBeforeHost?: boolean;
  defaultDurationMinutes?: number;
}

interface VideoMeeting {
  id: string;
  platform: VideoPlatform;
  joinUrl: string;
  hostUrl?: string;
  password?: string;
  startTime: Date;
  durationMinutes: number;
  topic: string;
}

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

// OAuth configuration from environment
const OAUTH_CONFIG = {
  zoom: {
    clientId: process.env.ZOOM_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
    redirectUri: process.env.ZOOM_REDIRECT_URI || '',
    authUrl: 'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token',
    apiBaseUrl: 'https://api.zoom.us/v2',
  },
  googleMeet: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_MEET_REDIRECT_URI || '',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    apiBaseUrl: 'https://www.googleapis.com/calendar/v3',
    scopes: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar',
    ],
  },
  teams: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri: process.env.MICROSOFT_TEAMS_REDIRECT_URI || '',
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    authUrl: 'https://login.microsoftonline.com',
    tokenUrl: 'https://login.microsoftonline.com',
    apiBaseUrl: 'https://graph.microsoft.com/v1.0',
    scopes: [
      'OnlineMeetings.ReadWrite',
      'Calendars.ReadWrite',
      'offline_access',
    ],
  },
};

// ============================================================================
// OAUTH FLOWS
// ============================================================================

/**
 * Generate OAuth authorization URL for a platform
 */
export function getOAuthUrl(
  platform: VideoPlatform,
  configId: number,
  state?: string,
): string {
  const statePayload = JSON.stringify({ configId, state });
  const encodedState = Buffer.from(statePayload).toString('base64');

  switch (platform) {
    case 'ZOOM': {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: OAUTH_CONFIG.zoom.clientId,
        redirect_uri: OAUTH_CONFIG.zoom.redirectUri,
        state: encodedState,
      });
      return `${OAUTH_CONFIG.zoom.authUrl}?${params.toString()}`;
    }

    case 'GOOGLE_MEET': {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: OAUTH_CONFIG.googleMeet.clientId,
        redirect_uri: OAUTH_CONFIG.googleMeet.redirectUri,
        scope: OAUTH_CONFIG.googleMeet.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state: encodedState,
      });
      return `${OAUTH_CONFIG.googleMeet.authUrl}?${params.toString()}`;
    }

    case 'TEAMS': {
      const { tenantId } = OAUTH_CONFIG.teams;
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: OAUTH_CONFIG.teams.clientId,
        redirect_uri: OAUTH_CONFIG.teams.redirectUri,
        scope: OAUTH_CONFIG.teams.scopes.join(' '),
        response_mode: 'query',
        state: encodedState,
      });
      return `${OAUTH_CONFIG.teams.authUrl}/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
    }

    default:
      throw new Error(`Unsupported video platform: ${platform}`);
  }
}

/**
 * Exchange OAuth authorization code for tokens
 */
export async function exchangeCodeForTokens(
  platform: VideoPlatform,
  code: string,
): Promise<OAuthTokens> {
  switch (platform) {
    case 'ZOOM':
      return exchangeZoomCode(code);
    case 'GOOGLE_MEET':
      return exchangeGoogleCode(code);
    case 'TEAMS':
      return exchangeTeamsCode(code);
    default:
      throw new Error(`Unsupported video platform: ${platform}`);
  }
}

async function exchangeZoomCode(code: string): Promise<OAuthTokens> {
  const { clientId, clientSecret, redirectUri, tokenUrl } = OAUTH_CONFIG.zoom;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64',
  );

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom OAuth error: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

async function exchangeGoogleCode(code: string): Promise<OAuthTokens> {
  const { clientId, clientSecret, redirectUri, tokenUrl } =
    OAUTH_CONFIG.googleMeet;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google OAuth error: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

async function exchangeTeamsCode(code: string): Promise<OAuthTokens> {
  const { clientId, clientSecret, redirectUri, tokenUrl, tenantId, scopes } =
    OAUTH_CONFIG.teams;

  const response = await fetch(`${tokenUrl}/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft OAuth error: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

/**
 * Refresh access token for a platform
 */
async function refreshAccessToken(config: {
  id: number;
  platform: VideoPlatform;
  refreshToken: string | null;
}): Promise<string> {
  if (!config.refreshToken) {
    throw new Error('No refresh token available');
  }

  const decryptedRefreshToken = isEncrypted(config.refreshToken)
    ? decryptString(config.refreshToken)
    : config.refreshToken;

  let tokens: OAuthTokens;

  switch (config.platform) {
    case 'ZOOM': {
      const { clientId, clientSecret, tokenUrl } = OAUTH_CONFIG.zoom;
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64',
      );

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: decryptedRefreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Zoom token');
      }

      tokens = await response.json();
      break;
    }

    case 'GOOGLE_MEET': {
      const { clientId, clientSecret, tokenUrl } = OAUTH_CONFIG.googleMeet;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: decryptedRefreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Google token');
      }

      tokens = await response.json();
      break;
    }

    case 'TEAMS': {
      const { clientId, clientSecret, tokenUrl, tenantId, scopes } =
        OAUTH_CONFIG.teams;

      const response = await fetch(
        `${tokenUrl}/${tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: decryptedRefreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            scope: scopes.join(' '),
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to refresh Microsoft token');
      }

      tokens = await response.json();
      break;
    }

    default:
      throw new Error(`Unsupported platform: ${config.platform}`);
  }

  // Update stored tokens
  const expiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000)
    : null;

  await prisma.videoMeetingConfig.update({
    where: { id: config.id },
    data: {
      accessToken: encryptString(tokens.accessToken),
      refreshToken: tokens.refreshToken
        ? encryptString(tokens.refreshToken)
        : config.refreshToken,
      tokenExpiresAt: expiresAt,
    },
  });

  return tokens.accessToken;
}

/**
 * Get valid access token, refreshing if necessary
 */
async function getValidAccessToken(configId: number): Promise<{
  accessToken: string;
  platform: VideoPlatform;
}> {
  const config = await prisma.videoMeetingConfig.findFirst({
    where: { configId, isActive: true },
  });

  if (!config) {
    throw new Error('Video conferencing not configured');
  }

  // Check if token needs refresh
  const needsRefresh =
    config.tokenExpiresAt &&
    config.tokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000);

  let accessToken: string;

  if (needsRefresh && config.refreshToken) {
    accessToken = await refreshAccessToken(config);
  } else {
    accessToken = isEncrypted(config.accessToken)
      ? decryptString(config.accessToken)
      : config.accessToken;
  }

  return { accessToken, platform: config.platform };
}

// ============================================================================
// VIDEO MEETING CONFIG MANAGEMENT
// ============================================================================

/**
 * Save OAuth tokens for a scheduling config
 */
export async function saveVideoConfig(
  configId: number,
  data: VideoMeetingConfigInput,
): Promise<void> {
  const expiresAt = data.tokenExpiresAt || null;

  await prisma.videoMeetingConfig.upsert({
    where: {
      configId_platform: {
        configId,
        platform: data.platform,
      },
    },
    create: {
      configId,
      platform: data.platform,
      accessToken: encryptString(data.accessToken),
      refreshToken: data.refreshToken ? encryptString(data.refreshToken) : null,
      tokenExpiresAt: expiresAt,
      defaultSettings: data.defaultSettings || {},
      isActive: true,
    },
    update: {
      accessToken: encryptString(data.accessToken),
      refreshToken: data.refreshToken ? encryptString(data.refreshToken) : null,
      tokenExpiresAt: expiresAt,
      defaultSettings: data.defaultSettings || {},
      isActive: true,
    },
  });
}

/**
 * Get video config for a scheduling config
 */
export async function getVideoConfig(configId: number) {
  return prisma.videoMeetingConfig.findFirst({
    where: { configId, isActive: true },
  });
}

/**
 * Get all video configs for a scheduling config
 */
export async function getVideoConfigs(configId: number) {
  return prisma.videoMeetingConfig.findMany({
    where: { configId },
    select: {
      id: true,
      platform: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      defaultSettings: true,
      // Never expose tokens
    },
  });
}

/**
 * Update video config settings
 */
export async function updateVideoConfig(
  id: number,
  data: {
    isActive?: boolean;
    defaultSettings?: VideoMeetingSettings;
  },
) {
  return prisma.videoMeetingConfig.update({
    where: { id },
    data,
    select: {
      id: true,
      platform: true,
      isActive: true,
      defaultSettings: true,
    },
  });
}

/**
 * Delete video config (disconnect integration)
 */
export async function deleteVideoConfig(id: number) {
  return prisma.videoMeetingConfig.delete({
    where: { id },
  });
}

// ============================================================================
// MEETING CREATION
// ============================================================================

/**
 * Create a video meeting for an appointment
 */
export async function createMeetingForAppointment(
  appointmentId: number,
): Promise<VideoMeeting | null> {
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

  // Get video config
  const videoConfig = await getVideoConfig(appointment.configId);
  if (!videoConfig) {
    // Video conferencing not configured, skip
    return null;
  }

  // Get valid access token
  const { accessToken, platform } = await getValidAccessToken(
    appointment.configId,
  );
  const settings = (videoConfig.defaultSettings as VideoMeetingSettings) || {};

  // Create meeting based on platform
  let meeting: VideoMeeting;

  switch (platform) {
    case 'ZOOM':
      meeting = await createZoomMeeting(accessToken, appointment, settings);
      break;
    case 'GOOGLE_MEET':
      meeting = await createGoogleMeetMeeting(
        accessToken,
        appointment,
        settings,
      );
      break;
    case 'TEAMS':
      meeting = await createTeamsMeeting(accessToken, appointment, settings);
      break;
    default:
      throw new Error(`Unsupported video platform: ${platform}`);
  }

  // Store meeting info on appointment
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      videoMeetingUrl: meeting.joinUrl,
      videoMeetingId: meeting.id,
      videoMeetingPassword: meeting.password || null,
    },
  });

  return meeting;
}

async function createZoomMeeting(
  accessToken: string,
  appointment: {
    scheduledAt: Date;
    durationMinutes: number;
    patientName: string;
    appointmentType?: { name: string } | null;
    provider?: { name: string } | null;
  },
  settings: VideoMeetingSettings,
): Promise<VideoMeeting> {
  const topic =
    appointment.appointmentType?.name ||
    `Appointment with ${appointment.patientName}`;

  const response = await fetch(
    `${OAUTH_CONFIG.zoom.apiBaseUrl}/users/me/meetings`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time: appointment.scheduledAt.toISOString(),
        duration: appointment.durationMinutes,
        timezone: 'UTC',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: settings.joinBeforeHost ?? false,
          mute_upon_entry: settings.muteParticipantsOnEntry ?? true,
          waiting_room: settings.waitingRoom ?? true,
          auto_recording: settings.autoRecord ? 'cloud' : 'none',
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Zoom meeting: ${error}`);
  }

  const data = await response.json();

  return {
    id: String(data.id),
    platform: 'ZOOM',
    joinUrl: data.join_url,
    hostUrl: data.start_url,
    password: data.password,
    startTime: new Date(data.start_time),
    durationMinutes: data.duration,
    topic: data.topic,
  };
}

async function createGoogleMeetMeeting(
  accessToken: string,
  appointment: {
    scheduledAt: Date;
    durationMinutes: number;
    patientName: string;
    appointmentType?: { name: string } | null;
    provider?: { name: string } | null;
  },
  _settings: VideoMeetingSettings,
): Promise<VideoMeeting> {
  const summary =
    appointment.appointmentType?.name ||
    `Appointment with ${appointment.patientName}`;

  const endTime = new Date(
    appointment.scheduledAt.getTime() + appointment.durationMinutes * 60 * 1000,
  );

  const response = await fetch(
    `${OAUTH_CONFIG.googleMeet.apiBaseUrl}/calendars/primary/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        start: {
          dateTime: appointment.scheduledAt.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        conferenceData: {
          createRequest: {
            requestId: `appointment-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Google Meet: ${error}`);
  }

  const data = await response.json();
  const meetLink = data.conferenceData?.entryPoints?.find(
    (e: { entryPointType: string }) => e.entryPointType === 'video',
  )?.uri;

  return {
    id: data.id,
    platform: 'GOOGLE_MEET',
    joinUrl: meetLink || data.htmlLink,
    startTime: new Date(data.start.dateTime),
    durationMinutes: appointment.durationMinutes,
    topic: data.summary,
  };
}

async function createTeamsMeeting(
  accessToken: string,
  appointment: {
    scheduledAt: Date;
    durationMinutes: number;
    patientName: string;
    appointmentType?: { name: string } | null;
    provider?: { name: string } | null;
  },
  _settings: VideoMeetingSettings,
): Promise<VideoMeeting> {
  const subject =
    appointment.appointmentType?.name ||
    `Appointment with ${appointment.patientName}`;

  const endTime = new Date(
    appointment.scheduledAt.getTime() + appointment.durationMinutes * 60 * 1000,
  );

  const response = await fetch(
    `${OAUTH_CONFIG.teams.apiBaseUrl}/me/onlineMeetings`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject,
        startDateTime: appointment.scheduledAt.toISOString(),
        endDateTime: endTime.toISOString(),
        lobbyBypassSettings: {
          scope: 'organization',
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Teams meeting: ${error}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    platform: 'TEAMS',
    joinUrl: data.joinWebUrl,
    startTime: new Date(data.startDateTime),
    durationMinutes: appointment.durationMinutes,
    topic: data.subject,
  };
}

// ============================================================================
// MEETING MANAGEMENT
// ============================================================================

/**
 * Update a video meeting (e.g., when appointment is rescheduled)
 */
export async function updateMeetingForAppointment(
  appointmentId: number,
): Promise<VideoMeeting | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      config: true,
      provider: true,
      appointmentType: true,
    },
  });

  if (!appointment || !appointment.videoMeetingId) {
    return null;
  }

  const { accessToken, platform } = await getValidAccessToken(
    appointment.configId,
  );

  switch (platform) {
    case 'ZOOM':
      await updateZoomMeeting(accessToken, appointment);
      break;
    case 'GOOGLE_MEET':
      await updateGoogleMeetEvent(accessToken, appointment);
      break;
    case 'TEAMS':
      // Teams meetings don't need explicit updates for time changes
      // The calendar event handles this
      break;
  }

  return {
    id: appointment.videoMeetingId,
    platform,
    joinUrl: appointment.videoMeetingUrl || '',
    startTime: appointment.scheduledAt,
    durationMinutes: appointment.durationMinutes,
    topic:
      appointment.appointmentType?.name ||
      `Appointment with ${appointment.patientName}`,
  };
}

async function updateZoomMeeting(
  accessToken: string,
  appointment: {
    videoMeetingId: string | null;
    scheduledAt: Date;
    durationMinutes: number;
  },
): Promise<void> {
  if (!appointment.videoMeetingId) return;

  const response = await fetch(
    `${OAUTH_CONFIG.zoom.apiBaseUrl}/meetings/${appointment.videoMeetingId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_time: appointment.scheduledAt.toISOString(),
        duration: appointment.durationMinutes,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to update Zoom meeting: ${error}`);
  }
}

async function updateGoogleMeetEvent(
  accessToken: string,
  appointment: {
    videoMeetingId: string | null;
    scheduledAt: Date;
    durationMinutes: number;
  },
): Promise<void> {
  if (!appointment.videoMeetingId) return;

  const endTime = new Date(
    appointment.scheduledAt.getTime() + appointment.durationMinutes * 60 * 1000,
  );

  const response = await fetch(
    `${OAUTH_CONFIG.googleMeet.apiBaseUrl}/calendars/primary/events/${appointment.videoMeetingId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start: {
          dateTime: appointment.scheduledAt.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to update Google Calendar event: ${error}`);
  }
}

/**
 * Delete a video meeting (e.g., when appointment is cancelled)
 */
export async function deleteMeetingForAppointment(
  appointmentId: number,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      configId: true,
      videoMeetingId: true,
    },
  });

  if (!appointment || !appointment.videoMeetingId) {
    return;
  }

  try {
    const { accessToken, platform } = await getValidAccessToken(
      appointment.configId,
    );

    switch (platform) {
      case 'ZOOM':
        await deleteZoomMeeting(accessToken, appointment.videoMeetingId);
        break;
      case 'GOOGLE_MEET':
        await deleteGoogleMeetEvent(accessToken, appointment.videoMeetingId);
        break;
      case 'TEAMS':
        await deleteTeamsMeeting(accessToken, appointment.videoMeetingId);
        break;
    }

    // Clear meeting info from appointment
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        videoMeetingUrl: null,
        videoMeetingId: null,
        videoMeetingPassword: null,
      },
    });
  } catch (error) {
    console.error('Failed to delete video meeting:', error);
  }
}

async function deleteZoomMeeting(
  accessToken: string,
  meetingId: string,
): Promise<void> {
  const response = await fetch(
    `${OAUTH_CONFIG.zoom.apiBaseUrl}/meetings/${meetingId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error(`Failed to delete Zoom meeting: ${error}`);
  }
}

async function deleteGoogleMeetEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const response = await fetch(
    `${OAUTH_CONFIG.googleMeet.apiBaseUrl}/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error(`Failed to delete Google Calendar event: ${error}`);
  }
}

async function deleteTeamsMeeting(
  accessToken: string,
  meetingId: string,
): Promise<void> {
  const response = await fetch(
    `${OAUTH_CONFIG.teams.apiBaseUrl}/me/onlineMeetings/${meetingId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error(`Failed to delete Teams meeting: ${error}`);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if video conferencing is configured for a scheduling config
 */
export async function isVideoConfigured(configId: number): Promise<boolean> {
  const config = await getVideoConfig(configId);
  return !!config;
}

/**
 * Get supported video platforms
 */
export function getSupportedPlatforms(): VideoPlatform[] {
  return ['ZOOM', 'GOOGLE_MEET', 'TEAMS'];
}
