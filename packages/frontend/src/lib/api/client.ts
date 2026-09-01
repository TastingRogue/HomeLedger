/**
 * API client for HomeLedger backend.
 * Handles authentication, token refresh on 401, and provides typed fetch helpers.
 */

import { browser } from '$app/environment';

const API_BASE = '/api/v1';

const TOKEN_KEY = 'sf_access_token';
const REFRESH_TOKEN_KEY = 'sf_refresh_token';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ============================
// Token Management
// ============================

export function getAccessToken(): string | null {
  if (!browser) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!browser) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (!browser) return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (!browser) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('sf_user');
}

export function hasToken(): boolean {
  return getAccessToken() !== null;
}

// ============================
// Internal Helpers
// ============================

function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const body = await response.json();
    const newAccessToken = (body.data?.accessToken ?? body.accessToken) as string;
    if (newAccessToken && browser) {
      localStorage.setItem(TOKEN_KEY, newAccessToken);
    }
    return newAccessToken;
  } catch {
    clearTokens();
    return null;
  }
}

function redirectToLogin(): void {
  if (browser && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.success === false) {
    throw new ApiError(
      response.status,
      body.error?.code ?? body.code ?? 'UNKNOWN_ERROR',
      body.error?.message ?? body.message ?? 'Error desconocido',
      body.error?.details ?? body.details
    );
  }

  // The API may wrap data in { success: true, data: ... } or return directly
  return (body.data !== undefined ? body.data : body) as T;
}

// ============================
// Public API Methods
// ============================

export interface RequestOptions {
  method?: string;
  body?: unknown;
  skipAuth?: boolean;
}

/**
 * Generic API request with automatic 401 handling (refresh + retry).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options;

  const headers: Record<string, string> = {};
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  // Only add Content-Type if there's a body
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let response = await fetch(`${API_BASE}${path}`, fetchOptions);

  // On 401: try to refresh token and retry the request once
  if (response.status === 401 && !skipAuth) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      const retryOptions: RequestInit = { ...fetchOptions, headers: retryHeaders };
      response = await fetch(`${API_BASE}${path}`, retryOptions);
    } else {
      redirectToLogin();
      throw new ApiError(401, 'SESSION_EXPIRED', 'Sesión expirada. Inicia sesión nuevamente.');
    }
  }

  // If still 401 after refresh, redirect to login
  if (response.status === 401) {
    clearTokens();
    redirectToLogin();
    throw new ApiError(401, 'SESSION_EXPIRED', 'Sesión expirada. Inicia sesión nuevamente.');
  }

  return handleResponse<T>(response);
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, browser ? window.location.origin : 'http://localhost');

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  // On 401: try to refresh and retry
  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      const retryResponse = await fetch(url.toString(), {
        method: 'GET',
        headers: { ...getAuthHeaders(), Authorization: `Bearer ${newToken}` },
      });
      if (retryResponse.status === 401) {
        clearTokens();
        redirectToLogin();
        throw new ApiError(401, 'SESSION_EXPIRED', 'Sesión expirada. Inicia sesión nuevamente.');
      }
      return handleResponse<T>(retryResponse);
    }
    clearTokens();
    redirectToLogin();
    throw new ApiError(401, 'SESSION_EXPIRED', 'Sesión expirada. Inicia sesión nuevamente.');
  }

  return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PUT', body });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' });
}

// ============================
// Binary / Multipart Helpers
// ============================

/**
 * Authenticated fetch that returns a Blob (for previews/downloads).
 * Refreshes the token once on 401 and throws ApiError on failure so callers
 * can surface errors instead of failing silently.
 */
export async function apiFetchBlob(path: string): Promise<Blob> {
  const doFetch = (token: string | null): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  let response = await doFetch(getAccessToken());
  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (!newToken) {
      clearTokens();
      redirectToLogin();
      throw new ApiError(401, 'SESSION_EXPIRED', 'Sesión expirada. Inicia sesión nuevamente.');
    }
    response = await doFetch(newToken);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error?.code ?? 'DOWNLOAD_ERROR', body.error?.message ?? `Error ${response.status}`);
  }
  return response.blob();
}

/**
 * Authenticated multipart upload (FormData). Do NOT set Content-Type; the
 * browser sets the multipart boundary. Refreshes the token once on 401.
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const doFetch = (token: string | null): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

  let response = await doFetch(getAccessToken());
  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (!newToken) {
      clearTokens();
      redirectToLogin();
      throw new ApiError(401, 'SESSION_EXPIRED', 'Sesión expirada. Inicia sesión nuevamente.');
    }
    response = await doFetch(newToken);
  }
  return handleResponse<T>(response);
}
