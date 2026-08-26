/**
 * API functions for alerts/notifications management.
 * Uses apiGet/apiPatch from the client module.
 */

import { apiGet, apiPatch, apiPost, apiDelete } from './client';

// ─── Types ───

export type AlertType =
  | 'balance_low'
  | 'credit_high'
  | 'payment_due'
  | 'payment_overdue'
  | 'goal_completed';

export type AlertSeverity = 'warning' | 'critical' | 'info';

export interface AlertData {
  id: number;
  userId: number;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  data: Record<string, unknown> | null;
  isRead: boolean;
  hash: string;
  createdAt: string;
}

export interface AlertSettings {
  balanceLow: boolean;
  creditHigh: boolean;
  paymentDue: boolean;
  paymentOverdue: boolean;
  goalCompleted: boolean;
}

// ─── API Functions ───

/** List all alerts for the authenticated user */
export function listAlerts(): Promise<AlertData[]> {
  return apiGet<AlertData[]>('/alerts');
}

/** Mark a single alert as read */
export function markAlertAsRead(id: number): Promise<void> {
  return apiPatch<void>(`/alerts/${id}/read`);
}

/** Mark all alerts as read */
export function markAllAlertsAsRead(): Promise<void> {
  return apiPatch<void>('/alerts/read-all');
}

/** Get alert configuration settings */
export function getAlertSettings(): Promise<AlertSettings> {
  return apiGet<AlertSettings>('/alerts/settings');
}

/** Update alert configuration settings */
export function updateAlertSettings(settings: AlertSettings): Promise<AlertSettings> {
  return apiPatch<AlertSettings>('/alerts/settings', settings);
}

/** Delete an alert */
export function deleteAlert(id: number): Promise<void> {
  return apiDelete<void>(`/alerts/${id}`);
}

/** Manually trigger alert evaluation */
export function evaluateAlerts(): Promise<{ generated: number }> {
  return apiPost<{ generated: number }>('/alerts/evaluate', {});
}
