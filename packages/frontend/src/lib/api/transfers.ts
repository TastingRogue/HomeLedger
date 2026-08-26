/**
 * API functions for transfer management.
 * Uses apiGet/apiPost/apiDelete from the client module.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';

// ─── Types ───

export interface Transfer {
  id: number;
  userId: number;
  name: string;
  date: string;
  amount: number;
  sourceAccountId: number;
  destinationAccountId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransferPayload {
  name: string;
  date: string;
  amount: number;
  sourceAccountId: number;
  destinationAccountId: number;
}

// ─── API Functions ───

/** List all transfers for the authenticated user, sorted by date desc */
export function listTransfers(): Promise<Transfer[]> {
  return apiGet<Transfer[]>('/transfers');
}

/** Create a new transfer between accounts */
export function createTransfer(input: CreateTransferPayload): Promise<Transfer> {
  return apiPost<Transfer>('/transfers', input);
}

/** Delete a transfer (reverses the movement) */
export function deleteTransfer(id: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/transfers/${id}`);
}

/** Update an existing transfer */
export function updateTransfer(id: number, input: Partial<CreateTransferPayload>): Promise<Transfer> {
  return apiPut<Transfer>(`/transfers/${id}`, input);
}
