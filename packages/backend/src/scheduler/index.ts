import { startAutoChargeJob, stopAutoChargeJob } from './auto-charge.job.js';
import { startAlertEvaluationJob, stopAlertEvaluationJob } from './alert-evaluation.job.js';
import { startBudgetResetJob, stopBudgetResetJob } from './budget-reset.job.js';
import { startBackupJob, stopBackupJob } from './backup.job.js';

/**
 * Inicia todos los jobs programados del scheduler.
 * Debe llamarse durante el arranque del servidor.
 */
export function startScheduler(): void {
  console.log('[Scheduler] Iniciando jobs programados...');

  startAutoChargeJob();
  startAlertEvaluationJob();
  startBudgetResetJob();
  startBackupJob();

  console.log('[Scheduler] Todos los jobs iniciados correctamente');
}

/**
 * Detiene todos los jobs programados del scheduler.
 * Debe llamarse durante el apagado graceful del servidor.
 */
export function stopScheduler(): void {
  console.log('[Scheduler] Deteniendo jobs programados...');

  stopAutoChargeJob();
  stopAlertEvaluationJob();
  stopBudgetResetJob();
  stopBackupJob();

  console.log('[Scheduler] Todos los jobs detenidos');
}
