import { eq, and, gte, lte, sql, sum } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { budgets, budgetCategories, transactions, alerts, categories } from '../db/schema.js';
import type { CreateBudgetSchema, UpdateBudgetSchema } from '../validators/budget.schema.js';
import { BudgetPeriod, AlertType, AlertSeverity } from '@smart-finance/shared';
import type { BudgetWithProgress, BudgetSummary, BudgetCategory as BudgetCategoryType } from '@smart-finance/shared';
import crypto from 'node:crypto';

// ============================================
// Types
// ============================================

interface BudgetAlert {
  budgetCategoryId: number;
  categoryId: number;
  categoryName: string;
  allocated: number;
  spent: number;
  percentUsed: number;
  alertType: 'threshold' | 'exceeded';
}

// ============================================
// Period Mapping
// ============================================

const PERIOD_TO_DB: Record<string, 'monthly' | 'weekly'> = {
  [BudgetPeriod.Mensual]: 'monthly',
  [BudgetPeriod.Semanal]: 'weekly',
};

const PERIOD_FROM_DB: Record<string, BudgetPeriod> = {
  'monthly': BudgetPeriod.Mensual,
  'weekly': BudgetPeriod.Semanal,
};

// ============================================
// Custom Error
// ============================================

export class BudgetError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'BudgetError';
    this.code = code;
  }
}

// ============================================
// BudgetService
// ============================================

