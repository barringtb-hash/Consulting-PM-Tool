/**
 * Password Reset Service
 *
 * Handles password reset functionality including:
 * - Generating secure reset tokens
 * - Validating reset tokens
 * - Resetting passwords with tokens
 * - Admin-initiated password resets
 *
 * Security Considerations:
 * - Tokens are hashed using SHA-256 before storage
 * - Tokens expire after 30 minutes
 * - Tokens can only be used once
 * - Rate limiting is handled at the route level
 *
 * @module auth/password-reset
 */

import crypto from 'crypto';

import { prisma } from '../prisma/client';
import { hashPassword } from './password';

/** Token expiration time in minutes */
const TOKEN_EXPIRATION_MINUTES = 30;

/**
 * Generates a cryptographically secure random token.
 * @returns A 32-byte hex-encoded token (64 characters)
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a token using SHA-256.
 * @param token - The plain text token
 * @returns The SHA-256 hash of the token
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  resetUrl?: string; // Only returned in development for testing
}

export interface ValidateTokenResult {
  valid: boolean;
  userId?: number;
  message?: string;
}

/**
 * Creates a password reset request for a user.
 * Always returns success to prevent email enumeration attacks.
 *
 * @param email - The email address of the user requesting reset
 * @returns Result with reset URL in development mode
 */
export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Find the user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    // Log for debugging but don't reveal to user
    console.log(
      `[Password Reset] Reset requested for non-existent email: ${normalizedEmail}`,
    );
    return {
      success: true,
      message:
        'If an account with that email exists, you will receive a password reset link.',
    };
  }

  // Invalidate any existing unused tokens for this user
  await prisma.passwordReset.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(), // Mark as used to invalidate
    },
  });

  // Generate a new token
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000);

  // Store the hashed token
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  // Build the reset URL
  const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  // In production, you would send an email here
  // For now, log in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n========================================`);
    console.log(`PASSWORD RESET LINK (DEV MODE)`);
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`Link: ${resetUrl}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log(`========================================\n`);

    return {
      success: true,
      message:
        'If an account with that email exists, you will receive a password reset link.',
      resetUrl, // Only in development
    };
  }

  // TODO: Integrate with email service
  // await sendPasswordResetEmail(user.email, user.name, resetUrl);

  return {
    success: true,
    message:
      'If an account with that email exists, you will receive a password reset link.',
  };
}

/**
 * Validates a password reset token.
 *
 * @param token - The plain text token to validate
 * @returns Validation result with userId if valid
 */
export async function validateResetToken(
  token: string,
): Promise<ValidateTokenResult> {
  const tokenHash = hashToken(token);

  const resetRecord = await prisma.passwordReset.findFirst({
    where: {
      tokenHash,
      usedAt: null, // Not already used
      expiresAt: {
        gt: new Date(), // Not expired
      },
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
    },
  });

  if (!resetRecord) {
    return {
      valid: false,
      message: 'Invalid or expired reset token. Please request a new one.',
    };
  }

  return {
    valid: true,
    userId: resetRecord.userId,
  };
}

/**
 * Resets a user's password using a valid reset token.
 *
 * @param token - The plain text reset token
 * @param newPassword - The new password (already validated)
 * @returns Result indicating success or failure
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<PasswordResetResult> {
  const tokenHash = hashToken(token);

  // Find and validate the token in one query
  const resetRecord = await prisma.passwordReset.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  if (!resetRecord) {
    return {
      success: false,
      message: 'Invalid or expired reset token. Please request a new one.',
    };
  }

  // Hash the new password
  const passwordHash = await hashPassword(newPassword);

  // Update password and mark token as used in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  console.log(
    `[Password Reset] Password successfully reset for user: ${resetRecord.user.email}`,
  );

  return {
    success: true,
    message: 'Your password has been successfully reset. You can now log in.',
  };
}

/**
 * Admin-initiated password reset for a user.
 * Requires ADMIN or SUPER_ADMIN role (checked at route level).
 *
 * Authorization rules:
 * - Super Admins can reset any user's password (cross-tenant)
 * - Admins can only reset passwords for users within their tenant(s)
 * - No one except Super Admins can reset Super Admin passwords
 *
 * @param adminUserId - The ID of the admin performing the reset
 * @param targetUserId - The ID of the user whose password is being reset
 * @param newPassword - The new password (already validated)
 * @returns Result indicating success or failure
 */
export async function adminResetPassword(
  adminUserId: number,
  targetUserId: number,
  newPassword: string,
): Promise<PasswordResetResult> {
  // Verify the target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!targetUser) {
    return {
      success: false,
      message: 'User not found.',
    };
  }

  // Get admin user with their tenant memberships
  const adminUser = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: {
      email: true,
      role: true,
      tenantMemberships: {
        select: { tenantId: true },
      },
    },
  });

  if (!adminUser) {
    return {
      success: false,
      message: 'Admin user not found.',
    };
  }

  // Prevent non-super-admins from resetting super admin passwords
  if (targetUser.role === 'SUPER_ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
    return {
      success: false,
      message: 'Only Super Admins can reset other Super Admin passwords.',
    };
  }

  // For non-super-admins, verify tenant membership
  // Admins can only reset passwords for users within their tenant(s)
  if (adminUser.role !== 'SUPER_ADMIN') {
    // Get tenant IDs that the admin belongs to
    const adminTenantIds = adminUser.tenantMemberships.map((m) => m.tenantId);

    // Check if target user shares at least one tenant with the admin
    const sharedTenantCount = await prisma.tenantUser.count({
      where: {
        userId: targetUserId,
        tenantId: { in: adminTenantIds },
      },
    });

    if (sharedTenantCount === 0) {
      return {
        success: false,
        message:
          'You can only reset passwords for users within your organization.',
      };
    }
  }

  // Hash the new password
  const passwordHash = await hashPassword(newPassword);

  // Update the password
  await prisma.user.update({
    where: { id: targetUserId },
    data: { passwordHash },
  });

  // Invalidate any pending password reset tokens for this user
  await prisma.passwordReset.updateMany({
    where: {
      userId: targetUserId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  console.log(
    `[Password Reset] Admin ${adminUser.email} reset password for user: ${targetUser.email}`,
  );

  return {
    success: true,
    message: `Password has been reset for ${targetUser.name} (${targetUser.email}).`,
  };
}

/**
 * Cleanup expired password reset tokens.
 * Should be run periodically (e.g., via cron job).
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.passwordReset.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
    },
  });

  if (result.count > 0) {
    console.log(
      `[Password Reset] Cleaned up ${result.count} expired/used tokens`,
    );
  }

  return result.count;
}
