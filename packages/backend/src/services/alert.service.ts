import { createHash } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { alerts, accounts, subscriptions, goals } from '../db/schema.js';
import { AccountService } from './account.service.js';
import { SubscriptionService } from './subscription.service.js';

/**
 * Error personalizado para operaciones del Motor de Alertas.
 */
export class AlertError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AlertError';
    this.code = code;
  }
}

/**
 * Tipos de alerta soportados.
 */
export type AlertType =
  | 'balance_low'
  | 'credit_high'
  | 'payment_due'
  | 'payment_overdue'
  | 'goal_completed';

/**
 * Severidades de alerta.
 */
export type AlertSeverity = 'warning' | 'critical' | 'info';

/**
 * Servicio del Motor de Alertas.
 * Genera alertas financieras usando deduplicación basada en hash SHA-256.
 *
 * Cada tipo de alerta tiene una clave única que se hashea para evitar duplicados:
 * - balance_low: "balance_low_{accountId}"
 * - credit_high: "credit_high_{accountId}"
 * - payment_due: "payment_due_{subscriptionId}_{nextPaymentDate}"
 * - payment_overdue: "payment_overdue_{subscriptionId}_{nextPaymentDate}"
 * - goal_completed: "goal_completed_{goalId}"
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 5.4
 */
