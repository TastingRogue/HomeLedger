import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { accounts, transactions, goals, alerts, subscriptions } from '../../db/schema.js';
import { AccountService } from '../../services/account.service.js';
import { NetWorthService } from '../../services/networth.service.js';
import { BudgetService } from '../../services/budget.service.js';
import { CategoryService } from '../../services/category.service.js';
import { getInstanceCurrency } from '../../config/currency.js';
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

    const monthlyExpenses = expenseResult?.total ?? 0;
    const monthlyIncome = incomeResult?.total ?? 0;
    const roundedBalance = Math.round(consolidatedBalance * 100) / 100;
    const roundedCreditUtil = Math.round(creditUtilization * 100) / 100;

    // Net worth (accounts + assets - liabilities).
    let netWorth = roundedBalance;
    try {
      const nw = await NetWorthService.getCurrent(user.userId);
      netWorth = nw.netWorth;
    } catch { /* fall back to consolidated balance */ }

    // Remaining budget for the current period (null when no active budget).
    let remainingBudget: number | null = null;
    try {
      const summary = BudgetService.getSummary(user.userId);
      if (summary.totalAllocated > 0) remainingBudget = summary.totalRemaining;
    } catch { /* no active budget */ }

    // Per-account balances (for the dynamic account sensors).
    const accountsData = await Promise.all(
      activeAccounts.map(async (a) => ({
        id: a.id,
        name: a.name,
        balance: await AccountService.calculateBalance(a.id),
      })),
    );

    // Top expense categories for the current month (for the dynamic category sensors).
    let topCategories: { id: number; name: string; total: number }[] = [];
    try {
      const analysis = await CategoryService.getAnalysis(user.userId, { startDate: monthStart, endDate: monthEnd });
      topCategories = analysis.slice(0, 5).map((c) => ({ id: c.categoryId, name: c.categoryName, total: c.total }));
    } catch { /* no analysis available */ }

    // Boolean flags for the HA binary sensors.
    const lowBalance = activeAccounts.some((a, i) => {
      const bal = accountsData[i]?.balance ?? 0;
      return a.balanceLimit != null && bal < a.balanceLimit;
    });
    const alertsFlags = {
      over_budget: remainingBudget != null && remainingBudget < 0,
      high_credit_utilization: roundedCreditUtil > 70,
      payment_due_soon: nextPaymentDays != null && nextPaymentDays >= 0 && nextPaymentDays <= 3,
      low_balance: lowBalance,
    };

    return reply.status(200).send({
      success: true,
      data: {
        currency: getInstanceCurrency(),
        monthly_expenses: monthlyExpenses,
        monthly_income: monthlyIncome,
        monthly_savings: Math.round((monthlyIncome - monthlyExpenses) * 100) / 100,
        consolidated_balance: roundedBalance,
        total_balance: roundedBalance,
        net_worth: netWorth,
        remaining_budget: remainingBudget,
        active_accounts_count: activeAccounts.length,
        credit_utilization: roundedCreditUtil,
        credit_card_utilization: roundedCreditUtil,
        next_payment_days: nextPaymentDays,
        active_goals_count: activeGoalsResult?.count ?? 0,
        alerts_count: alertsResult?.count ?? 0,
        accounts: accountsData,
        top_categories: topCategories,
        alerts: alertsFlags,
      },
    });
  });

  /**
   * POST /api/v1/ha/webhook
   * Acknowledges and logs an inbound event from Home Assistant.
   *
   * Intentionally minimal: it validates auth and records the event, but does NOT
   * perform any automation processing. HomeLedger is local-first and has no
   * concrete automation-trigger use case yet, so building speculative
   * event→action handling here would be unused surface. To DRIVE HomeLedger from
   * HA today, use the integration's `create_transaction` / `create_quick_expense`
   * services (which call the normal transaction endpoints). This endpoint is a
   * documented stub kept for forward compatibility.
   */
  app.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const body = request.body as Record<string, unknown> | null;

    const event = {
      event_type: (body?.event_type as string) ?? 'unknown',
      received_at: new Date().toISOString(),
      user_id: user.userId,
    };

    request.log.info({ event }, 'HA webhook event received (ack only; no processing)');

    return reply.status(200).send({
      success: true,
      data: {
        message: 'Evento recibido (registrado). Este endpoint es solo de acuse; no ejecuta automatizaciones.',
        event_type: event.event_type,
        received_at: event.received_at,
        processed: false,
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

    const currency = getInstanceCurrency();
    const sensors = [
      {
        entity_id: 'sensor.homeledger_monthly_expenses',
        state: expenseResult?.total ?? 0,
        unit_of_measurement: currency,
        device_class: 'monetary',
        attributes: {
          friendly_name: 'Gastos Mensuales',
          month: now.toLocaleString('es-MX', { month: 'long', year: 'numeric' }),
        },
      },
      {
        entity_id: 'sensor.homeledger_monthly_income',
        state: incomeResult?.total ?? 0,
        unit_of_measurement: currency,
        device_class: 'monetary',
        attributes: {
          friendly_name: 'Ingresos Mensuales',
          month: now.toLocaleString('es-MX', { month: 'long', year: 'numeric' }),
        },
      },
      {
        entity_id: 'sensor.homeledger_consolidated_balance',
        state: Math.round(consolidatedBalance * 100) / 100,
        unit_of_measurement: currency,
        device_class: 'monetary',
        attributes: {
          friendly_name: 'Balance Consolidado',
          accounts_count: activeAccounts.length,
        },
      },
      {
        entity_id: 'sensor.homeledger_active_accounts',
        state: activeAccounts.length,
        unit_of_measurement: null,
        device_class: null,
        attributes: {
          friendly_name: 'Cuentas Activas',
          account_names: activeAccounts.map((a) => a.name),
        },
      },
      {
        entity_id: 'sensor.homeledger_credit_utilization',
        state: Math.round(creditUtilization * 100) / 100,
        unit_of_measurement: '%',
        device_class: null,
        attributes: {
          friendly_name: 'Utilización de Crédito',
          credit_accounts_count: creditAccounts.length,
        },
      },
      {
        entity_id: 'sensor.homeledger_next_payment_days',
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
        entity_id: 'sensor.homeledger_active_goals',
        state: activeGoals.length,
        unit_of_measurement: null,
        device_class: null,
        attributes: {
          friendly_name: 'Metas Activas',
          goal_names: activeGoals.map((g) => g.name),
        },
      },
      {
        entity_id: 'sensor.homeledger_alerts',
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
