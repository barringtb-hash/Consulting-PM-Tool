import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma/client';
import { getTenantId } from '../../tenant/tenant.context';
import { CreateApiKeyInput, ApiKeyResult } from './types';

const SALT_ROUNDS = 10;
const KEY_PREFIX = 'bt_'; // Bug Tracking API key prefix

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * Generate a new API key
 * Returns the raw key only once - it cannot be retrieved later
 */
export async function createApiKey(
  input: CreateApiKeyInput
): Promise<ApiKeyResult> {
  const tenantId = getTenantId();

  // Generate a secure random key
  const rawKey = KEY_PREFIX + randomBytes(32).toString('hex');
  const keyPrefix = rawKey.substring(0, 11); // bt_ + first 8 chars

  // Hash the key for storage
  const keyHash = await bcrypt.hash(rawKey, SALT_ROUNDS);

  const apiKey = await prisma.bugTrackingApiKey.create({
    data: {
      tenantId,
      name: input.name,
      keyHash,
      keyPrefix,
      permissions: input.permissions,
      expiresAt: input.expiresAt || null,
    },
  });

  return {
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    key: rawKey, // Only returned on creation
    permissions: apiKey.permissions,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  };
}

/**
 * Validate an API key and return the associated tenant/permissions
 */
export async function validateApiKey(rawKey: string): Promise<{
  valid: boolean;
  tenantId?: string;
  permissions?: string[];
  keyId?: number;
}> {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
    return { valid: false };
  }

  const keyPrefix = rawKey.substring(0, 11);

  // Find API keys with matching prefix
  const candidates = await prisma.bugTrackingApiKey.findMany({
    where: {
      keyPrefix,
      revokedAt: null,
    },
  });

  for (const candidate of candidates) {
    // Check if expired
    if (candidate.expiresAt && candidate.expiresAt < new Date()) {
      continue;
    }

    // Verify the key hash
    const isValid = await bcrypt.compare(rawKey, candidate.keyHash);
    if (isValid) {
      // Update last used timestamp
      await prisma.bugTrackingApiKey.update({
        where: { id: candidate.id },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      });

      return {
        valid: true,
        tenantId: candidate.tenantId,
        permissions: candidate.permissions,
        keyId: candidate.id,
      };
    }
  }

  return { valid: false };
}

/**
 * List API keys for the current tenant
 */
export async function listApiKeys() {
  const tenantId = getTenantId();

  return prisma.bugTrackingApiKey.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      lastUsedAt: true,
      usageCount: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: number) {
  const tenantId = getTenantId();

  const apiKey = await prisma.bugTrackingApiKey.findFirst({
    where: { id: keyId, tenantId },
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  if (apiKey.revokedAt) {
    throw new Error('API key is already revoked');
  }

  return prisma.bugTrackingApiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      revokedAt: true,
    },
  });
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(keyId: number) {
  const tenantId = getTenantId();

  const apiKey = await prisma.bugTrackingApiKey.findFirst({
    where: { id: keyId, tenantId },
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  await prisma.bugTrackingApiKey.delete({
    where: { id: keyId },
  });
}

/**
 * Check if an API key has a specific permission
 */
export function hasPermission(
  permissions: string[],
  required: string
): boolean {
  // Check for exact match
  if (permissions.includes(required)) {
    return true;
  }

  // Check for wildcard permissions (e.g., 'issues:*' matches 'issues:read')
  const [resource, _action] = required.split(':');
  if (permissions.includes(`${resource}:*`)) {
    return true;
  }

  // Check for global wildcard
  if (permissions.includes('*')) {
    return true;
  }

  return false;
}

// ============================================================================
// PERMISSION CONSTANTS
// ============================================================================

export const PERMISSIONS = {
  ISSUES_READ: 'issues:read',
  ISSUES_WRITE: 'issues:write',
  ERRORS_WRITE: 'errors:write',
  LABELS_READ: 'labels:read',
  LABELS_WRITE: 'labels:write',
  COMMENTS_READ: 'comments:read',
  COMMENTS_WRITE: 'comments:write',
  API_KEYS_MANAGE: 'api-keys:manage',
} as const;

export const DEFAULT_AI_PERMISSIONS = [
  PERMISSIONS.ISSUES_WRITE,
  PERMISSIONS.ISSUES_READ,
  PERMISSIONS.ERRORS_WRITE,
  PERMISSIONS.LABELS_READ,
  PERMISSIONS.COMMENTS_WRITE,
];
