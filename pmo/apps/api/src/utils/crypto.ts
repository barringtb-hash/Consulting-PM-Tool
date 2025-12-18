/**
 * Cryptographic Utilities
 *
 * Provides secure encryption/decryption for sensitive data storage.
 * Uses AES-256-GCM for authenticated encryption.
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key derived from JWT secret.
 * Ensures consistent 32-byte key for AES-256.
 *
 * Note: JWT secret must be ASCII-only so that character count
 * matches byte count when deriving the key.
 */
function getEncryptionKey(): Buffer {
  const secret = env.jwtSecret;

  // Enforce ASCII-only secret to avoid multi-byte encoding length issues
  if (!/^[\x20-\x7E]+$/.test(secret)) {
    throw new Error(
      'JWT_SECRET must contain only printable ASCII characters for encryption key derivation',
    );
  }

  // Use first 32 bytes of JWT secret (already validated to be >= 32 chars)
  return Buffer.from(secret, 'ascii').slice(0, 32);
}

/**
 * Encrypt a string value for secure storage.
 * Returns format: iv:authTag:encryptedData (all hex encoded)
 */
export function encryptString(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a previously encrypted string.
 * Expects format: iv:authTag:encryptedData (all hex encoded)
 */
export function decryptString(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted data format: expected 3 colon-separated parts (iv:authTag:data)',
    );
  }

  const [ivHex, authTagHex, encrypted] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      `Invalid encrypted data format: IV must be ${IV_LENGTH} bytes and auth tag must be ${AUTH_TAG_LENGTH} bytes`,
    );
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt an object for secure storage.
 * Returns format: iv:authTag:encryptedData (all hex encoded)
 */
export function encryptCredentials(data: Record<string, unknown>): string {
  return encryptString(JSON.stringify(data));
}

/**
 * Decrypt a previously encrypted object.
 * Expects format: iv:authTag:encryptedData (all hex encoded)
 */
export function decryptCredentials(
  encryptedData: string,
): Record<string, unknown> {
  const decrypted = decryptString(encryptedData);

  try {
    return JSON.parse(decrypted);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        'Decryption succeeded but credentials JSON is invalid or corrupted',
      );
    }
    throw error;
  }
}

/**
 * Check if a string appears to be encrypted (has our format).
 * Useful for migration scenarios where data may be mixed.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;

  const [ivHex, authTagHex] = parts;

  // Validate hex format (only valid hex characters)
  const hexRegex = /^[0-9a-f]+$/i;

  // Check if IV and auth tag have correct hex lengths and valid hex characters
  return (
    ivHex.length === IV_LENGTH * 2 &&
    authTagHex.length === AUTH_TAG_LENGTH * 2 &&
    hexRegex.test(ivHex) &&
    hexRegex.test(authTagHex)
  );
}
