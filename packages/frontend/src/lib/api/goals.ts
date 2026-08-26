/**
 * API functions for savings goals management.
 * Uses apiGet/apiPost/apiPut from the client module.
 */

import { apiGet, apiPost, apiPut } from './client';

// ─── Types ───

export type GoalType = 'Lista de Deseos' | 'Deuda';
export type GoalStatus = 'Activa' | 'Completada';

export interface GoalData {
  id: number;
  userId?: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  type: GoalType;
  deadline: string | null;
  status: GoalStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalPayload {
  name: string;
  targetAmount: number;
  type: GoalType;
  deadline?: string;
}

export interface UpdateGoalPayload {
  name?: string;
  targetAmount?: number;
  type?: GoalType;
  deadline?: string | null;
}

export interface FundGoalPayload {
  amount: number;
}

export interface FundGoalResponse extends GoalData {
  fundedAmount: number;
}

export interface WithdrawGoalResponse extends GoalData {
  withdrawnAmount: number;
}

// ─── API Functions ───

/** List all goals for the authenticated user */
export function listGoals(): Promise<GoalData[]> {
  return apiGet<GoalData[]>('/goals');
}

/** Create a new savings goal */
export function createGoal(input: CreateGoalPayload): Promise<GoalData> {
  return apiPost<GoalData>('/goals', input);
}

/** Update an existing goal */
export function updateGoal(id: number, input: UpdateGoalPayload): Promise<GoalData> {
  return apiPut<GoalData>(`/goals/${id}`, input);
}

/** Fund a goal (assign savings). Server caps at targetAmount - savedAmount. */
export function fundGoal(id: number, payload: FundGoalPayload): Promise<FundGoalResponse> {
  return apiPost<FundGoalResponse>(`/goals/${id}/fund`, payload);
}

/** Withdraw funds from a goal. Server caps at savedAmount (floor of 0). */
export function withdrawGoal(id: number, payload: FundGoalPayload): Promise<WithdrawGoalResponse> {
  return apiPost<WithdrawGoalResponse>(`/goals/${id}/withdraw`, payload);
}
