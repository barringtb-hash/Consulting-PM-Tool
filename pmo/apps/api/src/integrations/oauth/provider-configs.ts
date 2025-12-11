/**
 * OAuth Provider Configurations
 *
 * Defines OAuth settings for each integration provider.
 */

import type { ProviderConfig, IntegrationProvider } from '../integration.types';

/**
 * Provider configurations for all supported integrations
 */
export const PROVIDER_CONFIGS: Record<IntegrationProvider, ProviderConfig> = {
  // ============================================================================
  // EMAIL PROVIDERS
  // ============================================================================
  GMAIL: {
    id: 'GMAIL',
    name: 'Gmail',
    description: 'Gmail email integration for tracking and sync',
    category: 'email',
    authType: 'oauth2',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
    ],
    oauthConfig: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientIdEnvVar: 'GOOGLE_CLIENT_ID',
      clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
    },
    supportedEntities: ['emails', 'threads'],
    syncCapabilities: {
      direction: 'BIDIRECTIONAL',
      realTime: true,
      batchSync: true,
    },
  },
  OUTLOOK: {
    id: 'OUTLOOK',
    name: 'Outlook',
    description: 'Microsoft Outlook email integration',
    category: 'email',
    authType: 'oauth2',
    scopes: ['Mail.Read', 'Mail.Send', 'Mail.ReadWrite'],
    oauthConfig: {
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientIdEnvVar: 'MICROSOFT_CLIENT_ID',
      clientSecretEnvVar: 'MICROSOFT_CLIENT_SECRET',
    },
    supportedEntities: ['emails', 'folders'],
    syncCapabilities: {
      direction: 'BIDIRECTIONAL',
      realTime: true,
      batchSync: true,
    },
  },

  // ============================================================================
  // CALENDAR PROVIDERS
  // ============================================================================
  GOOGLE_CALENDAR: {
    id: 'GOOGLE_CALENDAR',
    name: 'Google Calendar',
    description: 'Google Calendar integration for meetings and events',
    category: 'calendar',
    authType: 'oauth2',
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    oauthConfig: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientIdEnvVar: 'GOOGLE_CLIENT_ID',
      clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
    },
    supportedEntities: ['events', 'calendars'],
    syncCapabilities: {
      direction: 'BIDIRECTIONAL',
      realTime: true,
      batchSync: true,
    },
  },
  OUTLOOK_CALENDAR: {
    id: 'OUTLOOK_CALENDAR',
    name: 'Outlook Calendar',
    description: 'Microsoft Outlook Calendar integration',
    category: 'calendar',
    authType: 'oauth2',
    scopes: ['Calendars.ReadWrite'],
    oauthConfig: {
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientIdEnvVar: 'MICROSOFT_CLIENT_ID',
      clientSecretEnvVar: 'MICROSOFT_CLIENT_SECRET',
    },
    supportedEntities: ['events', 'calendars'],
    syncCapabilities: {
      direction: 'BIDIRECTIONAL',
      realTime: true,
      batchSync: true,
    },
  },

  // ============================================================================
  // CRM PROVIDERS
  // ============================================================================
  SALESFORCE: {
    id: 'SALESFORCE',
    name: 'Salesforce',
    description:
      'Salesforce CRM integration for contacts, accounts, and opportunities',
    category: 'crm',
    authType: 'oauth2',
    scopes: ['api', 'refresh_token', 'offline_access'],
    oauthConfig: {
      authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      clientIdEnvVar: 'SALESFORCE_CLIENT_ID',
      clientSecretEnvVar: 'SALESFORCE_CLIENT_SECRET',
    },
    supportedEntities: [
      'contacts',
      'accounts',
      'opportunities',
      'leads',
      'activities',
    ],
    syncCapabilities: {
      direction: 'BIDIRECTIONAL',
      realTime: true,
      batchSync: true,
    },
  },
  HUBSPOT: {
    id: 'HUBSPOT',
    name: 'HubSpot',
    description: 'HubSpot CRM integration',
    category: 'crm',
    authType: 'oauth2',
    scopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
    ],
    oauthConfig: {
      authUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
      clientIdEnvVar: 'HUBSPOT_CLIENT_ID',
      clientSecretEnvVar: 'HUBSPOT_CLIENT_SECRET',
    },
    supportedEntities: ['contacts', 'companies', 'deals', 'activities'],
    syncCapabilities: {
      direction: 'BIDIRECTIONAL',
      realTime: true,
      batchSync: true,
    },
  },
  PIPEDRIVE: {
    id: 'PIPEDRIVE',
    name: 'Pipedrive',
    description: 'Pipedrive CRM integration',
    category: 'crm',
    authType: 'oauth2',
    scopes: ['base', 'contacts:full', 'deals:full', 'activities:full'],
    oauthConfig: {
      authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
      tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
      clientIdEnvVar: 'PIPEDRIVE_CLIENT_ID',
      clientSecretEnvVar: 'PIPEDRIVE_CLIENT_SECRET',
    },
    supportedEntities: ['contacts', 'organizations', 'deals', 'activities'],
    syncCapabilities: {
      direction: 'BIDIRECTIONAL',
      realTime: true,
      batchSync: true,
    },
  },

  // ============================================================================
  // COMMUNICATION PROVIDERS
  // ============================================================================
  SLACK: {
    id: 'SLACK',
    name: 'Slack',
    description: 'Slack integration for notifications and commands',
    category: 'communication',
    authType: 'oauth2',
    scopes: ['chat:write', 'channels:read', 'users:read'],
    oauthConfig: {
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      clientIdEnvVar: 'SLACK_CLIENT_ID',
      clientSecretEnvVar: 'SLACK_CLIENT_SECRET',
    },
    supportedEntities: ['messages', 'channels'],
    syncCapabilities: {
      direction: 'OUTBOUND',
      realTime: true,
      batchSync: false,
    },
  },
  TEAMS: {
    id: 'TEAMS',
    name: 'Microsoft Teams',
    description: 'Microsoft Teams integration',
    category: 'communication',
    authType: 'oauth2',
    scopes: ['Chat.ReadWrite', 'ChannelMessage.Send'],
    oauthConfig: {
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientIdEnvVar: 'MICROSOFT_CLIENT_ID',
      clientSecretEnvVar: 'MICROSOFT_CLIENT_SECRET',
    },
    supportedEntities: ['messages', 'channels', 'teams'],
    syncCapabilities: {
      direction: 'OUTBOUND',
      realTime: true,
      batchSync: false,
    },
  },

  // ============================================================================
  // AUTOMATION PROVIDERS
  // ============================================================================
  ZAPIER: {
    id: 'ZAPIER',
    name: 'Zapier',
    description: 'Connect with 5000+ apps via Zapier',
    category: 'automation',
    authType: 'webhook',
    supportedEntities: ['all'],
    syncCapabilities: {
      direction: 'BIDIRECTIONAL',
      realTime: true,
      batchSync: false,
    },
  },
  MAKE: {
    id: 'MAKE',
    name: 'Make (Integromat)',
    description: 'Automation platform integration',
    category: 'automation',
    authType: 'webhook',
    supportedEntities: ['all'],
    syncCapabilities: {
      direction: 'BIDIRECTIONAL',
      realTime: true,
      batchSync: false,
    },
  },
  CUSTOM_WEBHOOK: {
    id: 'CUSTOM_WEBHOOK',
    name: 'Custom Webhook',
    description: 'Custom webhook integration',
    category: 'automation',
    authType: 'webhook',
    supportedEntities: ['all'],
    syncCapabilities: {
      direction: 'OUTBOUND',
      realTime: true,
      batchSync: false,
    },
  },
};

/**
 * Get provider configuration by ID
 */
export function getProviderConfig(
  provider: IntegrationProvider,
): ProviderConfig {
  return PROVIDER_CONFIGS[provider];
}

/**
 * Get all providers by category
 */
export function getProvidersByCategory(category: string): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter((p) => p.category === category);
}

/**
 * Get all OAuth-enabled providers
 */
export function getOAuthProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter((p) => p.authType === 'oauth2');
}
