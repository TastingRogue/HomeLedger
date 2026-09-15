/**
 * Auth API module - login, register, and session management.
 */

import { apiRequest, apiGet, apiDelete, setTokens, clearTokens, getRefreshToken } from './client';

export interface LoginRequest {
  email: string;
  password: string;
  /** Second factor (6-digit TOTP or a one-time backup code), when 2FA is enabled. */
  totpCode?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Login with email and password.
 * Stores tokens on success.
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const result = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: data,
    skipAuth: true,
  });

  setTokens(result.accessToken, result.refreshToken);
  return result;
}

/**
 * Register a new user.
 * Stores tokens on success.
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const result = await apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: data,
    skipAuth: true,
  });

  setTokens(result.accessToken, result.refreshToken);
  return result;
}

/**
 * Logout the current user.
 * Clears tokens.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
      });
    } catch {
      // Logout silently even if API call fails
    }
  }
  clearTokens();
}

/**
 * Get the current user's profile.
 */
export async function getMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me');
}

// ============================
// TOTP 2FA (P4.12)
// ============================

export interface TotpStatus {
  enabled: boolean;
  pending: boolean;
  backupCodesRemaining: number;
}

export interface TotpEnrollment {
  secret: string;
  otpauthUri: string;
}

/** Current 2FA status for the logged-in user. */
export async function getTotpStatus(): Promise<TotpStatus> {
  return apiRequest<TotpStatus>('/auth/2fa/status');
}

/** Begin enrollment; returns secret + otpauth URI (2FA not yet active). */
export async function enrollTotp(): Promise<TotpEnrollment> {
  return apiRequest<TotpEnrollment>('/auth/2fa/enroll', { method: 'POST' });
}

/** Confirm enrollment with a valid code; returns one-time backup codes. */
export async function confirmTotp(code: string): Promise<{ backupCodes: string[] }> {
  return apiRequest<{ backupCodes: string[] }>('/auth/2fa/confirm', { method: 'POST', body: { code } });
}

/** Disable 2FA (requires a valid current TOTP or backup code). */
export async function disableTotp(code: string): Promise<void> {
  await apiRequest('/auth/2fa/disable', { method: 'POST', body: { code } });
}

// ============================
// Sessions (P4.12)
// ============================

export interface SessionInfo {
  id: number;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  current: boolean;
}

/** List the current user's active sessions (marks the current one). */
export async function listSessions(): Promise<SessionInfo[]> {
  const refreshToken = getRefreshToken();
  return apiGet<SessionInfo[]>('/auth/sessions', refreshToken ? { refreshToken } : undefined);
}

/** Revoke a single session by id. */
export async function revokeSession(id: number): Promise<void> {
  await apiDelete(`/auth/sessions/${id}`);
}
