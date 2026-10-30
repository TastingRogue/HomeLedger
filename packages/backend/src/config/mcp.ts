import { SettingsService } from '../services/settings.service.js';

/**
 * Per-user opt-in for the MCP (Model Context Protocol) endpoint.
 *
 * MCP exposes a user's financial data to external AI clients, so it is OFF by
 * default and only turns on after the user explicitly confirms (see
 * mcp.routes.ts). The state is stored in `app_settings` as
 * `mcp_enabled_at:<userId>` = ISO timestamp of the confirmation.
 */
const key = (userId: number): string => `mcp_enabled_at:${userId}`;

export interface McpStatus {
  enabled: boolean;
  /** ISO timestamp of when the user confirmed, or null when disabled. */
  enabledAt: string | null;
}

export function getMcpStatus(userId: number): McpStatus {
  const enabledAt = SettingsService.get(key(userId));
  return { enabled: enabledAt !== null, enabledAt };
}

export function isMcpEnabled(userId: number): boolean {
  return SettingsService.get(key(userId)) !== null;
}

export function enableMcp(userId: number): McpStatus {
  const enabledAt = new Date().toISOString();
  SettingsService.set(key(userId), enabledAt);
  return { enabled: true, enabledAt };
}

export function disableMcp(userId: number): McpStatus {
  SettingsService.delete(key(userId));
  return { enabled: false, enabledAt: null };
}
