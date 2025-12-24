import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';
import { storeToken, clearStoredToken, getStoredToken } from './token-storage';
import { storeTenant, clearStoredTenant } from './tenant-storage';

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: UserRole;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

const AUTH_BASE_PATH = buildApiUrl('/auth');

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(
    `${AUTH_BASE_PATH}/login`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  );

  const data = await handleResponse<{
    user: AuthUser;
    token?: string;
    tenant?: TenantInfo | null;
  }>(response);

  // Store token for Safari ITP fallback
  // Safari may block cookies even with partitioned attribute,
  // so we store the token in localStorage and send via Authorization header
  if (data.token) {
    storeToken(data.token);
  }

  // Store tenant info for multi-tenant API requests
  // The X-Tenant-ID header is required for tenant-scoped API endpoints
  if (data.tenant) {
    storeTenant({ id: data.tenant.id, slug: data.tenant.slug });
  }

  return data.user;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const hadStoredToken = !!getStoredToken();

  const response = await fetch(
    `${AUTH_BASE_PATH}/me`,
    buildOptions({
      method: 'GET',
    }),
  );

  const data = await handleResponse<{
    user: AuthUser | null;
    token?: string;
    tenant?: TenantInfo | null;
  }>(response);

  // Store token for Safari ITP fallback.
  // This ensures users who logged in before the Safari localStorage fallback
  // was implemented will get their tokens stored on subsequent page loads.
  if (data.token) {
    storeToken(data.token);
  } else if (hadStoredToken && !data.user) {
    // If we had a stored token but the response indicates no authenticated user,
    // the token was invalid or expired - clear it to avoid sending stale tokens.
    clearStoredToken();
  }

  // Store tenant info for multi-tenant API requests
  // This ensures users who logged in before multi-tenant support
  // will get their tenant ID stored on subsequent page loads
  if (data.tenant) {
    storeTenant({ id: data.tenant.id, slug: data.tenant.slug });
  } else {
    // Clear stale tenant info if server returns no tenant.
    // This handles cases where:
    // 1. User is not authenticated
    // 2. User is authenticated but has no tenant association
    // 3. User's tenant was deleted or their TenantUser record was removed
    // Without this, stale tenant IDs would cause 400 "Tenant not found" errors
    clearStoredTenant();
  }

  return data.user ?? null;
}

export async function logout(): Promise<void> {
  const response = await fetch(
    `${AUTH_BASE_PATH}/logout`,
    buildOptions({
      method: 'POST',
    }),
  );

  // Clear stored token for Safari ITP fallback
  clearStoredToken();

  // Clear tenant info for multi-tenant support
  clearStoredTenant();

  await handleResponse<void>(response);
}

export interface ForgotPasswordResponse {
  message: string;
  resetUrl?: string; // Only in development
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  message?: string;
}

export interface ResetPasswordResponse {
  message: string;
}

/**
 * Request a password reset link
 */
export async function forgotPassword(
  email: string,
): Promise<ForgotPasswordResponse> {
  const response = await fetch(
    `${AUTH_BASE_PATH}/forgot-password`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  );

  return handleResponse<ForgotPasswordResponse>(response);
}

/**
 * Verify if a password reset token is valid
 */
export async function verifyResetToken(
  token: string,
): Promise<VerifyResetTokenResponse> {
  const response = await fetch(
    `${AUTH_BASE_PATH}/verify-reset-token?token=${encodeURIComponent(token)}`,
    buildOptions({
      method: 'GET',
    }),
  );

  return handleResponse<VerifyResetTokenResponse>(response);
}

/**
 * Reset password using a valid token
 */
export async function resetPassword(
  token: string,
  password: string,
  confirmPassword: string,
): Promise<ResetPasswordResponse> {
  const response = await fetch(
    `${AUTH_BASE_PATH}/reset-password`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ token, password, confirmPassword }),
    }),
  );

  return handleResponse<ResetPasswordResponse>(response);
}
