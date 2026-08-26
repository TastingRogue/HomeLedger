import { schedule, type ScheduledTask } from 'node-cron';
import { SubscriptionService } from '../services/subscription.service.js';

let task: ScheduledTask | null = null;

/**
 * Job de cargos automáticos.
 * Se ejecuta diariamente a las 00:05 CST (America/Mexico_City).
 * Procesa todas las suscripciones activas con autoCharge=true cuya fecha de pago es hoy.
 *
 * Requirements: 4.4
 */
export function startAutoChargeJob(): ScheduledTask {
  // Run immediately on startup to catch up any missed charges
  try {
    const catchUpCount = SubscriptionService.processAutoCharges();
    if (catchUpCount > 0) {
      console.log(`[AutoCharge] Startup catch-up: ${catchUpCount} cargos pendientes procesados`);
    }
  } catch (error) {
    console.error('[AutoCharge] Error en catch-up de inicio:', error);
  }

  // Cron: minuto 5, hora 0, todos los días
  task = schedule('5 0 * * *', () => {
    const startTime = Date.now();
    console.log(`[AutoCharge] Iniciando procesamiento de cargos automáticos...`);

    try {
      const processedCount = SubscriptionService.processAutoCharges();
      const elapsed = Date.now() - startTime;
      console.log(`[AutoCharge] Completado: ${processedCount} cargos procesados en ${elapsed}ms`);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[AutoCharge] Error después de ${elapsed}ms:`, error);
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
