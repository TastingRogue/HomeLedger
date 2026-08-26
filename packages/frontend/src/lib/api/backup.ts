/**
 * API client module for backup/restore operations.
 * Provides typed functions for exporting, importing, and viewing backup history.
 */

import { apiPost, apiGet } from './client';

// ─── Types ───

export interface BackupFile {
  version: string;
  exportedAt: string;
  data: Record<string, unknown>;
}

export interface BackupHistoryEntry {
  id: number;
  type: 'export' | 'import';
  createdAt: string;
}

export interface ImportResult {
  message: string;
}

// ─── API Functions ───

/**
 * Export all user data as a JSON backup.
 */
export async function exportBackup(): Promise<BackupFile> {
  return apiPost<BackupFile>('/backup/export');
}

/**
 * Import data from a JSON backup, replacing all current data.
 * Requires confirmed=true to proceed.
 */
export async function importBackup(backup: unknown, confirmed: boolean): Promise<ImportResult> {
  return apiPost<ImportResult>('/backup/import', { backup, confirmed });
}

/**
 * Get backup history.
 */
export async function getBackupHistory(): Promise<BackupHistoryEntry[]> {
  return apiGet<BackupHistoryEntry[]>('/backup/history');
}
