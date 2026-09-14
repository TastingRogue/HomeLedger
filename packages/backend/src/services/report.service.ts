import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { transactions, categories, loans, accounts } from '../db/schema.js';
import { AccountService } from './account.service.js';
import { SubscriptionService } from './subscription.service.js';
import { GoalService } from './goal.service.js';
import { BudgetService } from './budget.service.js';
import { CategoryService } from './category.service.js';
import { roundMoney } from '../utils/money.js';

// ============================================
// Types
// ============================================

export interface AccountHealth {
  id: number;
  name: string;
  balance: number;
  balanceLimit: number | null;
  status: 'correcto' | 'bajo' | 'sin_limite';
}

export interface DashboardData {
  consolidatedBalance: number;
  monthlySummary: {
    totalIncome: number;
    totalExpenses: number;
  };
  categoryBreakdown: Array<{
    categoryId: number;
    categoryName: string;
    total: number;
    percentage: number;
  }>;
  accountHealth: AccountHealth[];
  nextSubscriptions: Array<{
    id: number;
    name: string;
    amount: number;
    daysRemaining: number;
    accountId: number;
  }>;
  activeGoals: Array<{
    id: number;
    name: string;
    savedAmount: number;
    targetAmount: number;
    progress: number;
  }>;
}

export interface CashFlowPeriodEntry {
  period: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CashFlowReport {
  entries: CashFlowPeriodEntry[];
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
}

export interface TrendEntry {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface TrendReport {
  entries: TrendEntry[];
}

export interface CategoryReport {
  items: Array<{
    categoryId: number;
    categoryName: string;
    total: number;
    percentage: number;
  }>;
  grandTotal: number;
}

export interface BudgetVsActualEntry {
  categoryId: number;
  categoryName: string;
  allocated: number;
  actual: number;
  difference: number;
  percentUsed: number;
}

export interface BudgetComparisonReport {
  entries: BudgetVsActualEntry[];
  totalAllocated: number;
  totalActual: number;
  totalDifference: number;
}

// ── P4.10 report types ──

export interface SavingsRateEntry {
  period: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}
export interface SavingsRateReport {
  entries: SavingsRateEntry[];
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  savingsRate: number;
}

export interface DebtItem {
  id: number;
  name: string;
  kind: 'credit' | 'loan';
  owed: number;
  apr: number | null;
}
export interface DebtReport {
  totalDebt: number;
  items: DebtItem[];
}

export interface CreditUtilizationEntry {
  id: number;
  name: string;
  limit: number;
  owed: number;
  utilization: number;
}
export interface CreditUtilizationReport {
  overallUtilization: number;
  totalOwed: number;
  totalLimit: number;
  cards: CreditUtilizationEntry[];
}

export interface MerchantEntry {
  merchant: string;
  total: number;
  count: number;
}
export interface MerchantReport {
  merchants: MerchantEntry[];
  totalSpend: number;
}

// ============================================
// ReportService
// ============================================

/**
 * Servicio de reportes y dashboard.
 * Consolida datos de múltiples servicios para generar vistas de resumen financiero.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
export class ReportService {
  /**
   * Genera los datos del panel principal (dashboard).
   * Incluye: balance consolidado, resumen mensual, desglose por categoría,
   * salud de cuentas, próximas suscripciones y metas activas.
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  static async getDashboard(userId: number): Promise<DashboardData> {
    // 1. Get all active accounts and calculate consolidated balance
    const activeAccounts = await AccountService.getActive(userId);
    let consolidatedBalance = 0;
    const accountHealthList: AccountHealth[] = [];

    for (const account of activeAccounts) {
      const balance = await AccountService.calculateBalance(account.id);
      // P4.11: convert each account's native balance to base before consolidating.
      consolidatedBalance = roundMoney(consolidatedBalance + balance * (account.exchangeRate ?? 1));

      // Determine health status based on balanceLimit (native — same currency as balance).
      let status: 'correcto' | 'bajo' | 'sin_limite' = 'sin_limite';
      if (account.balanceLimit !== null && account.balanceLimit !== undefined) {
        status = balance >= account.balanceLimit ? 'correcto' : 'bajo';
      }

      accountHealthList.push({
        id: account.id,
        name: account.name,
        balance,
        balanceLimit: account.balanceLimit ?? null,
        status,
      });
    }

    // 2. Monthly income/expense summary for the current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDate = firstDayOfMonth.toISOString().split('T')[0]!;
    const endDate = lastDayOfMonth.toISOString().split('T')[0]!;

    const db = getDb();

    // P4.11: convert to base by joining accounts and weighting by exchange_rate.
    const incomeResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount} * ${accounts.exchangeRate}), 0)` })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'Ingreso'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate + 'T23:59:59.999Z')
        )
      )
      .get();

    const expenseResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount} * ${accounts.exchangeRate}), 0)` })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'Gasto'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate + 'T23:59:59.999Z')
        )
      )
      .get();

    const totalIncome = roundMoney(incomeResult?.total ?? 0);
    const totalExpenses = roundMoney(expenseResult?.total ?? 0);

    // 3. Category breakdown for the current month
    const categoryBreakdown = await CategoryService.getAnalysis(userId, {
      startDate,
      endDate,
    });

    // 4. Next 5 subscriptions (from calendar)
    const calendar = SubscriptionService.getCalendar(userId);
    const nextSubscriptions = calendar.slice(0, 5).map((entry) => ({
      id: entry.id,
      name: entry.name,
      amount: entry.amount,
      daysRemaining: entry.daysRemaining,
      accountId: entry.accountId,
    }));

    // 5. Active goals with progress
    const goals = GoalService.listActive(userId);
    const activeGoals = goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      savedAmount: goal.savedAmount,
      targetAmount: goal.targetAmount,
      progress: goal.progress,
    }));

    return {
      consolidatedBalance,
      monthlySummary: {
        totalIncome,
        totalExpenses,
      },
      categoryBreakdown,
      accountHealth: accountHealthList,
      nextSubscriptions,
      activeGoals,
    };
  }

  /**
   * Genera un reporte de flujo de efectivo (income vs expenses) agrupado por mes.
   * Los períodos se determinan a partir del rango de fechas proporcionado.
   *
   * Requirements: 7.2
   */
  static getCashFlow(
    userId: number,
    dateRange: { startDate: string; endDate: string }
  ): CashFlowReport {
    const db = getDb();
    const { startDate, endDate } = dateRange;

    // Group transactions by month (YYYY-MM format)
    const results = db
      .select({
        period: sql<string>`strftime('%Y-%m', ${transactions.date})`,
        type: transactions.type,
        total: sql<number>`COALESCE(SUM(${transactions.amount} * ${accounts.exchangeRate}), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate + 'T23:59:59.999Z')
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`, transactions.type)
      .all();

    // Build a map of period -> { income, expenses }
    const periodMap = new Map<string, { income: number; expenses: number }>();

    for (const row of results) {
      const existing = periodMap.get(row.period) ?? { income: 0, expenses: 0 };
      if (row.type === 'Ingreso') {
        existing.income = row.total;
      } else {
        existing.expenses = row.total;
      }
      periodMap.set(row.period, existing);
    }

    // Convert to sorted array
    const entries: CashFlowPeriodEntry[] = Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        income: data.income,
        expenses: data.expenses,
        net: roundMoney(data.income - data.expenses),
      }));

