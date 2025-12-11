/**
 * OAuth Service
 *
 * Handles OAuth flows for external integrations including:
 * - Authorization URL generation
 * - Token exchange
 * - Token refresh
 * - Secure credential storage
 */

import { prisma } from '../../prisma/client';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { env } from '../../config/env';
import { getProviderConfig } from './provider-configs';
import type {
  IntegrationProvider,
  IntegrationStatus,
  OAuthTokens,
  SyncSettings,
} from '../integration.types';

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// ============================================================================
// CREDENTIAL ENCRYPTION
// ============================================================================

/**
 * Encrypt sensitive credentials for storage.
 */
function encryptCredentials(data: Record<string, unknown>): string {
  const key = Buffer.from(env.jwtSecret).slice(0, 32);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const jsonData = JSON.stringify(data);
  let encrypted = cipher.update(jsonData, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + auth tag + encrypted data
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt stored credentials.
 */
function decryptCredentials(encryptedData: string): Record<string, unknown> {
  const key = Buffer.from(env.jwtSecret).slice(0, 32);
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

// ============================================================================
// OAUTH FLOWS
// ============================================================================

/**
 * Generate OAuth authorization URL for a provider.
 */
export function generateAuthUrl(
  provider: IntegrationProvider,
  tenantId: string,
  redirectUri: string,
): { url: string; state: string } {
  const config = getProviderConfig(provider);

  if (config.authType !== 'oauth2' || !config.oauthConfig) {
    throw new Error(`Provider ${provider} does not support OAuth`);
  }

  const clientId = process.env[config.oauthConfig.clientIdEnvVar];
  if (!clientId) {
    throw new Error(`Missing OAuth client ID for ${provider}`);
  }

  // Generate state for CSRF protection
  const state = randomBytes(32).toString('hex');

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes?.join(' ') || '',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  // Store state in cache for validation (use short expiry)
  // In production, this would be stored in Redis
  storeOAuthState(state, { tenantId, provider });

  return {
    url: `${config.oauthConfig.authUrl}?${params.toString()}`,
    state,
  };
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  provider: IntegrationProvider,
  code: string,
  redirectUri: string,
): Promise<OAuthTokens> {
  const config = getProviderConfig(provider);

  if (!config.oauthConfig) {
    throw new Error(`Provider ${provider} does not support OAuth`);
  }

  const clientId = process.env[config.oauthConfig.clientIdEnvVar];
  const clientSecret = process.env[config.oauthConfig.clientSecretEnvVar];

  if (!clientId || !clientSecret) {
    throw new Error(`Missing OAuth credentials for ${provider}`);
  }

  const response = await fetch(config.oauthConfig.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token exchange failed: ${error}`);
  }

  const tokenData = await response.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    tokenType: tokenData.token_type || 'Bearer',
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined,
    scope: tokenData.scope,
  };
}

/**
 * Refresh OAuth tokens.
 */
export async function refreshTokens(
  provider: IntegrationProvider,
  refreshToken: string,
): Promise<OAuthTokens> {
  const config = getProviderConfig(provider);

  if (!config.oauthConfig) {
    throw new Error(`Provider ${provider} does not support OAuth`);
  }

  const clientId = process.env[config.oauthConfig.clientIdEnvVar];
  const clientSecret = process.env[config.oauthConfig.clientSecretEnvVar];

  if (!clientId || !clientSecret) {
    throw new Error(`Missing OAuth credentials for ${provider}`);
  }

  const response = await fetch(config.oauthConfig.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token refresh failed: ${error}`);
  }

  const tokenData = await response.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || refreshToken, // Some providers don't return new refresh token
    tokenType: tokenData.token_type || 'Bearer',
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined,
    scope: tokenData.scope,
  };
}

// ============================================================================
// INTEGRATION MANAGEMENT
// ============================================================================

/**
 * Create a new integration connection.
 */
export async function createIntegration(
  tenantId: string,
  provider: IntegrationProvider,
  tokens: OAuthTokens,
  name?: string,
): Promise<{ id: number }> {
  const config = getProviderConfig(provider);

  // Encrypt credentials before storing
  const encryptedCredentials = encryptCredentials({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: tokens.tokenType,
    expiresAt: tokens.expiresAt?.toISOString(),
    scope: tokens.scope,
  });

  const integration = await prisma.integration.create({
    data: {
      tenantId,
      provider,
      name: name || config.name,
      status: 'CONNECTED',
      credentials: encryptedCredentials,
      syncSettings: {
        enabled: true,
        direction: config.syncCapabilities.direction,
        frequency: 'HOURLY',
        entities: config.supportedEntities,
        conflictResolution: 'LAST_MODIFIED',
      },
    },
  });

  return { id: integration.id };
}

/**
 * Get integration by ID with decrypted credentials.
 */
export async function getIntegrationWithCredentials(
  integrationId: number,
  tenantId: string,
): Promise<{
  integration: {
    id: number;
    provider: IntegrationProvider;
    status: IntegrationStatus;
  };
  tokens: OAuthTokens;
} | null> {
  const integration = await prisma.integration.findFirst({
    where: {
      id: integrationId,
      tenantId,
    },
  });

  if (!integration || !integration.credentials) {
    return null;
  }

  const credentials = decryptCredentials(integration.credentials as string);

  return {
    integration: {
      id: integration.id,
      provider: integration.provider as IntegrationProvider,
      status: integration.status as IntegrationStatus,
    },
    tokens: {
      accessToken: credentials.accessToken as string,
      refreshToken: credentials.refreshToken as string | undefined,
      tokenType: credentials.tokenType as string,
      expiresAt: credentials.expiresAt
        ? new Date(credentials.expiresAt as string)
        : undefined,
      scope: credentials.scope as string | undefined,
    },
  };
}

/**
 * Update integration credentials.
 */
export async function updateIntegrationCredentials(
  integrationId: number,
  tokens: OAuthTokens,
): Promise<void> {
  const encryptedCredentials = encryptCredentials({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: tokens.tokenType,
    expiresAt: tokens.expiresAt?.toISOString(),
    scope: tokens.scope,
  });

  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      credentials: encryptedCredentials,
      status: 'CONNECTED',
    },
  });
}

