import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { accounts, transactions, goals, alerts, subscriptions } from '../../db/schema.js';
import { AccountService } from '../../services/account.service.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Home Assistant dedicated API routes.
 * Provides optimized endpoints for HA custom integration polling and webhook events.
 *
 * Prefix: /api/v1/ha (applied when registering this plugin)
 * All endpoints require authentication (JWT Bearer or API key).
 */
export async function haRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/ha/status
   * Returns a complete JSON summary for Home Assistant sensors.
   * This is the primary endpoint the HA DataUpdateCoordinator polls.
   *
   * Response includes:
   * - monthly_expenses: Total expenses for the current month
   * - monthly_income: Total income for the current month
   * - consolidated_balance: Sum of all active account balances
   * - active_accounts_count: Number of active accounts
   * - credit_utilization: Highest credit utilization across credit accounts (%)
   * - next_payment_days: Days until the nearest subscription payment
   * - active_goals_count: Number of active savings goals
   * - alerts_count: Number of unread alerts
   */
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const db = getDb();

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]!;

    // Monthly expenses
    const expenseResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.userId),
          eq(transactions.type, 'Gasto'),
          gte(transactions.date, monthStart),
          lte(transactions.date, monthEnd + 'T23:59:59')
        )
      )
      .get();

    // Monthly income
    const incomeResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.userId),
          eq(transactions.type, 'Ingreso'),
          gte(transactions.date, monthStart),
          lte(transactions.date, monthEnd + 'T23:59:59')
        )
      )
      .get();

    // Active accounts
    const activeAccounts = db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, user.userId),
          eq(accounts.status, 'Activo')
        )
      )
      .all();

    // Consolidated balance (sum of all active account balances)
    let consolidatedBalance = 0;
    for (const account of activeAccounts) {
      const balance = await AccountService.calculateBalance(account.id);
      consolidatedBalance += balance;
    }

    // Highest credit utilization across credit accounts
    let creditUtilization = 0;
    const creditAccounts = activeAccounts.filter((a) => a.type === 'Crédito' && a.creditLimit && a.creditLimit > 0);
    for (const account of creditAccounts) {
      try {
        const utilization = await AccountService.calculateCreditUtilization(account.id);
        if (utilization > creditUtilization) {
          creditUtilization = utilization;
        }
      } catch {
        // Skip accounts where utilization can't be calculated
      }
    }

    // Next payment days (nearest subscription payment)
    const activeSubs = db
      .select({ nextPaymentDate: subscriptions.nextPaymentDate })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.userId),
          eq(subscriptions.status, 'Activa')
        )
      )
      .all();

    let nextPaymentDays: number | null = null;
    for (const sub of activeSubs) {
      const days = calculateDaysRemaining(sub.nextPaymentDate);
      if (days >= 0 && (nextPaymentDays === null || days < nextPaymentDays)) {
        nextPaymentDays = days;
      }
    }

    // Active goals count
    const activeGoalsResult = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(goals)
      .where(
        and(
          eq(goals.userId, user.userId),
          eq(goals.status, 'Activa')
        )
      )
      .get();

    // Unread alerts count
    const alertsResult = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(alerts)
      .where(
        and(
          eq(alerts.userId, user.userId),
          eq(alerts.isRead, false)
        )
      )
      .get();

    return reply.status(200).send({
      success: true,
      data: {
        monthly_expenses: expenseResult?.total ?? 0,
        monthly_income: incomeResult?.total ?? 0,
        consolidated_balance: Math.round(consolidatedBalance * 100) / 100,
        active_accounts_count: activeAccounts.length,
        credit_utilization: Math.round(creditUtilization * 100) / 100,
        next_payment_days: nextPaymentDays,
        active_goals_count: activeGoalsResult?.count ?? 0,
        alerts_count: alertsResult?.count ?? 0,
      },
    });
  });

  /**
   * POST /api/v1/ha/webhook
   * Receives webhook events from Home Assistant for future automation triggers.
   *
   * Accepts arbitrary event payloads. Currently acknowledges receipt;
   * future versions will process automation triggers (e.g., record expense
   * when HA detects a purchase event).
   */
  app.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const body = request.body as Record<string, unknown> | null;

    const event = {
      event_type: (body?.event_type as string) ?? 'unknown',
      data: body?.data ?? {},
      received_at: new Date().toISOString(),
      user_id: user.userId,
    };

    // Log the webhook event for debugging
    request.log.info({ event }, 'HA webhook event received');

    return reply.status(200).send({
      success: true,
      data: {
        message: 'Webhook recibido correctamente',
        event_type: event.event_type,
        received_at: event.received_at,
      },
    });
  });

  /**
   * GET /api/v1/ha/sensors
   * Returns individual sensor-formatted data for Home Assistant entity creation.
   *
   * Each sensor follows the HA sensor pattern with:
   * - entity_id: unique identifier for the sensor
   * - state: the sensor's current value
   * - unit_of_measurement: currency or unit (if applicable)
   * - attributes: additional context for the sensor
   * - device_class: HA device class (monetary, etc.)
   */
  app.get('/sensors', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const db = getDb();

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]!;

    // Monthly expenses
    const expenseResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.userId),
          eq(transactions.type, 'Gasto'),
          gte(transactions.date, monthStart),
          lte(transactions.date, monthEnd + 'T23:59:59')
        )
      )
      .get();

    // Monthly income
    const incomeResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.userId),
          eq(transactions.type, 'Ingreso'),
          gte(transactions.date, monthStart),
          lte(transactions.date, monthEnd + 'T23:59:59')
        )
      )
      .get();

    // Active accounts and consolidated balance
    const activeAccounts = db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, user.userId),
          eq(accounts.status, 'Activo')
        )
      )
      .all();

    let consolidatedBalance = 0;
    for (const account of activeAccounts) {
      const balance = await AccountService.calculateBalance(account.id);
      consolidatedBalance += balance;
    }

    // Credit utilization
    let creditUtilization = 0;
    const creditAccounts = activeAccounts.filter((a) => a.type === 'Crédito' && a.creditLimit && a.creditLimit > 0);
    for (const account of creditAccounts) {
      try {
        const utilization = await AccountService.calculateCreditUtilization(account.id);
        if (utilization > creditUtilization) {
          creditUtilization = utilization;
        }
      } catch {
        // Skip
      }
    }

    // Next payment
    const activeSubs = db
      .select({ name: subscriptions.name, nextPaymentDate: subscriptions.nextPaymentDate, amount: subscriptions.amount })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.userId),
          eq(subscriptions.status, 'Activa')
        )
      )
      .all();

    let nextPaymentDays: number | null = null;
    let nextPaymentName: string | null = null;
    for (const sub of activeSubs) {
      const days = calculateDaysRemaining(sub.nextPaymentDate);
      if (days >= 0 && (nextPaymentDays === null || days < nextPaymentDays)) {
        nextPaymentDays = days;
        nextPaymentName = sub.name;
      }
    }

    // Active goals
    const activeGoals = db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.userId, user.userId),
          eq(goals.status, 'Activa')
        )
      )
      .all();

    // Unread alerts
    const unreadAlerts = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(alerts)
      .where(
        and(
          eq(alerts.userId, user.userId),
          eq(alerts.isRead, false)
        )
      )
      .get();

    const sensors = [
      {
        entity_id: 'sensor.smart_finance_monthly_expenses',
        state: expenseResult?.total ?? 0,
        unit_of_measurement: 'MXN',
        device_class: 'monetary',
        attributes: {
          friendly_name: 'Gastos Mensuales',
          month: now.toLocaleString('es-MX', { month: 'long', year: 'numeric' }),
        },
      },
      {
        entity_id: 'sensor.smart_finance_monthly_income',
        state: incomeResult?.total ?? 0,
        unit_of_measurement: 'MXN',
        device_class: 'monetary',
        attributes: {
          friendly_name: 'Ingresos Mensuales',
          month: now.toLocaleString('es-MX', { month: 'long', year: 'numeric' }),
        },
      },
      {
        entity_id: 'sensor.smart_finance_consolidated_balance',
        state: Math.round(consolidatedBalance * 100) / 100,
        unit_of_measurement: 'MXN',
        device_class: 'monetary',
        attributes: {
          friendly_name: 'Balance Consolidado',
          accounts_count: activeAccounts.length,
        },
      },
      {
        entity_id: 'sensor.smart_finance_active_accounts',
        state: activeAccounts.length,
        unit_of_measurement: null,
        device_class: null,
        attributes: {
          friendly_name: 'Cuentas Activas',
          account_names: activeAccounts.map((a) => a.name),
        },
      },
      {
        entity_id: 'sensor.smart_finance_credit_utilization',
        state: Math.round(creditUtilization * 100) / 100,
        unit_of_measurement: '%',
        device_class: null,
        attributes: {
          friendly_name: 'Utilización de Crédito',
          credit_accounts_count: creditAccounts.length,
        },
      },
      {
        entity_id: 'sensor.smart_finance_next_payment_days',
        state: nextPaymentDays,
        unit_of_measurement: 'días',
        device_class: null,
        attributes: {
          friendly_name: 'Próximo Pago',
          subscription_name: nextPaymentName,
          active_subscriptions: activeSubs.length,
        },
      },
      {
        entity_id: 'sensor.smart_finance_active_goals',
        state: activeGoals.length,
        unit_of_measurement: null,
        device_class: null,
        attributes: {
          friendly_name: 'Metas Activas',
          goal_names: activeGoals.map((g) => g.name),
        },
      },
      {
        entity_id: 'sensor.smart_finance_alerts',
        state: unreadAlerts?.count ?? 0,
        unit_of_measurement: null,
        device_class: null,
        attributes: {
          friendly_name: 'Alertas Pendientes',
        },
      },
    ];

    return reply.status(200).send({
      success: true,
      data: sensors,
    });
  });
}

/**
 * Calculates days remaining until a payment date.
 * Returns 0 if the date is today, negative if overdue.
 */
function calculateDaysRemaining(nextPaymentDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = nextPaymentDate.split('T')[0]!.split('-');
  const paymentDate = new Date(
    parseInt(parts[0]!, 10),
    parseInt(parts[1]!, 10) - 1,
    parseInt(parts[2]!, 10)
  );
  paymentDate.setHours(0, 0, 0, 0);

  const diffMs = paymentDate.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
