import { eq, and } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { subscriptions, transactions, accounts, categories } from '../db/schema.js';
import { SubscriptionCycle, TransactionType } from '@smart-finance/shared';
import type { CreateSubscriptionSchema, UpdateSubscriptionSchema } from '../validators/subscription.schema.js';

// ============================================
// Helpers
// ============================================

/**
 * Formats a Date object to YYYY-MM-DD string using local date parts.
 */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================
// Types
// ============================================

export interface SubscriptionCalendarEntry {
  id: number;
  name: string;
  amount: number;
  cycle: string;
  categoryId: number;
  accountId: number;
  nextPaymentDate: string;
  daysRemaining: number;
  autoCharge: boolean;
}

// ============================================
// Custom Error
// ============================================

export class SubscriptionError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SubscriptionError';
    this.code = code;
  }
}

// ============================================
// SubscriptionService
// ============================================

export class SubscriptionService {
  /**
   * Crea una nueva suscripción con los campos validados.
   * Calcula la primera fecha de próximo pago a partir de la fecha de inicio.
   * Requisitos: 4.1, 4.6
   */
  static create(userId: number, input: CreateSubscriptionSchema) {
    const db = getDb();

    // Validate account exists and belongs to user
    const account = db
      .select({ id: accounts.id, userId: accounts.userId })
      .from(accounts)
      .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)))
      .get();

    if (!account) {
      throw new SubscriptionError(
        'La cuenta especificada no existe o no pertenece al usuario',
        'ACCOUNT_NOT_FOUND'
      );
    }

    // Validate category exists
    const category = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .get();

    if (!category) {
      throw new SubscriptionError(
        'La categoría especificada no existe',
        'CATEGORY_NOT_FOUND'
      );
    }

    const now = new Date().toISOString();

    // The startDate IS the first charge date (nextPaymentDate)
    const nextPaymentDate = input.startDate;

    const result = db
      .insert(subscriptions)
      .values({
        userId,
        accountId: input.accountId,
        categoryId: input.categoryId,
        name: input.name,
        amount: input.amount,
        cycle: input.cycle,
        startDate: input.startDate,
        nextPaymentDate,
        autoCharge: input.autoCharge ?? false,
        status: 'Activa',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    // If autoCharge is true and nextPaymentDate <= today, process immediately
    if (result.autoCharge && result.nextPaymentDate <= formatLocalDate(new Date())) {
      const todayStr = formatLocalDate(new Date());
      let currentDate = result.nextPaymentDate;

      while (currentDate <= todayStr) {
        db.insert(transactions)
          .values({
            userId,
            accountId: result.accountId,
            categoryId: result.categoryId,
            name: result.name,
            amount: result.amount,
            type: TransactionType.Gasto,
            date: currentDate,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        currentDate = SubscriptionService.calculateNextPayment(currentDate, result.cycle);
      }

      // Update nextPaymentDate to the next future date
      db.update(subscriptions)
        .set({ nextPaymentDate: currentDate, updatedAt: now })
        .where(eq(subscriptions.id, result.id))
        .run();

      result.nextPaymentDate = currentDate;
    }

    return result;
  }

  /**
   * Actualiza una suscripción existente con los campos proporcionados.
   * Si se cambia startDate o cycle, recalcula nextPaymentDate.
   * Requisitos: 4.1
   */
  static update(id: number, userId: number, input: UpdateSubscriptionSchema) {
    const db = getDb();

    // Verify subscription exists and belongs to user
    const existing = db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
      .get();

    if (!existing) {
      throw new SubscriptionError(
        'La suscripción no existe o no pertenece al usuario',
        'SUBSCRIPTION_NOT_FOUND'
      );
    }

    // Validate account if provided
    if (input.accountId !== undefined) {
      const account = db
        .select({ id: accounts.id, userId: accounts.userId })
        .from(accounts)
        .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)))
        .get();

      if (!account) {
        throw new SubscriptionError(
          'La cuenta especificada no existe o no pertenece al usuario',
          'ACCOUNT_NOT_FOUND'
        );
      }
    }

    // Validate category if provided
    if (input.categoryId !== undefined) {
      const category = db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, input.categoryId))
        .get();

      if (!category) {
        throw new SubscriptionError(
          'La categoría especificada no existe',
          'CATEGORY_NOT_FOUND'
        );
      }
    }

    const now = new Date().toISOString();

    // Determine if we need to recalculate nextPaymentDate
    const newStartDate = input.startDate ?? existing.startDate;
    const newCycle = input.cycle ?? existing.cycle;
    let nextPaymentDate = existing.nextPaymentDate;

    if (input.startDate !== undefined || input.cycle !== undefined) {
      nextPaymentDate = SubscriptionService.calculateNextPayment(newStartDate, newCycle);
    }

    const result = db
      .update(subscriptions)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.cycle !== undefined && { cycle: input.cycle }),
        ...(input.startDate !== undefined && { startDate: input.startDate }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.accountId !== undefined && { accountId: input.accountId }),
        ...(input.autoCharge !== undefined && { autoCharge: input.autoCharge }),
        nextPaymentDate,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, id))
      .returning()
      .get();

    return result;
  }

  /**
   * Calcula la fecha del próximo pago a partir de una fecha de referencia.
   * - Semanal: suma 7 días a la fecha de referencia.
   * - Mensual: suma 1 mes calendario; si el día no existe en el mes destino,
   *   se clampea al último día del mes.
   * Ejemplo: 31 enero + 1 mes = 28 febrero (o 29 en año bisiesto).
   * Requisitos: 4.2
   */
  static calculateNextPayment(fromDate: string, cycle: SubscriptionCycle | string): string {
    // Parse the date string as local date parts to avoid timezone issues
    const parts = fromDate.split('T')[0]!.split('-');
    const year = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10) - 1; // JS months are 0-indexed
    const day = parseInt(parts[2]!, 10);

    if (cycle === SubscriptionCycle.Semanal) {
      // Semanal: +7 days
      const date = new Date(year, month, day + 7);
      return formatLocalDate(date);
    } else {
      // Mensual: +1 month with day-of-month clamping
      const targetMonth = month + 1;
      const targetYear = year + Math.floor(targetMonth / 12);
      const actualMonth = targetMonth % 12;

      // Get the last day of the target month
      const lastDayOfMonth = new Date(targetYear, actualMonth + 1, 0).getDate();

      // Clamp the day to the last day of the month if needed
      const clampedDay = Math.min(day, lastDayOfMonth);
      const date = new Date(targetYear, actualMonth, clampedDay);
      return formatLocalDate(date);
    }
  }

  /**
   * Calcula los días restantes hasta el próximo pago.
   * Retorna 0 cuando la fecha de pago es hoy.
   * Valores negativos indican pagos vencidos.
   * Requisitos: 4.3
   */
  static calculateDaysRemaining(nextPaymentDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse the date string as local date to avoid timezone issues
    const parts = nextPaymentDate.split('T')[0]!.split('-');
    const paymentDate = new Date(
      parseInt(parts[0]!, 10),
      parseInt(parts[1]!, 10) - 1,
      parseInt(parts[2]!, 10)
    );
    paymentDate.setHours(0, 0, 0, 0);

    const diffMs = paymentDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Desactiva una suscripción. Cambia el estado a Inactiva y
   * detiene el cálculo de próximos pagos.
   * La suscripción se excluye del Calendario de Pagos.
   * Requisitos: 4.5
   */
  static deactivate(id: number, userId: number) {
    const db = getDb();

    // Verify subscription exists and belongs to user
    const existing = db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
      .get();

    if (!existing) {
      throw new SubscriptionError(
        'La suscripción no existe o no pertenece al usuario',
        'SUBSCRIPTION_NOT_FOUND'
      );
    }

    if (existing.status === 'Inactiva') {
      throw new SubscriptionError(
        'La suscripción ya está inactiva',
        'ALREADY_INACTIVE'
      );
    }

    const now = new Date().toISOString();

    const result = db
      .update(subscriptions)
      .set({
        status: 'Inactiva',
        updatedAt: now,
      })
      .where(eq(subscriptions.id, id))
      .returning()
      .get();

    return result;
  }

  /**
   * Procesa cargos automáticos para todas las suscripciones activas con autoCharge=true
   * cuya fecha de próximo pago es hoy.
   * Para cada una: crea una transacción de tipo Gasto (independientemente del balance de la cuenta)
   * y actualiza nextPaymentDate al siguiente ciclo.
   * Requisitos: 4.4, 4.7
   */
  static processAutoCharges(): number {
    const db = getDb();
    const sqlite = getSqlite();

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatLocalDate(today);

    // Find all active subscriptions with autoCharge=true and nextPaymentDate <= today (includes overdue)
    const dueSubscriptions = db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'Activa'),
          eq(subscriptions.autoCharge, true)
        )
      )
      .all()
      .filter(sub => sub.nextPaymentDate <= todayStr);

    if (dueSubscriptions.length === 0) {
      return 0;
    }

    const now = new Date().toISOString();
    let processedCount = 0;

    // Process each subscription — catch up on all missed payments
    sqlite.transaction(() => {
      for (const sub of dueSubscriptions) {
        let nextDate = sub.nextPaymentDate;

        // Loop: create a transaction for each missed cycle until nextPaymentDate is in the future
        while (nextDate <= todayStr) {
          // Create a Gasto transaction for this due date (Req 4.7 — regardless of balance)
          db.insert(transactions)
            .values({
              userId: sub.userId,
              accountId: sub.accountId,
              categoryId: sub.categoryId,
              name: sub.name,
              amount: sub.amount,
              type: TransactionType.Gasto,
              date: nextDate,
              createdAt: now,
              updatedAt: now,
            })
            .run();

          processedCount++;

          // Advance to next cycle
          nextDate = SubscriptionService.calculateNextPayment(nextDate, sub.cycle);
        }

        // Update subscription's nextPaymentDate to the next future date
        db.update(subscriptions)
          .set({
            nextPaymentDate: nextDate,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, sub.id))
          .run();
      }
    })();

    return processedCount;
  }

  /**
   * Retorna el calendario de pagos: todas las suscripciones activas con días restantes,
   * ordenadas por días restantes ascendente.
   * Requisitos: 4.3, 8.1, 8.2
   */
  static getCalendar(userId: number): SubscriptionCalendarEntry[] {
    const db = getDb();

    // Get all active subscriptions for user
    const activeSubs = db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'Activa')
        )
      )
      .all();

    // Calculate days remaining for each and build calendar entries
    const entries: SubscriptionCalendarEntry[] = activeSubs.map((sub) => ({
      id: sub.id,
      name: sub.name,
      amount: sub.amount,
      cycle: sub.cycle,
      categoryId: sub.categoryId,
      accountId: sub.accountId,
      nextPaymentDate: sub.nextPaymentDate,
      daysRemaining: SubscriptionService.calculateDaysRemaining(sub.nextPaymentDate),
      autoCharge: sub.autoCharge,
    }));

    // Sort by days remaining ascending (overdue first, then nearest)
    entries.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return entries;
  }

  /**
   * Obtiene una suscripción por ID.
   */
  static getById(id: number, userId: number) {
    const db = getDb();

    return db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
      .get() ?? null;
  }

  /**
   * Lista todas las suscripciones de un usuario.
   */
  static list(userId: number) {
    const db = getDb();

    return db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .all();
  }
}
