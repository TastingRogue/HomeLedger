/**
 * Developer API surface (P4.13): scoped API keys + user-configured webhooks.
 */
import { apiGet, apiPost, apiPut, apiDelete } from './client';

// ============================
// API Keys
// ============================

export interface ApiKeyInfo {
  id: number;
  name: string;
  scopes: string[] | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreatedApiKey {
  id: number;
  name: string;
  key: string;
  keyPrefix: string;
  scopes: string[] | null;
  createdAt: string;
}

export function listApiKeys(): Promise<ApiKeyInfo[]> {
  return apiGet<ApiKeyInfo[]>('/api-keys');
}

export function listScopes(): Promise<string[]> {
  return apiGet<string[]>('/api-keys/scopes');
}

export function createApiKey(name: string, scopes: string[]): Promise<CreatedApiKey> {
  return apiPost<CreatedApiKey>('/api-keys', { name, scopes });
}

export function revokeApiKey(id: number): Promise<void> {
  return apiDelete(`/api-keys/${id}`);
}

// ============================
// Webhooks
// ============================

export interface WebhookInfo {
  id: number;
  url: string;
  hasSecret: boolean;
  events: string[];
  enabled: boolean;
  lastStatus: string | null;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookPayload {
  url: string;
  secret?: string | null;
  events: string[];
  enabled?: boolean;
}

export function listWebhookEvents(): Promise<string[]> {
  return apiGet<string[]>('/webhooks/events');
}

export function listWebhooks(): Promise<WebhookInfo[]> {
  return apiGet<WebhookInfo[]>('/webhooks');
}

export function createWebhook(payload: CreateWebhookPayload): Promise<WebhookInfo> {
  return apiPost<WebhookInfo>('/webhooks', payload);
}

export function updateWebhook(id: number, payload: Partial<CreateWebhookPayload>): Promise<WebhookInfo> {
  return apiPut<WebhookInfo>(`/webhooks/${id}`, payload);
}

export function deleteWebhook(id: number): Promise<void> {
  return apiDelete(`/webhooks/${id}`);
}

export function testWebhook(id: number): Promise<{ status: string }> {
  return apiPost<{ status: string }>(`/webhooks/${id}/test`);
}
