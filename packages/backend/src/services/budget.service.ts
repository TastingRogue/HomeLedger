import { eq, and, gte, lte, sql, sum } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { budgets, budgetCategories, budgetTags, transactions, transactionTags, tags, alerts, categories } from '../db/schema.js';
import type { CreateBudgetSchema, UpdateBudgetSchema } from '../validators/budget.schema.js';
import { BudgetPeriod, AlertType, AlertSeverity } from '@homeledger/shared';
import type { BudgetWithProgress, BudgetSummary, BudgetCategory as BudgetCategoryType, BudgetTag as BudgetTagType } from '@homeledger/shared';
import crypto from 'node:crypto';
import { roundMoney } from '../utils/money.js';

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
   * P4.3 Phase C: total spent on transactions carrying `tagId` within a period.
   * Joins transaction_tags → transactions (Gasto only, in the date range).
   */
  private static spentByTag(userId: number, tagId: number, startDate: string, endDate: string): number {
    const db = getDb();
    const row = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactionTags)
      .innerJoin(transactions, eq(transactionTags.transactionId, transactions.id))
      .where(
        and(
          eq(transactionTags.tagId, tagId),
          eq(transactions.userId, userId),
          eq(transactions.type, 'Gasto'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      )
      .get();
    return roundMoney(Number(row?.total ?? 0));
  }

  /**
   * Builds the per-tag progress array for a budget (allocated/spent/rollover/
   * remaining + resolved tag name). P4.3 Phase C.
   */
  private static tagProgress(userId: number, budgetId: number, startDate: string, endDate: string): BudgetTagType[] {
    const db = getDb();
    const rows = db
      .select({
        id: budgetTags.id,
        budgetId: budgetTags.budgetId,
        tagId: budgetTags.tagId,
        allocated: budgetTags.allocated,
        rollover: budgetTags.rollover,
        tagName: tags.name,
      })
      .from(budgetTags)
      .innerJoin(tags, eq(budgetTags.tagId, tags.id))
      .where(eq(budgetTags.budgetId, budgetId))
      .all();
    return rows.map((bt) => {
      const spent = BudgetService.spentByTag(userId, bt.tagId, startDate, endDate);
      return {
        id: bt.id,
        budgetId: bt.budgetId,
        tagId: bt.tagId,
        tagName: bt.tagName,
        allocated: bt.allocated,
        spent,
        rollover: bt.rollover,
        remaining: roundMoney((bt.allocated + bt.rollover) - spent),
      };
    });
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

    // Validate that all categories exist AND are usable by this user (system or own).
    // Tolerate a caller that didn't go through the Zod schema (tests) where
    // categories/tags may be undefined.
    const inputCategories = input.categories ?? [];
    for (const cat of inputCategories) {
      const existing = db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, cat.categoryId), eq(categories.userId, userId)))
        .get();

      if (!existing) {
        throw new BudgetError(
          `La categoría con ID ${cat.categoryId} no existe`,
          'CATEGORY_NOT_FOUND'
        );
      }
    }

    // P4.3 Phase C: validate tag allocations belong to the user.
    const inputTags = input.tags ?? [];
    for (const t of inputTags) {
      const existing = db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.id, t.tagId), eq(tags.userId, userId)))
        .get();
      if (!existing) {
        throw new BudgetError(`La etiqueta con ID ${t.tagId} no existe`, 'TAG_NOT_FOUND');
      }
    }

    const startDate = input.startDate.split('T')[0]!;
    const endDate = BudgetService.calculateEndDate(startDate, dbPeriod);
    const now = new Date().toISOString();

    const newBudgetId = sqlite.transaction(() => {
      // Insert the budget record
      const newBudget = db
        .insert(budgets)
        .values({
          userId,
          name: input.name,
          period: dbPeriod,
          startDate,
          endDate,
          // P4.3: persist the settings (were dropped before).
          rolloverEnabled: input.rolloverEnabled ?? false,
          alertThreshold: input.alertThreshold ?? 80,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: budgets.id })
        .get();

      // Insert budget category allocations
      for (const cat of inputCategories) {
        db.insert(budgetCategories).values({
          budgetId: newBudget.id,
          categoryId: cat.categoryId,
          allocated: cat.allocated,
          rollover: 0,
        }).run();
      }
      // P4.3 Phase C: insert budget tag allocations
      for (const t of inputTags) {
        db.insert(budgetTags).values({
          budgetId: newBudget.id,
          tagId: t.tagId,
          allocated: t.allocated,
          rollover: 0,
        }).run();
      }

      return newBudget.id;
    })();

    // Return the full budget with progress (categories + tags) computed uniformly.
    return BudgetService.getById(newBudgetId, userId)!;
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

        const spent = roundMoney(Number(spentResult?.total ?? 0));
        const remaining = roundMoney((bc.allocated + bc.rollover) - spent);

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

      // P4.3 Phase C: per-tag allocations for this budget.
      const tagsWithSpent = BudgetService.tagProgress(userId, budget.id, budget.startDate, budget.endDate);

      const totalAllocated = roundMoney(
        categoriesWithSpent.reduce((s, c) => s + c.allocated, 0) +
        tagsWithSpent.reduce((s, t) => s + t.allocated, 0)
      );
      const totalSpent = roundMoney(
        categoriesWithSpent.reduce((s, c) => s + c.spent, 0) +
        tagsWithSpent.reduce((s, t) => s + t.spent, 0)
      );
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
        rolloverEnabled: budget.rolloverEnabled, // P4.3: persisted
        alertThreshold: budget.alertThreshold,   // P4.3: persisted
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
        categories: categoriesWithSpent,
        tags: tagsWithSpent,
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
    let totalIncome = 0;

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

      // P4.3 Phase C: include tag allocations + their spent in the totals.
      const budgetTagRows = db
        .select()
        .from(budgetTags)
        .where(eq(budgetTags.budgetId, budget.id))
        .all();
      for (const bt of budgetTagRows) {
        totalAllocated += bt.allocated;
        totalSpent += BudgetService.spentByTag(userId, bt.tagId, budget.startDate, budget.endDate);
      }

      // P4.3 Phase B ("available to spend", light): income earned within the
      // budget's period, so the UI can show income − allocated = unassigned.
      const incomeResult = db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'Ingreso'),
            gte(transactions.date, budget.startDate),
            lte(transactions.date, budget.endDate)
          )
        )
        .get();
      totalIncome += Number(incomeResult?.total ?? 0);
    }

    totalAllocated = roundMoney(totalAllocated);
    totalSpent = roundMoney(totalSpent);
    totalIncome = roundMoney(totalIncome);
    const totalRemaining = roundMoney(totalAllocated - totalSpent);
    // Unassigned = income not yet given a job. Negative means over-allocated.
    const unassigned = roundMoney(totalIncome - totalAllocated);
    const percentUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    return {
      totalAllocated,
      totalSpent,
      totalRemaining,
      totalIncome,
      unassigned,
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

        const spent = roundMoney(Number(spentResult?.total ?? 0));
        const unused = roundMoney((bc.allocated + bc.rollover) - spent);

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

      // P4.3 Phase C: roll over unused TAG budget into the next period's matching tag.
      const budgetTagRows = db.select().from(budgetTags).where(eq(budgetTags.budgetId, budgetId)).all();
      for (const bt of budgetTagRows) {
        const spent = BudgetService.spentByTag(budget.userId, bt.tagId, budget.startDate, budget.endDate);
        const unused = roundMoney((bt.allocated + bt.rollover) - spent);
        if (unused > 0) {
          const nextTag = db
            .select()
            .from(budgetTags)
            .where(and(eq(budgetTags.budgetId, nextBudget.id), eq(budgetTags.tagId, bt.tagId)))
            .get();
          if (nextTag) {
            db.update(budgetTags)
              .set({ rollover: sql`${budgetTags.rollover} + ${unused}` })
              .where(eq(budgetTags.id, nextTag.id))
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
  static evaluateAlerts(userId: number): BudgetAlert[] {
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
        // P4.3: each budget carries its own warning threshold.
        const alertThreshold = budget.alertThreshold;
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

    // P4.3 Phase C: per-tag allocations.
    const tagsWithSpent = BudgetService.tagProgress(userId, budget.id, budget.startDate, budget.endDate);

    const totalAllocated = roundMoney(
      categoriesWithSpent.reduce((s, c) => s + c.allocated, 0) +
      tagsWithSpent.reduce((s, t) => s + t.allocated, 0)
    );
    const totalSpent = roundMoney(
      categoriesWithSpent.reduce((s, c) => s + c.spent, 0) +
      tagsWithSpent.reduce((s, t) => s + t.spent, 0)
    );
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
      rolloverEnabled: budget.rolloverEnabled, // P4.3: persisted
      alertThreshold: budget.alertThreshold,   // P4.3: persisted
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
      categories: categoriesWithSpent,
      tags: tagsWithSpent,
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

      // P4.3: persist the settings (were dropped before).
      if (input.rolloverEnabled !== undefined) {
        updateData['rolloverEnabled'] = input.rolloverEnabled;
      }
      if (input.alertThreshold !== undefined) {
        updateData['alertThreshold'] = input.alertThreshold;
      }

      db.update(budgets)
        .set(updateData)
        .where(eq(budgets.id, id))
        .run();

      // Update categories if provided
      if (input.categories) {
        // P4.3: preserve any accumulated rollover per category across the edit
        // (previously it was wiped to 0, discarding carried-over budget).
        const priorRollover = new Map<number, number>();
        for (const bc of db.select().from(budgetCategories).where(eq(budgetCategories.budgetId, id)).all()) {
          priorRollover.set(bc.categoryId, bc.rollover);
        }

        // Remove existing budget categories
        db.delete(budgetCategories)
          .where(eq(budgetCategories.budgetId, id))
          .run();

        // Insert new ones (validate each category is usable by this user first)
        for (const cat of input.categories) {
          const okCat = db
            .select({ id: categories.id })
            .from(categories)
            .where(and(eq(categories.id, cat.categoryId), eq(categories.userId, userId)))
            .get();
          if (!okCat) {
            throw new BudgetError(`La categoría con ID ${cat.categoryId} no existe`, 'CATEGORY_NOT_FOUND');
          }
          db.insert(budgetCategories)
            .values({
              budgetId: id,
              categoryId: cat.categoryId,
              allocated: cat.allocated,
              rollover: priorRollover.get(cat.categoryId) ?? 0,
            })
            .run();
        }
      }

      // P4.3 Phase C: update tag allocations if provided (same rollover-preserve).
      if (input.tags) {
        const priorTagRollover = new Map<number, number>();
        for (const bt of db.select().from(budgetTags).where(eq(budgetTags.budgetId, id)).all()) {
          priorTagRollover.set(bt.tagId, bt.rollover);
        }
        db.delete(budgetTags).where(eq(budgetTags.budgetId, id)).run();
        for (const t of input.tags) {
          const okTag = db
            .select({ id: tags.id })
            .from(tags)
            .where(and(eq(tags.id, t.tagId), eq(tags.userId, userId)))
            .get();
          if (!okTag) {
            throw new BudgetError(`La etiqueta con ID ${t.tagId} no existe`, 'TAG_NOT_FOUND');
          }
          db.insert(budgetTags).values({
            budgetId: id,
            tagId: t.tagId,
            allocated: t.allocated,
            rollover: priorTagRollover.get(t.tagId) ?? 0,
          }).run();
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
