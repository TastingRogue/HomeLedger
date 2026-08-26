/**
 * API functions for budget management.
 * Uses apiGet/apiPost/apiPut/apiDelete from the client module.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';

// ─── Types ───

export type BudgetPeriod = 'Mensual' | 'Semanal';

export interface BudgetCategory {
  id: number;
  budgetId: number;
  categoryId: number;
  allocated: number;
  spent: number;
  rollover: number;
  remaining: number;
}

export interface BudgetWithProgress {
  id: number;
  userId: number;
  name: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  totalAllocated: number;
  totalSpent: number;
  rolloverEnabled: boolean;
  alertThreshold: number;
  createdAt: string;
  updatedAt: string;
  categories: BudgetCategory[];
  percentUsed: number;
}

export interface BudgetSummary {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
}

export interface CategoryAllocation {
  categoryId: number;
  allocated: number;
}

export interface CreateBudgetPayload {
  name: string;
  period: BudgetPeriod;
  startDate: string;
  categories: CategoryAllocation[];
  rolloverEnabled?: boolean;
  alertThreshold?: number;
}

export interface UpdateBudgetPayload {
  name?: string;
  period?: BudgetPeriod;
  startDate?: string;
  categories?: CategoryAllocation[];
  rolloverEnabled?: boolean;
  alertThreshold?: number;
}

// ─── API Functions ───

/** List current active budgets with progress */
export function listBudgets(): Promise<BudgetWithProgress[]> {
  return apiGet<BudgetWithProgress[]>('/budgets');
}

/** Get a budget by ID with per-category progress */
export function getBudget(id: number): Promise<BudgetWithProgress> {
  return apiGet<BudgetWithProgress>(`/budgets/${id}`);
}

/** Get budget summary (total allocated vs total spent) */
export function getBudgetSummary(): Promise<BudgetSummary> {
  return apiGet<BudgetSummary>('/budgets/summary');
}

/** Create a new budget with category allocations */
export function createBudget(input: CreateBudgetPayload): Promise<BudgetWithProgress> {
  return apiPost<BudgetWithProgress>('/budgets', input);
}

/** Update an existing budget */
export function updateBudget(id: number, input: UpdateBudgetPayload): Promise<BudgetWithProgress> {
  return apiPut<BudgetWithProgress>(`/budgets/${id}`, input);
}

/** Delete a budget */
export function deleteBudget(id: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/budgets/${id}`);
}
