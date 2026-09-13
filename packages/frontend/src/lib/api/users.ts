/**
 * API client for admin user-management, registration policy, and the instance
 * currency. Every endpoint here is admin-only on the backend (`/api/v1/users/*`,
 * `requireRole(['admin'])`), so these functions are meant to be called from
 * admin-gated UI.
 */
import { apiGet, apiPut, apiPost, apiPatch, apiDelete } from './client';

// ─── Types ───

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  disabled: boolean;
  createdAt: string;
}

export type RegistrationMode = 'first_user_only' | 'open' | 'closed';

export interface RegistrationSettings {
  mode: RegistrationMode;
  /** Lowercased, de-duped emails. Only enforced when mode is `open`. */
  allowlist: string[];
  /** The set of valid modes (present on GET). */
  modes?: readonly string[];
}

export interface CurrencySettings {
  currency: string;
  supported: string[];
}

// ─── Users ───

/** List all users (admin view). */
export async function listUsers(): Promise<AdminUser[]> {
  return apiGet<AdminUser[]>('/users');
}

/** Enable or disable a user. */
export async function setUserDisabled(id: number, disabled: boolean): Promise<AdminUser> {
  return apiPatch<AdminUser>(`/users/${id}/disabled`, { disabled });
}

/** Admin-set a user's password (min 8 chars, enforced server-side). */
export async function resetUserPassword(id: number, password: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>(`/users/${id}/reset-password`, { password });
}

/** Permanently delete a user and their data. */
export async function deleteUser(id: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/users/${id}`);
}

// ─── Registration policy ───

export async function getRegistration(): Promise<RegistrationSettings> {
  return apiGet<RegistrationSettings>('/users/registration');
}

export async function setRegistration(input: {
  mode?: RegistrationMode;
  allowlist?: string[];
}): Promise<RegistrationSettings> {
  return apiPut<RegistrationSettings>('/users/registration', input);
}

// ─── Instance currency (single-currency model) ───

export async function getInstanceCurrency(): Promise<CurrencySettings> {
  return apiGet<CurrencySettings>('/users/currency');
}

export async function setInstanceCurrency(currency: string): Promise<{ currency: string }> {
  return apiPut<{ currency: string }>('/users/currency', { currency });
}
