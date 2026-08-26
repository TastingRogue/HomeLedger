import { schedule, type ScheduledTask } from 'node-cron';
import { getDb } from '../db/connection.js';
import { users } from '../db/schema.js';
import { AlertService } from '../services/alert.service.js';

let task: ScheduledTask | null = null;

/**
 * Job de evaluación de alertas.
 * Se ejecuta cada hora en punto.
 * Evalúa alertas pendientes para todos los usuarios (pago próximo en ≤3 días, balance bajo, etc.).
 *
 * Requirements: 9.3
 */
export function startAlertEvaluationJob(): ScheduledTask {
  // Run immediately on startup to catch any pending alerts
  (async () => {
    try {
      const db = getDb();
      const allUsers = db.select({ id: users.id }).from(users).all();
      let totalAlerts = 0;
      for (const user of allUsers) {
        try {
          const result = await AlertService.evaluateAll(user.id);
          totalAlerts += result.balanceLow.length + result.creditHigh.length + result.paymentDue.length + result.paymentOverdue.length + result.goalCompleted.length;
        } catch {}
      }
      if (totalAlerts > 0) console.log(`[AlertEvaluation] Startup: ${totalAlerts} alertas generadas`);
    } catch {}
  })();

  // Cron: minuto 0, cada hora
  task = schedule('0 * * * *', async () => {
    const startTime = Date.now();
    console.log(`[AlertEvaluation] Iniciando evaluación de alertas...`);

    try {
      const db = getDb();

      // Obtener todos los usuarios
      const allUsers = db
        .select({ id: users.id })
        .from(users)
        .all();

      let totalAlerts = 0;

      for (const user of allUsers) {
        try {
          const result = await AlertService.evaluateAll(user.id);
          const userAlerts =
            result.balanceLow.length +
            result.creditHigh.length +
            result.paymentDue.length +
            result.paymentOverdue.length +
            result.goalCompleted.length;
          totalAlerts += userAlerts;
        } catch (error) {
          console.error(`[AlertEvaluation] Error evaluando usuario ${user.id}:`, error);
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[AlertEvaluation] Completado: ${totalAlerts} alertas generadas para ${allUsers.length} usuarios en ${elapsed}ms`);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[AlertEvaluation] Error después de ${elapsed}ms:`, error);
    }
  }, {
    timezone: 'America/Mexico_City',
  });

  console.log('[AlertEvaluation] Job programado: cada hora en punto');
  return task;
}

export function stopAlertEvaluationJob(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[AlertEvaluation] Job detenido');
  }
}
