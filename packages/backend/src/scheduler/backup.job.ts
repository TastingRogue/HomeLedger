import { schedule, type ScheduledTask } from 'node-cron';
import { SnapshotService } from '../services/snapshot.service.js';
import { isBackupEnabled, getBackupCron, getBackupRetention } from '../config/backup.js';
import { registerJob, recordJobRun } from './status.js';

const JOB_NAME = 'backup';
let task: ScheduledTask | null = null;

/**
 * Automated database backup job.
 * On the configured schedule (BACKUP_CRON, default daily 03:00 CST) it writes a
 * gzip-compressed whole-DB snapshot under DATA_DIR/backups and rotates out the
 * oldest so only BACKUP_RETENTION snapshots are kept. Disabled via BACKUP_ENABLED=false.
 */
export function startBackupJob(): ScheduledTask | null {
  if (!isBackupEnabled()) {
    console.log('[Backup] Deshabilitado (BACKUP_ENABLED=false); job no programado');
    return null;
  }

  registerJob(JOB_NAME);
  const cron = getBackupCron();

  const run = async (): Promise<void> => {
    const startTime = Date.now();
    console.log('[Backup] Creando snapshot de la base de datos...');
    try {
      const snap = await SnapshotService.createSnapshot();
      const deleted = SnapshotService.applyRetention();
      const elapsed = Date.now() - startTime;
      const kb = Math.round(snap.size / 1024);
      console.log(`[Backup] Completado: ${snap.name} (${kb} KB), ${deleted} antiguos eliminados, en ${elapsed}ms`);
      recordJobRun(JOB_NAME, 'success', elapsed, `snapshot ${snap.name} (${kb} KB); rotated out ${deleted}; keep ${getBackupRetention()}`);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[Backup] Error después de ${elapsed}ms:`, error);
      recordJobRun(JOB_NAME, 'error', elapsed, error instanceof Error ? error.message : String(error));
    }
  };

  task = schedule(cron, () => { void run(); }, { timezone: 'America/Mexico_City' });
  console.log(`[Backup] Job programado: ${cron} (CST), reteniendo ${getBackupRetention()} snapshots`);
  return task;
}

export function stopBackupJob(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[Backup] Job detenido');
  }
}
