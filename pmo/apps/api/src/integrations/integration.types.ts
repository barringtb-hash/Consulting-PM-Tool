/**
 * Integration Hub Type Definitions
 */

export type IntegrationProvider =
  | 'GMAIL'
  | 'OUTLOOK'
  | 'GOOGLE_CALENDAR'
  | 'OUTLOOK_CALENDAR'
  | 'SALESFORCE'
  | 'HUBSPOT'
  | 'PIPEDRIVE'
  | 'SLACK'
  | 'TEAMS'
  | 'ZAPIER'
  | 'MAKE'
  | 'CUSTOM_WEBHOOK';

export type IntegrationStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'
  | 'EXPIRED';

export type SyncDirection = 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
export type SyncStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED';

/**
 * Integration provider configuration
 */
export interface ProviderConfig {
  id: IntegrationProvider;
  name: string;
  description: string;
  category: 'email' | 'calendar' | 'crm' | 'communication' | 'automation';
  authType: 'oauth2' | 'api_key' | 'webhook';
  scopes?: string[];
  oauthConfig?: {
    authUrl: string;
    tokenUrl: string;
    clientIdEnvVar: string;
    clientSecretEnvVar: string;
  };
  supportedEntities: string[];
  syncCapabilities: {
    direction: SyncDirection;
    realTime: boolean;
    batchSync: boolean;
  };
}

/**
 * OAuth tokens stored for an integration
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: Date;
  scope?: string;
}

/**
 * Integration connection input
 */
export interface IntegrationConnectInput {
  provider: IntegrationProvider;
  name?: string;
  credentials?: Record<string, string>;
}

/**
 * Sync settings for an integration
 */
export interface SyncSettings {
  enabled: boolean;
  direction: SyncDirection;
  frequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'MANUAL';
  entities: string[]; // ['contacts', 'opportunities', 'activities']
  filters?: Record<string, unknown>;
  conflictResolution:
    | 'LAST_MODIFIED'
    | 'SOURCE_WINS'
    | 'DESTINATION_WINS'
    | 'MANUAL';
}

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  sourceField: string;
  destinationField: string;
  transform?: 'direct' | 'lowercase' | 'uppercase' | 'date' | 'custom';
  customTransform?: string; // For custom transformation logic
  required: boolean;
  defaultValue?: unknown;
}

/**
 * Entity mapping configuration
 */
export interface EntityMapping {
  sourceEntity: string;
  destinationEntity: string;
  fields: FieldMapping[];
  syncDirection: SyncDirection;
}

/**
 * Sync job definition
 */
export interface SyncJobInput {
  integrationId: number;
  direction: SyncDirection;
  entityType: string;
  entityIds?: number[];
  fullSync?: boolean;
}

/**
 * Sync log entry
 */
export interface SyncLogEntry {
  id: number;
  integrationId: number;
  direction: SyncDirection;
  entityType: string;
  entityId?: number;
  externalId?: string;
  status: SyncStatus;
  errorMessage?: string;
  payload?: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Webhook event payload
 */
export interface WebhookEventPayload {
  provider: IntegrationProvider;
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature?: string;
}

/**
 * Integration summary
 */
export interface IntegrationSummary {
  id: number;
  provider: IntegrationProvider;
  name: string;
  status: IntegrationStatus;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  nextSyncAt?: Date;
  syncSettings?: SyncSettings;
  connectedAt?: Date;
}
