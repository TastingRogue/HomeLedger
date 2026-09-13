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

/**
 * Non-destructive preview of what an import would do (from POST /backup/preview).
 * Mirrors the backend `ImportPreview`.
 */
export interface ImportPreview {
  version: string;
  exportedAt: string;
  /** Rows per entity in the backup file (what would be restored). */
  backupCounts: Record<string, number>;
  /** Rows per entity currently owned by the user (what would be replaced). */
  currentCounts: Record<string, number>;
  /** Non-fatal issues: rows the import would silently skip (orphaned FKs). */
  warnings: string[];
}

/** A whole-DB gzip snapshot on disk (admin disaster-recovery). */
export interface SnapshotInfo {
  name: string;
  /** Compressed size in bytes. */
  size: number;
  createdAt: string;
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

/**
 * Non-destructive dry-run of an import. Returns per-entity counts + warnings so
 * the user can review before the destructive replace. Performs no writes.
 */
export async function previewImport(backup: unknown): Promise<ImportPreview> {
  return apiPost<ImportPreview>('/backup/preview', { backup });
}

// ─── Whole-DB snapshots (admin only) ───

/** List the automated gzip snapshots on disk (newest first). */
export async function listSnapshots(): Promise<SnapshotInfo[]> {
  return apiGet<SnapshotInfo[]>('/backup/snapshots');
}

/** Manually trigger a snapshot now (also applies retention). */
export async function createSnapshot(): Promise<{ snapshot: SnapshotInfo; rotatedOut: number }> {
  return apiPost<{ snapshot: SnapshotInfo; rotatedOut: number }>('/backup/snapshots');
}

/**
 * Restore the ENTIRE database from a snapshot. DESTRUCTIVE — replaces all data
 * for all users. Requires explicit confirmation.
 */
export async function restoreSnapshot(name: string, confirmed: boolean): Promise<ImportResult> {
  return apiPost<ImportResult>(`/backup/snapshots/${encodeURIComponent(name)}/restore`, { confirmed });
}
