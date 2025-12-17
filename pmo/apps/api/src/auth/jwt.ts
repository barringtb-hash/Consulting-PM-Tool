/**
 * JWT Token Utilities
 *
 * Provides JWT token generation and verification for authentication.
 *
 * Token Structure:
 * - Payload: { userId: number }
 * - Algorithm: HS256 (HMAC-SHA256)
 * - Expiration: Configurable via JWT_EXPIRES_IN env var (default: '7d')
 *
 * Security Considerations:
 * - JWT_SECRET must be at least 32 characters
 * - Tokens are stored in httpOnly cookies (preferred) or Authorization header
 * - See auth.middleware.ts for token extraction logic
 *
 * @module auth/jwt
 */

import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';

/**
 * JWT payload structure containing user identification.
 * Kept minimal to reduce token size and attack surface.
 */
export type JwtPayload = {
  /** The unique identifier of the authenticated user */
  userId: number;
};

/**
 * Creates a signed JWT token for the given payload.
 *
 * @param payload - The data to encode in the token (userId)
 * @returns A signed JWT token string
 *
 * @example
 * const token = signToken({ userId: user.id });
 * // Set as httpOnly cookie or return in response
 */
export const signToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, env.jwtSecret, options);
};

/**
 * Verifies and decodes a JWT token.
 *
 * @param token - The JWT token string to verify
 * @returns The decoded payload containing userId
 * @throws {JsonWebTokenError} If the token signature is invalid
 * @throws {TokenExpiredError} If the token has expired
 * @throws {NotBeforeError} If the token is not yet valid
 *
 * @example
 * try {
 *   const payload = verifyToken(token);
 *   const userId = payload.userId;
 * } catch (error) {
 *   // Handle invalid or expired token
 * }
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
};