/**
 * Disconnect an integration.
 */
export async function disconnectIntegration(
  integrationId: number,
  _tenantId: string,
): Promise<void> {
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      status: 'DISCONNECTED',
      credentials: null,
    },
  });
}

/**
 * Get valid access token, refreshing if needed.
 */
export async function getValidAccessToken(
  integrationId: number,
  tenantId: string,
): Promise<string> {
  const data = await getIntegrationWithCredentials(integrationId, tenantId);

  if (!data) {
    throw new Error('Integration not found');
  }

  const { integration, tokens } = data;

  // Check if token is expired or about to expire (5 min buffer)
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes
  const isExpired =
    tokens.expiresAt && tokens.expiresAt.getTime() < Date.now() + expiryBuffer;

  if (isExpired && tokens.refreshToken) {
    // Refresh tokens
    const newTokens = await refreshTokens(
      integration.provider,
      tokens.refreshToken,
    );
    await updateIntegrationCredentials(integrationId, newTokens);
    return newTokens.accessToken;
  }

  return tokens.accessToken;
}

// ============================================================================
// STATE MANAGEMENT (In production, use Redis)
// ============================================================================

const oauthStateStore = new Map<
  string,
  { tenantId: string; provider: IntegrationProvider; createdAt: number }
>();

function storeOAuthState(
  state: string,
  data: { tenantId: string; provider: IntegrationProvider },
): void {
  oauthStateStore.set(state, {
    ...data,
    createdAt: Date.now(),
  });

  // Clean up expired states (older than 10 minutes)
  const expiryTime = 10 * 60 * 1000;
  for (const [key, value] of oauthStateStore.entries()) {
    if (Date.now() - value.createdAt > expiryTime) {
      oauthStateStore.delete(key);
    }
  }
}

export function validateOAuthState(
  state: string,
): { tenantId: string; provider: IntegrationProvider } | null {
  const data = oauthStateStore.get(state);

  if (!data) {
    return null;
  }

  // Verify not expired (10 minute window)
  const expiryTime = 10 * 60 * 1000;
  if (Date.now() - data.createdAt > expiryTime) {
    oauthStateStore.delete(state);
    return null;
  }

  // Remove state after validation (single use)
  oauthStateStore.delete(state);

  return { tenantId: data.tenantId, provider: data.provider };
}

// ============================================================================
// INTEGRATION QUERIES
// ============================================================================

/**
 * Get all integrations for a tenant.
 */
export async function getTenantIntegrations(tenantId: string) {
  return prisma.integration.findMany({
    where: { tenantId },
    select: {
      id: true,
      provider: true,
      name: true,
      status: true,
      syncSettings: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      nextSyncAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get integration by provider.
 */
export async function getIntegrationByProvider(
  tenantId: string,
  provider: IntegrationProvider,
) {
  return prisma.integration.findFirst({
    where: {
      tenantId,
      provider,
    },
    select: {
      id: true,
      provider: true,
      name: true,
      status: true,
      syncSettings: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      nextSyncAt: true,
      createdAt: true,
    },
  });
}

/**
 * Update sync settings for an integration.
 */
export async function updateSyncSettings(
  integrationId: number,
  settings: Partial<SyncSettings>,
): Promise<void> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { syncSettings: true },
  });

  const currentSettings = (integration?.syncSettings as SyncSettings) || {};

  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      syncSettings: {
        ...currentSettings,
        ...settings,
      },
    },
  });
}
