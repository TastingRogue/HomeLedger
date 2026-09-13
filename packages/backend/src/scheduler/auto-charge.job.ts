import { schedule, type ScheduledTask } from 'node-cron';
import { SubscriptionService } from '../services/subscription.service.js';
import { registerJob, recordJobRun } from './status.js';

const JOB_NAME = 'auto-charge';
let task: ScheduledTask | null = null;

/**
 * Job de cargos automáticos.
 * Se ejecuta diariamente a las 00:05 CST (America/Mexico_City).
 * Procesa todas las suscripciones activas con autoCharge=true cuya fecha de pago es hoy.
 *
 * Requirements: 4.4
 */
export function startAutoChargeJob(): ScheduledTask {
  registerJob(JOB_NAME);

  // Run immediately on startup to catch up any missed charges
  {
    const startTime = Date.now();
    try {
      const catchUpCount = SubscriptionService.processAutoCharges();
      const elapsed = Date.now() - startTime;
      if (catchUpCount > 0) {
        console.log(`[AutoCharge] Startup catch-up: ${catchUpCount} cargos pendientes procesados`);
      }
      recordJobRun(JOB_NAME, 'success', elapsed, `startup catch-up: ${catchUpCount} charges processed`);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error('[AutoCharge] Error en catch-up de inicio:', error);
      recordJobRun(JOB_NAME, 'error', elapsed, `startup catch-up failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Cron: minuto 5, hora 0, todos los días
  task = schedule('5 0 * * *', () => {
    const startTime = Date.now();
    console.log(`[AutoCharge] Iniciando procesamiento de cargos automáticos...`);

    try {
      const processedCount = SubscriptionService.processAutoCharges();
      const elapsed = Date.now() - startTime;
      console.log(`[AutoCharge] Completado: ${processedCount} cargos procesados en ${elapsed}ms`);
      recordJobRun(JOB_NAME, 'success', elapsed, `${processedCount} charges processed`);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[AutoCharge] Error después de ${elapsed}ms:`, error);
      recordJobRun(JOB_NAME, 'error', elapsed, error instanceof Error ? error.message : String(error));
    }
  }, {
    timezone: 'America/Mexico_City',
  });

  console.log('[AutoCharge] Job programado: diario a las 00:05 CST');
  return task;
}

export function stopAutoChargeJob(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[AutoCharge] Job detenido');
  }
}
