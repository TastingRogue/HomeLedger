/**
 * Auth API module - login, register, and session management.
 */

import { apiRequest, setTokens, clearTokens, getRefreshToken } from './client';

export interface LoginRequest {
  email: string;
  password: string;
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
