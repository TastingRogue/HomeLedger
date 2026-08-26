/**
 * API functions for account management.
 * Uses apiGet/apiPost/apiPut/apiPatch from the client module.
 */

import { apiGet, apiPost, apiPut, apiPatch } from './client';

// ─── Types ───

export type AccountType = 'Débito' | 'Crédito' | 'Inversión' | 'Vales' | 'Efectivo';

export interface AccountData {
  id: number;
  userId?: number;
  name: string;
  type: AccountType;
  bank: string | null;
  initialBalance: number;
  balance?: number;
  calculatedBalance?: number;
  balanceLimit: number | null;
  creditLimit: number | null;
  status: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedSubscription {
  id: number;
  name: string;
  amount: number;
  cycle: 'Semanal' | 'Mensual';
  nextPaymentDate: string;
  daysRemaining: number;
  status: 'Activa' | 'Inactiva';
}

export interface AccountDetail extends AccountData {
  calculatedBalance: number;
  creditUtilization?: number;
  creditHealthStatus?: 'saludable' | 'moderado' | 'crítico';
  linkedSubscriptions?: LinkedSubscription[];
  transactionCount?: number;
}

export interface CreateAccountPayload {
  name: string;
  initialBalance: number;
  currency?: string;
  type: AccountType;
  bank?: string;
  balanceLimit?: number | null;
  creditLimit?: number | null;
  linkedSubscriptionIds?: number[];
}

export interface UpdateAccountPayload {
  name?: string;
  initialBalance?: number;
  type?: AccountType;
  bank?: string;
  balanceLimit?: number | null;
  creditLimit?: number | null;
}

// Aliases for backward compat
export type Account = AccountData;
export type CreateAccountInput = CreateAccountPayload;
export type UpdateAccountInput = UpdateAccountPayload;

// ─── API Functions ───

/** List all active accounts */
export function listAccounts(): Promise<AccountData[]> {
  return apiGet<AccountData[]>('/accounts');
}

/** Get account detail with calculated balance and credit info */
export function getAccount(id: number): Promise<AccountDetail> {
  return apiGet<AccountDetail>(`/accounts/${id}`);
}

/** Alias for listAccounts */
export function getAccounts(): Promise<AccountData[]> {
  return listAccounts();
}

/** Alias for getAccount */
export function getAccountById(id: number): Promise<AccountDetail> {
  return getAccount(id);
}

/** Create a new account */
export function createAccount(input: CreateAccountPayload): Promise<AccountData> {
  return apiPost<AccountData>('/accounts', input);
}

/** Update an existing account */
export function updateAccount(id: number, input: UpdateAccountPayload): Promise<AccountData> {
  return apiPut<AccountData>(`/accounts/${id}`, input);
}

/** Deactivate an account */
export function deactivateAccount(id: number): Promise<void> {
  return apiPatch<void>(`/accounts/${id}/deactivate`);
}