export class AlertService {
  /**
   * Genera un hash SHA-256 a partir de una clave de deduplicación.
   */
  static generateHash(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Verifica si ya existe una alerta con el hash dado.
   * Retorna true si el hash ya existe (alerta duplicada).
   */
  static hashExists(hash: string): boolean {
    const db = getDb();
    const existing = db
      .select({ id: alerts.id })
      .from(alerts)
      .where(eq(alerts.hash, hash))
      .get();
    return !!existing;
  }

  /**
   * Inserta una nueva alerta si no existe una con el mismo hash.
   * Retorna la alerta creada o null si fue deduplicada.
   */
  static createAlert(
    userId: number,
    type: AlertType,
    title: string,
    message: string,
    severity: AlertSeverity,
    hash: string,
    data?: Record<string, unknown>
  ) {
    if (AlertService.hashExists(hash)) {
      return null;
    }

    const db = getDb();
    const now = new Date().toISOString();

    const result = db
      .insert(alerts)
      .values({
        userId,
        type,
        title,
        message,
        severity,
        hash,
        data: data ?? null,
        isRead: false,
        createdAt: now,
      })
      .returning()
      .get();

    return result;
  }

  /**
   * Evalúa alerta de balance bajo para todas las cuentas activas de un usuario.
   *
   * Genera una alerta cuando el balance de una cuenta cae por debajo de su
   * Límite_de_Balance configurado. La alerta es única por cuenta (no se repite
   * hasta que el balance se recupere por encima del límite).
   *
   * Si la cuenta no tiene balanceLimit configurado, se omite la evaluación.
   *
   * Requirements: 9.1, 9.2, 9.6
   */
  static async evaluateBalanceLow(userId: number) {
    const db = getDb();
    const createdAlerts: unknown[] = [];

    // Obtener cuentas activas del usuario
    const activeAccounts = db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.status, 'Activo')
        )
      )
      .all();

    for (const account of activeAccounts) {
      // Omitir cuentas sin balanceLimit configurado (Req 9.6)
      if (account.balanceLimit === null || account.balanceLimit === undefined) {
        continue;
      }

      const balance = await AccountService.calculateBalance(account.id);
      const hashKey = `balance_low_${account.id}`;
      const hash = AlertService.generateHash(hashKey);

      if (balance < account.balanceLimit) {
        // Balance por debajo del límite → generar alerta
        const alert = AlertService.createAlert(
          userId,
          'balance_low',
          `Balance bajo en ${account.name}`,
          `El balance de ${account.name} (MX$${balance.toFixed(2)}) está por debajo del límite configurado (MX$${account.balanceLimit.toFixed(2)})`,
          'warning',
          hash,
          {
            accountId: account.id,
            accountName: account.name,
            currentBalance: balance,
            balanceLimit: account.balanceLimit,
          }
        );

        if (alert) {
          createdAlerts.push(alert);
        }
      } else {
        // Balance igual o superior al límite → eliminar alerta existente (recuperación)
        AlertService.removeAlertByHash(hash);
      }
    }

    return createdAlerts;
  }

  /**
   * Evalúa alerta de utilización de crédito alta para cuentas de tipo Crédito.
   *
   * Genera una alerta cuando la utilización cruza el 80% al alza.
   * Es no-repetitiva: solo se genera una vez hasta que la utilización baje
   * por debajo del 80% y vuelva a superarlo.
   *
   * Requirements: 5.4, 9.4
   */
  static async evaluateCreditHigh(userId: number) {
    const db = getDb();
    const createdAlerts: unknown[] = [];

    // Obtener cuentas de crédito activas del usuario
    const creditAccounts = db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.status, 'Activo'),
          eq(accounts.type, 'Crédito')
        )
      )
      .all();

    for (const account of creditAccounts) {
      // Cuentas de crédito requieren creditLimit
      if (!account.creditLimit || account.creditLimit <= 0) {
        continue;
      }

      const balance = await AccountService.calculateBalance(account.id);
      // Utilización = |balance| / creditLimit * 100
      const utilization = (Math.abs(balance) / account.creditLimit) * 100;

      const hashKey = `credit_high_${account.id}`;
      const hash = AlertService.generateHash(hashKey);

      if (utilization >= 80) {
        // Utilización ≥ 80% → generar alerta (no-repetitiva por hash)
        const alert = AlertService.createAlert(
          userId,
          'credit_high',
          `Utilización alta en ${account.name}`,
          `La utilización de crédito de ${account.name} es ${utilization.toFixed(2)}%, superando el umbral del 80%`,
          'critical',
          hash,
          {
            accountId: account.id,
            accountName: account.name,
            utilization: parseFloat(utilization.toFixed(2)),
            creditLimit: account.creditLimit,
          }
        );

        if (alert) {
          createdAlerts.push(alert);
        }
      } else {
        // Utilización por debajo de 80% → eliminar alerta existente (permite re-disparo)
        AlertService.removeAlertByHash(hash);
      }
    }

    return createdAlerts;
  }

  /**
   * Evalúa alertas de pago próximo para suscripciones activas.
   *
   * Genera una alerta cuando una suscripción tiene 3 días o menos restantes
   * para su próximo pago. Deduplicada por subscriptionId + nextPaymentDate.
   *
   * Requirements: 9.3
   */
  static evaluatePaymentDue(userId: number) {
    const db = getDb();
    const createdAlerts: unknown[] = [];

    // Obtener suscripciones activas del usuario
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

    for (const sub of activeSubs) {
      const daysRemaining = SubscriptionService.calculateDaysRemaining(sub.nextPaymentDate);

      // Solo generar alerta si faltan entre 1 y 3 días (no 0 ni negativo, eso es overdue)
      if (daysRemaining >= 1 && daysRemaining <= 3) {
        const hashKey = `payment_due_${sub.id}_${sub.nextPaymentDate}`;
        const hash = AlertService.generateHash(hashKey);

        const alert = AlertService.createAlert(
          userId,
          'payment_due',
          `Pago próximo: ${sub.name}`,
          `La suscripción ${sub.name} vence en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}. Monto: MX$${sub.amount.toFixed(2)}`,
          'warning',
          hash,
          {
            subscriptionId: sub.id,
            subscriptionName: sub.name,
            amount: sub.amount,
            accountId: sub.accountId,
            daysRemaining,
            nextPaymentDate: sub.nextPaymentDate,
          }
        );

        if (alert) {
          createdAlerts.push(alert);
        }
      }
    }

    return createdAlerts;
  }

  /**
   * Evalúa alertas de pago vencido para suscripciones activas.
   *
   * Genera una alerta cuando una suscripción tiene 0 días restantes
   * (la fecha de pago es hoy). Deduplicada por subscriptionId + nextPaymentDate.
   *
   * Requirements: 8.5 (vía Motor_de_Alertas)
   */
  static evaluatePaymentOverdue(userId: number) {
    const db = getDb();
    const createdAlerts: unknown[] = [];

    // Obtener suscripciones activas del usuario
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

    for (const sub of activeSubs) {
      const daysRemaining = SubscriptionService.calculateDaysRemaining(sub.nextPaymentDate);

      // Generar alerta cuando los días restantes son 0 (hoy vence)
      if (daysRemaining <= 0) {
        const hashKey = `payment_overdue_${sub.id}_${sub.nextPaymentDate}`;
        const hash = AlertService.generateHash(hashKey);

        const alert = AlertService.createAlert(
          userId,
          'payment_overdue',
          `Pago vencido: ${sub.name}`,
          `La suscripción ${sub.name} ha llegado a su fecha de pago. Monto: MX$${sub.amount.toFixed(2)}`,
          'critical',
          hash,
          {
            subscriptionId: sub.id,
            subscriptionName: sub.name,
            amount: sub.amount,
            accountId: sub.accountId,
            daysRemaining,
            nextPaymentDate: sub.nextPaymentDate,
          }
        );

        if (alert) {
          createdAlerts.push(alert);
        }
      }
    }

    return createdAlerts;
  }

  /**
   * Evalúa alertas de meta completada para metas activas.
   *
   * Genera una alerta cuando una meta alcanza el 100% de progreso.
   * Deduplicada por goalId (una sola vez por meta).
   *
   * Requirements: 9.5, 6.5
   */
  static evaluateGoalCompleted(userId: number) {
    const db = getDb();
    const createdAlerts: unknown[] = [];

    // Obtener metas completadas del usuario
    const completedGoals = db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.userId, userId),
          eq(goals.status, 'Completada')
        )
      )
      .all();

    for (const goal of completedGoals) {
      const hashKey = `goal_completed_${goal.id}`;
      const hash = AlertService.generateHash(hashKey);

      const alert = AlertService.createAlert(
        userId,
        'goal_completed',
        `¡Meta cumplida: ${goal.name}!`,
        `Has alcanzado tu meta "${goal.name}" con un monto objetivo de MX$${goal.targetAmount.toFixed(2)}`,
        'info',
        hash,
        {
          goalId: goal.id,
          goalName: goal.name,
          targetAmount: goal.targetAmount,
        }
      );

      if (alert) {
        createdAlerts.push(alert);
      }
    }

    return createdAlerts;
  }

  /**
   * Ejecuta todas las evaluaciones de alertas para un usuario.
   * Útil para el scheduler (cron) y evaluaciones manuales.
   */
  static async evaluateAll(userId: number) {
    const balanceLow = await AlertService.evaluateBalanceLow(userId);
    const creditHigh = await AlertService.evaluateCreditHigh(userId);
    const paymentDue = AlertService.evaluatePaymentDue(userId);
    const paymentOverdue = AlertService.evaluatePaymentOverdue(userId);
    const goalCompleted = AlertService.evaluateGoalCompleted(userId);

    return {
      balanceLow,
      creditHigh,
      paymentDue,
      paymentOverdue,
      goalCompleted,
    };
  }

  /**
   * Elimina una alerta por su hash.
   * Se usa para "resolver" alertas cuando la condición se revierte
   * (e.g., balance se recupera por encima del límite).
   */
  static removeAlertByHash(hash: string) {
    const db = getDb();
    db.delete(alerts)
      .where(eq(alerts.hash, hash))
      .run();
  }

  /**
   * Lista todas las alertas de un usuario, ordenadas por fecha descendente.
   */
  static list(userId: number) {
    const db = getDb();
    return db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .all()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Lista alertas no leídas de un usuario.
   */
  static listUnread(userId: number) {
    const db = getDb();
    return db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.userId, userId),
          eq(alerts.isRead, false)
        )
      )
      .all()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Marca una alerta como leída. Scoped by userId so a user cannot modify
   * another user's alerts. Returns true if a row was affected.
   */
  static markAsRead(id: number, userId: number): boolean {
    const db = getDb();
    const result = db.update(alerts)
      .set({ isRead: true })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .run();
    return result.changes > 0;
  }

  /**
   * Marca todas las alertas de un usuario como leídas.
   */
  static markAllAsRead(userId: number) {
    const db = getDb();
    db.update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.userId, userId))
      .run();
  }

  /**
   * Deletes an alert scoped by userId. Returns true if a row was deleted.
   */
  static delete(id: number, userId: number): boolean {
    const db = getDb();
    const result = db.delete(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .run();
    return result.changes > 0;
  }

  // ── Alert settings (per-user toggles) ──

  private static ensureSettingsTable(): void {
    getSqlite().exec(`
      CREATE TABLE IF NOT EXISTS alert_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        balance_low INTEGER NOT NULL DEFAULT 1,
        credit_high INTEGER NOT NULL DEFAULT 1,
        payment_due INTEGER NOT NULL DEFAULT 1,
        payment_overdue INTEGER NOT NULL DEFAULT 1,
        goal_completed INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      );
    `);
  }

  /**
   * Returns the alert settings for a user, defaulting all types to enabled
   * when the user has no saved settings yet.
   */
  static getSettings(userId: number): AlertSettings {
    this.ensureSettingsTable();
    const row = getSqlite()
      .prepare('SELECT balance_low, credit_high, payment_due, payment_overdue, goal_completed FROM alert_settings WHERE user_id = ?')
      .get(userId) as Record<string, number> | undefined;
    if (!row) {
      return { balanceLow: true, creditHigh: true, paymentDue: true, paymentOverdue: true, goalCompleted: true };
    }
    return {
      balanceLow: !!row.balance_low,
      creditHigh: !!row.credit_high,
      paymentDue: !!row.payment_due,
      paymentOverdue: !!row.payment_overdue,
      goalCompleted: !!row.goal_completed,
    };
  }

  /**
   * Upserts the alert settings for a user. Missing fields keep their current
   * (or default) value.
   */
  static updateSettings(userId: number, patch: Partial<AlertSettings>): AlertSettings {
    this.ensureSettingsTable();
    const current = this.getSettings(userId);
    const next: AlertSettings = { ...current, ...patch };
    getSqlite()
      .prepare(`
        INSERT INTO alert_settings (user_id, balance_low, credit_high, payment_due, payment_overdue, goal_completed, updated_at)
        VALUES (@userId, @balanceLow, @creditHigh, @paymentDue, @paymentOverdue, @goalCompleted, @updatedAt)
        ON CONFLICT(user_id) DO UPDATE SET
          balance_low = @balanceLow, credit_high = @creditHigh, payment_due = @paymentDue,
          payment_overdue = @paymentOverdue, goal_completed = @goalCompleted, updated_at = @updatedAt
      `)
      .run({
        userId,
        balanceLow: next.balanceLow ? 1 : 0,
        creditHigh: next.creditHigh ? 1 : 0,
        paymentDue: next.paymentDue ? 1 : 0,
        paymentOverdue: next.paymentOverdue ? 1 : 0,
        goalCompleted: next.goalCompleted ? 1 : 0,
        updatedAt: new Date().toISOString(),
      });
    return next;
  }
}

/**
 * Per-user alert type toggles.
 */
export interface AlertSettings {
  balanceLow: boolean;
  creditHigh: boolean;
  paymentDue: boolean;
  paymentOverdue: boolean;
  goalCompleted: boolean;
}
