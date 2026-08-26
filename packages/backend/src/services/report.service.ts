import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { transactions, categories } from '../db/schema.js';
import { AccountService } from './account.service.js';
import { SubscriptionService } from './subscription.service.js';
import { GoalService } from './goal.service.js';
import { BudgetService } from './budget.service.js';
import { CategoryService } from './category.service.js';

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
      consolidatedBalance += balance;

      // Determine health status based on balanceLimit
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

    const incomeResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
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
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'Gasto'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate + 'T23:59:59.999Z')
        )
      )
      .get();

    const totalIncome = incomeResult?.total ?? 0;
    const totalExpenses = expenseResult?.total ?? 0;

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
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
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
        net: data.income - data.expenses,
      }));

    const totalIncome = entries.reduce((sum, e) => sum + e.income, 0);
    const totalExpenses = entries.reduce((sum, e) => sum + e.expenses, 0);

    return {
      entries,
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
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
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
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
        net: data.income - data.expenses,
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

    const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

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
        const allocated = cat.allocated + cat.rollover;
        const actual = cat.spent;
        const difference = allocated - actual;
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

    const totalAllocated = entries.reduce((sum, e) => sum + e.allocated, 0);
    const totalActual = entries.reduce((sum, e) => sum + e.actual, 0);

    return {
      entries,
      totalAllocated,
      totalActual,
      totalDifference: totalAllocated - totalActual,
    };
  }
}