export class BudgetService {
  /**
   * Calcula la fecha de fin de un período de presupuesto basado en la fecha de inicio y el tipo de período.
   * Mensual: +1 mes calendario (último día del mes siguiente si el día no existe).
   * Semanal: +7 días.
   */
  static calculateEndDate(startDate: string, period: 'monthly' | 'weekly'): string {
    const start = new Date(startDate);

    if (period === 'weekly') {
      const end = new Date(start);
      end.setDate(end.getDate() + 6); // 7-day period inclusive
      return end.toISOString().split('T')[0]!;
    }

    // Monthly: go to same day next month, clamping to last day if needed
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1); // Last day of the period (inclusive)
    return end.toISOString().split('T')[0]!;
  }

  /**
   * Crea un nuevo presupuesto con sus asignaciones de categorías.
   * Inserta el registro del presupuesto y luego las categorías asignadas de forma atómica.
   *
   * Requirements: 7.2
   */
  static create(userId: number, input: CreateBudgetSchema) {
    const db = getDb();
    const sqlite = getSqlite();

    const dbPeriod = PERIOD_TO_DB[input.period];
    if (!dbPeriod) {
      throw new BudgetError(
        'Período no válido. Debe ser "Mensual" o "Semanal"',
        'INVALID_PERIOD'
      );
    }

    // Validate that all categories exist
    for (const cat of input.categories) {
      const existing = db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, cat.categoryId))
        .get();

      if (!existing) {
        throw new BudgetError(
          `La categoría con ID ${cat.categoryId} no existe`,
          'CATEGORY_NOT_FOUND'
        );
      }
    }

    const startDate = input.startDate.split('T')[0]!;
    const endDate = BudgetService.calculateEndDate(startDate, dbPeriod);
    const now = new Date().toISOString();

    const result = sqlite.transaction(() => {
      // Insert the budget record
      const newBudget = db
        .insert(budgets)
        .values({
          userId,
          name: input.name,
          period: dbPeriod,
          startDate,
          endDate,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      // Insert budget category allocations
      const insertedCategories = input.categories.map((cat) => {
        return db
          .insert(budgetCategories)
          .values({
            budgetId: newBudget.id,
            categoryId: cat.categoryId,
            allocated: cat.allocated,
            rollover: 0,
          })
          .returning()
          .get();
      });

      return { budget: newBudget, categories: insertedCategories };
    })();

    const totalAllocated = input.categories.reduce((sum, c) => sum + c.allocated, 0);

    return {
      id: result.budget.id,
      userId: result.budget.userId,
      name: result.budget.name,
      period: PERIOD_FROM_DB[result.budget.period] ?? result.budget.period,
      startDate: result.budget.startDate,
      endDate: result.budget.endDate,
      totalAllocated,
      totalSpent: 0,
      rolloverEnabled: input.rolloverEnabled ?? false,
      alertThreshold: input.alertThreshold ?? 80,
      createdAt: result.budget.createdAt,
      updatedAt: result.budget.updatedAt,
      categories: result.categories.map((c) => ({
        id: c.id,
        budgetId: c.budgetId,
        categoryId: c.categoryId,
        allocated: c.allocated,
        spent: 0,
        rollover: c.rollover,
        remaining: c.allocated + c.rollover,
      })),
    };
  }

  /**
   * Obtiene el presupuesto actual del usuario con el progreso por categoría.
   * Calcula el gasto por categoría sumando las transacciones de tipo Gasto en el período del presupuesto.
   * remaining = (allocated + rollover) - spent
   *
   * Requirements: 7.2
   */
  static getCurrent(userId: number): BudgetWithProgress[] {
    const db = getDb();

    // Get today's date for filtering active budgets
    const today = new Date().toISOString().split('T')[0]!;

    // Get all budgets where today falls within the period
    const activeBudgets = db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          lte(budgets.startDate, today),
          gte(budgets.endDate, today)
        )
      )
      .all();

    return activeBudgets.map((budget) => {
      // Get budget categories for this budget
      const budgetCats = db
        .select()
        .from(budgetCategories)
        .where(eq(budgetCategories.budgetId, budget.id))
        .all();

      // For each budget category, calculate spent from transactions
      const categoriesWithSpent: BudgetCategoryType[] = budgetCats.map((bc) => {
        // Sum of Gasto transactions for this category within the budget period
        const spentResult = db
          .select({ total: sum(transactions.amount) })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              eq(transactions.categoryId, bc.categoryId),
              eq(transactions.type, 'Gasto'),
              gte(transactions.date, budget.startDate),
              lte(transactions.date, budget.endDate)
            )
          )
          .get();

        const spent = Number(spentResult?.total ?? 0);
        const remaining = (bc.allocated + bc.rollover) - spent;

        return {
          id: bc.id,
          budgetId: bc.budgetId,
          categoryId: bc.categoryId,
          allocated: bc.allocated,
          spent,
          rollover: bc.rollover,
          remaining,
        };
      });

      const totalAllocated = categoriesWithSpent.reduce((s, c) => s + c.allocated, 0);
      const totalSpent = categoriesWithSpent.reduce((s, c) => s + c.spent, 0);
      const percentUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

      return {
        id: budget.id,
        userId: budget.userId,
        name: budget.name,
        period: PERIOD_FROM_DB[budget.period] ?? budget.period as BudgetPeriod,
        startDate: budget.startDate,
        endDate: budget.endDate,
        totalAllocated,
        totalSpent,
        rolloverEnabled: false, // Stored at schema level; could be extended
        alertThreshold: 80,    // Default; could be persisted per budget
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
        categories: categoriesWithSpent,
        percentUsed: Math.round(percentUsed * 100) / 100,
      };
    });
  }

  /**
   * Obtiene el resumen general de un presupuesto específico o del período actual.
   * total allocated vs total spent.
   *
   * Requirements: 7.2
   */
  static getSummary(userId: number, budgetId?: number): BudgetSummary {
    const db = getDb();

    let targetBudgets: typeof budgets.$inferSelect[];

    if (budgetId) {
      const budget = db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)))
        .get();

      if (!budget) {
        throw new BudgetError('Presupuesto no encontrado', 'BUDGET_NOT_FOUND');
      }
      targetBudgets = [budget];
    } else {
      // Get current period budgets
      const today = new Date().toISOString().split('T')[0]!;
      targetBudgets = db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.userId, userId),
            lte(budgets.startDate, today),
            gte(budgets.endDate, today)
          )
        )
        .all();
    }

    let totalAllocated = 0;
    let totalSpent = 0;

    for (const budget of targetBudgets) {
      const budgetCats = db
        .select()
        .from(budgetCategories)
        .where(eq(budgetCategories.budgetId, budget.id))
        .all();

      for (const bc of budgetCats) {
        totalAllocated += bc.allocated;

        const spentResult = db
          .select({ total: sum(transactions.amount) })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              eq(transactions.categoryId, bc.categoryId),
              eq(transactions.type, 'Gasto'),
              gte(transactions.date, budget.startDate),
              lte(transactions.date, budget.endDate)
            )
          )
          .get();

        totalSpent += Number(spentResult?.total ?? 0);
      }
    }

    const totalRemaining = totalAllocated - totalSpent;
    const percentUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    return {
      totalAllocated,
      totalSpent,
      totalRemaining,
      percentUsed: Math.round(percentUsed * 100) / 100,
    };
  }

  /**
   * Procesa el rollover de un presupuesto: lleva los montos no utilizados al siguiente período.
   * Para cada categoría del presupuesto, si allocated - spent > 0 (hay sobrante),
   * ese sobrante se añade como rollover en la categoría correspondiente del presupuesto del siguiente período.
   *
   * Requirements: 7.2
   */
  static processRollover(budgetId: number): void {
    const db = getDb();
    const sqlite = getSqlite();

    const budget = db
      .select()
      .from(budgets)
      .where(eq(budgets.id, budgetId))
      .get();

    if (!budget) {
      throw new BudgetError('Presupuesto no encontrado', 'BUDGET_NOT_FOUND');
    }

    // Get the budget categories
    const budgetCats = db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.budgetId, budgetId))
      .all();

    // Find the next period budget for the same user
    const nextBudget = db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, budget.userId),
          eq(budgets.period, budget.period),
          gte(budgets.startDate, budget.endDate)
        )
      )
      .get();

    if (!nextBudget) {
      throw new BudgetError(
        'No se encontró un presupuesto del siguiente período para aplicar el rollover',
        'NEXT_BUDGET_NOT_FOUND'
      );
    }

    sqlite.transaction(() => {
      for (const bc of budgetCats) {
        // Calculate spent for this category in the current period
        const spentResult = db
          .select({ total: sum(transactions.amount) })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, budget.userId),
              eq(transactions.categoryId, bc.categoryId),
              eq(transactions.type, 'Gasto'),
              gte(transactions.date, budget.startDate),
              lte(transactions.date, budget.endDate)
            )
          )
          .get();

        const spent = Number(spentResult?.total ?? 0);
        const unused = (bc.allocated + bc.rollover) - spent;

        // Only carry over positive amounts (unused budget)
        if (unused > 0) {
          // Find the corresponding category in the next budget
          const nextBudgetCategory = db
            .select()
            .from(budgetCategories)
            .where(
              and(
                eq(budgetCategories.budgetId, nextBudget.id),
                eq(budgetCategories.categoryId, bc.categoryId)
              )
            )
            .get();

          if (nextBudgetCategory) {
            // Add unused amount to rollover of next period's budget category
            db.update(budgetCategories)
              .set({
                rollover: sql`${budgetCategories.rollover} + ${unused}`,
              })
              .where(eq(budgetCategories.id, nextBudgetCategory.id))
              .run();
          }
        }
      }
    })();
  }

  /**
   * Evalúa alertas de presupuesto para el usuario.
   * Genera alertas cuando:
   * - El gasto excede el umbral de alerta (alertThreshold %) → alerta de advertencia
   * - El gasto excede el 100% del presupuesto asignado → alerta crítica de exceso
   *
   * Usa deduplicación basada en hash para evitar alertas duplicadas.
   *
   * Requirements: 7.2
   */
  static evaluateAlerts(userId: number, alertThreshold: number = 80): BudgetAlert[] {
    const db = getDb();
    const sqlite = getSqlite();

    const today = new Date().toISOString().split('T')[0]!;

    // Get active budgets
    const activeBudgets = db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          lte(budgets.startDate, today),
          gte(budgets.endDate, today)
        )
      )
      .all();

    const generatedAlerts: BudgetAlert[] = [];

    sqlite.transaction(() => {
      for (const budget of activeBudgets) {
        const budgetCats = db
          .select()
          .from(budgetCategories)
          .where(eq(budgetCategories.budgetId, budget.id))
          .all();

        for (const bc of budgetCats) {
          // Get category name for alert message
          const category = db
            .select({ name: categories.name })
            .from(categories)
            .where(eq(categories.id, bc.categoryId))
            .get();

          const categoryName = category?.name ?? `Categoría ${bc.categoryId}`;

          // Calculate spent
          const spentResult = db
            .select({ total: sum(transactions.amount) })
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                eq(transactions.categoryId, bc.categoryId),
                eq(transactions.type, 'Gasto'),
                gte(transactions.date, budget.startDate),
                lte(transactions.date, budget.endDate)
              )
            )
            .get();

          const spent = Number(spentResult?.total ?? 0);
          const totalBudget = bc.allocated + bc.rollover;

          if (totalBudget <= 0) continue;

          const percentUsed = (spent / totalBudget) * 100;

          // Check if spent exceeds 100% (critical alert)
          if (percentUsed > 100) {
            const alertHash = crypto
              .createHash('md5')
              .update(`budget_exceeded_${budget.id}_${bc.categoryId}_${budget.startDate}`)
              .digest('hex');

            // Check deduplication
            const existingAlert = db
              .select({ id: alerts.id })
              .from(alerts)
              .where(eq(alerts.hash, alertHash))
              .get();

            if (!existingAlert) {
              const now = new Date().toISOString();
              db.insert(alerts)
                .values({
                  userId,
                  type: AlertType.PresupuestoExcedido,
                  title: `Presupuesto excedido: ${categoryName}`,
                  message: `El gasto en ${categoryName} (MX$${spent.toFixed(2)}) ha excedido el presupuesto asignado (MX$${totalBudget.toFixed(2)}) en el período ${budget.startDate} - ${budget.endDate}`,
                  severity: AlertSeverity.Critical,
                  data: JSON.stringify({
                    budgetId: budget.id,
                    categoryId: bc.categoryId,
                    allocated: totalBudget,
                    spent,
                    percentUsed: Math.round(percentUsed * 100) / 100,
                  }),
                  isRead: false,
                  hash: alertHash,
                  createdAt: now,
                })
                .run();
            }

            generatedAlerts.push({
              budgetCategoryId: bc.id,
              categoryId: bc.categoryId,
              categoryName,
              allocated: totalBudget,
              spent,
              percentUsed: Math.round(percentUsed * 100) / 100,
              alertType: 'exceeded',
            });
          }
          // Check if spent exceeds threshold % (warning alert)
          else if (percentUsed > alertThreshold) {
            const alertHash = crypto
              .createHash('md5')
              .update(`budget_threshold_${budget.id}_${bc.categoryId}_${budget.startDate}`)
              .digest('hex');

            // Check deduplication
            const existingAlert = db
              .select({ id: alerts.id })
              .from(alerts)
              .where(eq(alerts.hash, alertHash))
              .get();

            if (!existingAlert) {
              const now = new Date().toISOString();
              db.insert(alerts)
                .values({
                  userId,
                  type: AlertType.PresupuestoExcedido,
                  title: `Presupuesto próximo a excederse: ${categoryName}`,
                  message: `El gasto en ${categoryName} ha alcanzado el ${Math.round(percentUsed)}% del presupuesto asignado en el período ${budget.startDate} - ${budget.endDate}`,
                  severity: AlertSeverity.Warning,
                  data: JSON.stringify({
                    budgetId: budget.id,
                    categoryId: bc.categoryId,
                    allocated: totalBudget,
                    spent,
                    percentUsed: Math.round(percentUsed * 100) / 100,
                  }),
                  isRead: false,
                  hash: alertHash,
                  createdAt: now,
                })
                .run();
            }

            generatedAlerts.push({
              budgetCategoryId: bc.id,
              categoryId: bc.categoryId,
              categoryName,
              allocated: totalBudget,
              spent,
              percentUsed: Math.round(percentUsed * 100) / 100,
              alertType: 'threshold',
            });
          }
        }
      }
    })();

    return generatedAlerts;
  }

  /**
   * Obtiene un presupuesto por ID con el progreso por categoría.
   */
  static getById(id: number, userId: number): BudgetWithProgress | null {
    const db = getDb();

    const budget = db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .get();

    if (!budget) return null;

    const budgetCats = db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.budgetId, budget.id))
      .all();

    const categoriesWithSpent: BudgetCategoryType[] = budgetCats.map((bc) => {
      const spentResult = db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.categoryId, bc.categoryId),
            eq(transactions.type, 'Gasto'),
            gte(transactions.date, budget.startDate),
            lte(transactions.date, budget.endDate)
          )
        )
        .get();

      const spent = Number(spentResult?.total ?? 0);
      const remaining = (bc.allocated + bc.rollover) - spent;

      return {
        id: bc.id,
        budgetId: bc.budgetId,
        categoryId: bc.categoryId,
        allocated: bc.allocated,
        spent,
        rollover: bc.rollover,
        remaining,
      };
    });

    const totalAllocated = categoriesWithSpent.reduce((s, c) => s + c.allocated, 0);
    const totalSpent = categoriesWithSpent.reduce((s, c) => s + c.spent, 0);
    const percentUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    return {
      id: budget.id,
      userId: budget.userId,
      name: budget.name,
      period: PERIOD_FROM_DB[budget.period] ?? budget.period as BudgetPeriod,
      startDate: budget.startDate,
      endDate: budget.endDate,
      totalAllocated,
      totalSpent,
      rolloverEnabled: false,
      alertThreshold: 80,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
      categories: categoriesWithSpent,
      percentUsed: Math.round(percentUsed * 100) / 100,
    };
  }

  /**
   * Elimina un presupuesto y sus asignaciones de categorías (cascade en schema).
   */
  static delete(id: number, userId: number): void {
    const db = getDb();

    const existing = db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .get();

    if (!existing) {
      throw new BudgetError('Presupuesto no encontrado', 'BUDGET_NOT_FOUND');
    }

    db.delete(budgets)
      .where(eq(budgets.id, id))
      .run();
  }

  /**
   * Actualiza un presupuesto existente.
   */
  static update(id: number, userId: number, input: UpdateBudgetSchema) {
    const db = getDb();
    const sqlite = getSqlite();

    const existing = db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .get();

    if (!existing) {
      throw new BudgetError('Presupuesto no encontrado', 'BUDGET_NOT_FOUND');
    }

    const now = new Date().toISOString();

    sqlite.transaction(() => {
      const updateData: Record<string, unknown> = { updatedAt: now };

      if (input.name !== undefined) {
        updateData['name'] = input.name;
      }

      if (input.period !== undefined) {
        const dbPeriod = PERIOD_TO_DB[input.period];
        if (!dbPeriod) {
          throw new BudgetError(
            'Período no válido. Debe ser "Mensual" o "Semanal"',
            'INVALID_PERIOD'
          );
        }
        updateData['period'] = dbPeriod;
      }

      if (input.startDate !== undefined) {
        const startDate = input.startDate.split('T')[0]!;
        const period = input.period
          ? PERIOD_TO_DB[input.period]!
          : existing.period;
        updateData['startDate'] = startDate;
        updateData['endDate'] = BudgetService.calculateEndDate(startDate, period);
      }

      db.update(budgets)
        .set(updateData)
        .where(eq(budgets.id, id))
        .run();

      // Update categories if provided
      if (input.categories) {
        // Remove existing budget categories
        db.delete(budgetCategories)
          .where(eq(budgetCategories.budgetId, id))
          .run();

        // Insert new ones
        for (const cat of input.categories) {
          db.insert(budgetCategories)
            .values({
              budgetId: id,
              categoryId: cat.categoryId,
              allocated: cat.allocated,
              rollover: 0,
            })
            .run();
        }
      }
    })();

    // Return the full budget with progress
    return BudgetService.getById(id, userId);
  }

  /**
   * Lista todos los presupuestos de un usuario.
   */
  static list(userId: number) {
    const db = getDb();

    const allBudgets = db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .all();

    return allBudgets.map((budget) => {
      const budgetCats = db
        .select()
        .from(budgetCategories)
        .where(eq(budgetCategories.budgetId, budget.id))
        .all();

      const totalAllocated = budgetCats.reduce((s, c) => s + c.allocated, 0);

      return {
        id: budget.id,
        userId: budget.userId,
        name: budget.name,
        period: PERIOD_FROM_DB[budget.period] ?? budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        totalAllocated,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
      };
    });
  }
}
