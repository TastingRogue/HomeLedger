/**
 * API functions for subscription management and payment calendar.
 * Uses apiGet/apiPost/apiPut/apiPatch from the client module.
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';

// ─── Types ───

export type SubscriptionCycle = 'Semanal' | 'Mensual';
export type SubscriptionStatus = 'Activa' | 'Inactiva';

export interface Subscription {
  id: number;
  userId: number;
  accountId: number;
  categoryId: number;
  name: string;
  amount: number;
  cycle: SubscriptionCycle;
  startDate: string;
  nextPaymentDate: string;
  autoCharge: boolean;
  status: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionCalendarEntry {
  id: number;
  name: string;
  amount: number;
  cycle: string;
  categoryId: number;
  accountId: number;
  nextPaymentDate: string;
  daysRemaining: number;
  autoCharge: boolean;
}

export interface CreateSubscriptionPayload {
  name: string;
  amount: number;
  startDate: string;
  cycle: SubscriptionCycle;
  categoryId: number;
  accountId: number;
  autoCharge: boolean;
}

export interface UpdateSubscriptionPayload {
  name?: string;
  amount?: number;
  startDate?: string;
  cycle?: SubscriptionCycle;
  categoryId?: number;
  accountId?: number;
  autoCharge?: boolean;
}

// ─── API Functions ───

/** List all subscriptions for the authenticated user */
export function listSubscriptions(): Promise<Subscription[]> {
  return apiGet<Subscription[]>('/subscriptions');
}

/** Create a new subscription */
export function createSubscription(input: CreateSubscriptionPayload): Promise<Subscription> {
  return apiPost<Subscription>('/subscriptions', input);
}

/** Update an existing subscription */
export function updateSubscription(id: number, input: UpdateSubscriptionPayload): Promise<Subscription> {
  return apiPut<Subscription>(`/subscriptions/${id}`, input);
}

/** Deactivate a subscription */
export function deactivateSubscription(id: number): Promise<Subscription> {
  return apiPatch<Subscription>(`/subscriptions/${id}/deactivate`);
}

/** Get payment calendar (active subscriptions sorted by days remaining) */
export function getSubscriptionCalendar(): Promise<SubscriptionCalendarEntry[]> {
  return apiGet<SubscriptionCalendarEntry[]>('/subscriptions/calendar');
}

/** Delete a subscription permanently */
export function deleteSubscription(id: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/subscriptions/${id}`);
}