    const totalIncome = roundMoney(entries.reduce((sum, e) => sum + e.income, 0));
    const totalExpenses = roundMoney(entries.reduce((sum, e) => sum + e.expenses, 0));

    return {
      entries,
      totalIncome,
      totalExpenses,
      netCashFlow: roundMoney(totalIncome - totalExpenses),
    };
  }

  /**
   * Genera un reporte de tendencias mostrando evolución mensual
   * de ingresos y gastos durante los últimos N meses.
   *
   * Requirements: 7.2
   */
  static getTrends(userId: number, months: number = 6): TrendReport {
    const db = getDb();

    // Calculate start date (N months ago from start of current month)
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const startDate = startMonth.toISOString().split('T')[0]!;
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]!;

    // Query grouped by month and type
    const results = db
      .select({
        month: sql<string>`strftime('%Y-%m', ${transactions.date})`,
        type: transactions.type,
        total: sql<number>`COALESCE(SUM(${transactions.amount} * ${accounts.exchangeRate}), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate + 'T23:59:59.999Z')
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`, transactions.type)
      .all();

    // Build month map including all months in range (even if no transactions)
    const monthMap = new Map<string, { income: number; expenses: number }>();

    // Pre-fill all months in range
    for (let i = 0; i < months; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { income: 0, expenses: 0 });
    }

    // Fill actual data
    for (const row of results) {
      const existing = monthMap.get(row.month) ?? { income: 0, expenses: 0 };
      if (row.type === 'Ingreso') {
        existing.income = row.total;
      } else {
        existing.expenses = row.total;
      }
      monthMap.set(row.month, existing);
    }

    // Convert to sorted array
    const entries: TrendEntry[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: roundMoney(data.income - data.expenses),
      }));

    return { entries };
  }

  /**
   * Genera un análisis por categoría delegando a CategoryService.getAnalysis().
   *
   * Requirements: 10.1, 10.2, 10.3, 10.6
   */
  static async getCategoryAnalysis(
    userId: number,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<CategoryReport> {
    const items = await CategoryService.getAnalysis(userId, dateRange);

    const grandTotal = roundMoney(items.reduce((sum, item) => sum + item.total, 0));

    return {
      items,
      grandTotal,
    };
  }

  /**
   * Genera un reporte comparando presupuesto asignado vs gasto real
   * para cada categoría del presupuesto activo.
   *
   * Requirements: 7.2
   */
  static getBudgetVsActual(userId: number): BudgetComparisonReport {
    // Get current budgets with progress (already calculates spent per category)
    const currentBudgets = BudgetService.getCurrent(userId);

    const entries: BudgetVsActualEntry[] = [];

    for (const budget of currentBudgets) {
      for (const cat of budget.categories) {
        // Look up category name
        const db = getDb();
        const categoryRow = db
          .select({ name: categories.name })
          .from(categories)
          .where(eq(categories.id, cat.categoryId))
          .get();

        const categoryName = categoryRow?.name ?? 'Desconocida';
        const allocated = roundMoney(cat.allocated + cat.rollover);
        const actual = cat.spent;
        const difference = roundMoney(allocated - actual);
        const percentUsed = allocated > 0 ? (actual / allocated) * 100 : 0;

        entries.push({
          categoryId: cat.categoryId,
          categoryName,
          allocated,
          actual,
          difference,
          percentUsed: Math.round(percentUsed * 100) / 100,
        });
      }
    }

    const totalAllocated = roundMoney(entries.reduce((sum, e) => sum + e.allocated, 0));
    const totalActual = roundMoney(entries.reduce((sum, e) => sum + e.actual, 0));

    return {
      entries,
      totalAllocated,
      totalActual,
      totalDifference: roundMoney(totalAllocated - totalActual),
    };
  }

  // ============================================
  // P4.10 — Reports depth
  // ============================================

  /**
   * Savings-rate report: per-month income/expenses/savings and the savings rate
   * (savings ÷ income). Reuses the cash-flow monthly grouping.
   */
  static getSavingsRate(userId: number, dateRange: { startDate: string; endDate: string }): SavingsRateReport {
    const cash = ReportService.getCashFlow(userId, dateRange);
    const entries: SavingsRateEntry[] = cash.entries.map((e) => {
      const savings = roundMoney(e.income - e.expenses);
      const savingsRate = e.income > 0 ? Math.round((savings / e.income) * 10000) / 100 : 0;
      return { period: e.period, income: e.income, expenses: e.expenses, savings, savingsRate };
    });
    const totalSavings = roundMoney(cash.totalIncome - cash.totalExpenses);
    const savingsRate = cash.totalIncome > 0 ? Math.round((totalSavings / cash.totalIncome) * 10000) / 100 : 0;
    return {
      entries,
      totalIncome: cash.totalIncome,
      totalExpenses: cash.totalExpenses,
      totalSavings,
      savingsRate,
    };
  }

  /**
   * Debt report: aggregates what the user owes across credit accounts (negative
   * balances) and active loans, with per-item owed + APR/interest.
   */
  static async getDebtReport(userId: number): Promise<DebtReport> {
    const db = getDb();
    const items: DebtItem[] = [];

    const activeAccounts = await AccountService.getActive(userId);
    for (const acc of activeAccounts) {
      if (acc.type !== 'Crédito') continue;
      const balance = await AccountService.calculateBalance(acc.id);
      // P4.11: convert the owed amount to base currency for the total.
      const owed = roundMoney(Math.max(0, -balance) * (acc.exchangeRate ?? 1));
      if (owed <= 0) continue;
      items.push({ id: acc.id, name: acc.name, kind: 'credit', owed, apr: acc.apr ?? null });
    }

    const activeLoans = db
      .select({ id: loans.id, name: loans.name, remainingAmount: loans.remainingAmount, interestRate: loans.interestRate })
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.status, 'active')))
      .all();
    for (const l of activeLoans) {
      const owed = roundMoney(l.remainingAmount);
      if (owed <= 0) continue;
      items.push({ id: l.id, name: l.name, kind: 'loan', owed, apr: l.interestRate ?? null });
    }

    const totalDebt = roundMoney(items.reduce((s, i) => s + i.owed, 0));
    items.sort((a, b) => b.owed - a.owed);
    return { totalDebt, items };
  }

  /**
   * Credit-utilization report: per credit-card owed vs limit + utilization %,
   * plus the overall utilization across all cards with a limit.
   */
  static async getCreditUtilization(userId: number): Promise<CreditUtilizationReport> {
    const activeAccounts = await AccountService.getActive(userId);
    const cards: CreditUtilizationEntry[] = [];
    let totalOwed = 0;
    let totalLimit = 0;

    for (const acc of activeAccounts) {
      if (acc.type !== 'Crédito' || acc.creditLimit == null || acc.creditLimit <= 0) continue;
      const balance = await AccountService.calculateBalance(acc.id);
      // Per-card owed/limit/utilization stay NATIVE (utilization is a unitless ratio).
      const owed = roundMoney(Math.max(0, -balance));
      const utilization = Math.round((owed / acc.creditLimit) * 10000) / 100;
      cards.push({ id: acc.id, name: acc.name, limit: roundMoney(acc.creditLimit), owed, utilization });
      // P4.11: the OVERALL utilization aggregates across cards, so convert both
      // legs to base before summing (mixed-currency cards would otherwise mix units).
      const rate = acc.exchangeRate ?? 1;
      totalOwed = roundMoney(totalOwed + owed * rate);
      totalLimit = roundMoney(totalLimit + acc.creditLimit * rate);
    }

    cards.sort((a, b) => b.utilization - a.utilization);
    const overallUtilization = totalLimit > 0 ? Math.round((totalOwed / totalLimit) * 10000) / 100 : 0;
    return { overallUtilization, totalOwed, totalLimit, cards };
  }

  /**
   * Merchant report: top merchants by expense total within a date range. Uses
   * the transaction merchant (P4.1), falling back to the transaction name.
   */
  static getMerchantReport(
    userId: number,
    dateRange: { startDate: string; endDate: string },
    limit: number = 20,
  ): MerchantReport {
    const db = getDb();
    const capped = Math.min(Math.max(limit, 1), 100);

    const rows = db
      .select({
        merchant: sql<string>`COALESCE(NULLIF(TRIM(${transactions.merchant}), ''), ${transactions.name})`,
        total: sql<number>`COALESCE(SUM(${transactions.amount} * ${accounts.exchangeRate}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'Gasto'),
          gte(transactions.date, dateRange.startDate),
          lte(transactions.date, dateRange.endDate + 'T23:59:59.999Z'),
        ),
      )
      .groupBy(sql`COALESCE(NULLIF(TRIM(${transactions.merchant}), ''), ${transactions.name})`)
      .all();

    const merchants: MerchantEntry[] = rows
      .map((r) => ({ merchant: r.merchant, total: roundMoney(r.total), count: Number(r.count) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, capped);

    const totalSpend = roundMoney(merchants.reduce((s, m) => s + m.total, 0));
    return { merchants, totalSpend };
  }
}
