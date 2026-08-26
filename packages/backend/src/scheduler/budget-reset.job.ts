import { schedule, type ScheduledTask } from 'node-cron';
import { lt } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { budgets } from '../db/schema.js';
import { BudgetService } from '../services/budget.service.js';

let task: ScheduledTask | null = null;

/**
 * Job de reset/rollover de presupuestos.
 * Se ejecuta el día 1 de cada mes a las 00:10 CST.
 * Busca presupuestos cuyo período terminó (endDate < hoy) y procesa el rollover
 * de montos no utilizados al siguiente período.
 *
 * Requirements: 7.2
 */
export function startBudgetResetJob(): ScheduledTask {
  // Cron: minuto 10, hora 0, día 1, todos los meses
  task = schedule('10 0 1 * *', () => {
    const startTime = Date.now();
    console.log(`[BudgetReset] Iniciando transición de períodos de presupuesto...`);

    try {
      const db = getDb();
      const today = new Date().toISOString().split('T')[0]!;

      // Encontrar presupuestos cuyo período ya terminó (endDate < hoy)
      const expiredBudgets = db
        .select()
        .from(budgets)
        .where(lt(budgets.endDate, today))
        .all();

      let processedCount = 0;
      let errorCount = 0;

      for (const budget of expiredBudgets) {
        try {
          BudgetService.processRollover(budget.id);
          processedCount++;
        } catch (error) {
          // Es posible que no exista un presupuesto del siguiente período
          errorCount++;
          console.warn(`[BudgetReset] No se pudo procesar rollover para presupuesto ${budget.id}:`, error);
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[BudgetReset] Completado: ${processedCount} rollovers procesados, ${errorCount} omitidos, en ${elapsed}ms`);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[BudgetReset] Error después de ${elapsed}ms:`, error);
    }
  }, {
    timezone: 'America/Mexico_City',
  });

  console.log('[BudgetReset] Job programado: día 1 de cada mes a las 00:10 CST');
  return task;
}

export function stopBudgetResetJob(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[BudgetReset] Job detenido');
  }
}
