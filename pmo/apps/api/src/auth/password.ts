/**
 * Password Hashing Utilities
 *
 * Provides secure password hashing and verification using bcrypt.
 *
 * Security Considerations:
 * - Uses bcrypt with configurable salt rounds (default: 10)
 * - Salt rounds can be adjusted via BCRYPT_SALT_ROUNDS env var
 * - Higher salt rounds = more secure but slower (each +1 doubles time)
 * - Recommended: 10-12 for production, 4 for testing
 *
 * @module auth/password
 */

import bcrypt from 'bcryptjs';

import { env } from '../config/env';

/**
 * Hashes a plain text password using bcrypt.
 *
 * @param password - The plain text password to hash
 * @returns The bcrypt hash of the password
 *
 * @example
 * const hash = await hashPassword('userPassword123');
 * // Store hash in database, never store plain text
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, env.bcryptSaltRounds);
};

/**
 * Compares a plain text password against a stored bcrypt hash.
 *
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param password - The plain text password to verify
 * @param passwordHash - The stored bcrypt hash to compare against
 * @returns True if the password matches the hash, false otherwise
 *
 * @example
 * const isValid = await comparePassword('userInput', storedHash);
 * if (!isValid) {
 *   throw new Error('Invalid credentials');
 * }
 */
export const comparePassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};
