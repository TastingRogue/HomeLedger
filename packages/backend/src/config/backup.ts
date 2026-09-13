import path from 'node:path';

/**
 * Automated backup configuration.
 *
 * The scheduler periodically writes a gzip-compressed snapshot of the whole
 * SQLite database to `DATA_DIR/backups`, keeping only the newest
 * `BACKUP_RETENTION` snapshots (older ones are rotated out). Snapshots are
 * whole-DB (all users + system data), compressed with gzip for minimal disk use.
 */

/** Whether the scheduled backup job runs. Default: enabled. */
export function isBackupEnabled(): boolean {
  const raw = process.env['BACKUP_ENABLED']?.trim().toLowerCase();
  // Enabled unless explicitly turned off.
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

/** How many snapshots to keep. Default: 7. Clamped to at least 1. */
export function getBackupRetention(): number {
  const raw = process.env['BACKUP_RETENTION']?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return 7;
  return Math.floor(n);
}

/** Cron expression for the backup job. Default: daily at 03:00. */
export function getBackupCron(): string {
  const raw = process.env['BACKUP_CRON']?.trim();
  return raw && raw.length > 0 ? raw : '0 3 * * *';
}

/** Directory where snapshots live (under DATA_DIR so they persist with the volume). */
export function getBackupDir(): string {
  const dataDir = process.env['DATA_DIR'] || './data';
  return path.resolve(dataDir, 'backups');
}

/** Filename prefix + extension for snapshots. */
export const SNAPSHOT_PREFIX = 'homeledger-';
export const SNAPSHOT_EXT = '.db.gz';
