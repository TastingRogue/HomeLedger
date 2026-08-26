import { startAutoChargeJob, stopAutoChargeJob } from './auto-charge.job.js';
import { startAlertEvaluationJob, stopAlertEvaluationJob } from './alert-evaluation.job.js';
import { startBudgetResetJob, stopBudgetResetJob } from './budget-reset.job.js';

/**
 * Inicia todos los jobs programados del scheduler.
 * Debe llamarse durante el arranque del servidor.
 */
export function startScheduler(): void {
  console.log('[Scheduler] Iniciando jobs programados...');

  startAutoChargeJob();
  startAlertEvaluationJob();
  startBudgetResetJob();

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

  console.log('[Scheduler] Todos los jobs detenidos');
}
