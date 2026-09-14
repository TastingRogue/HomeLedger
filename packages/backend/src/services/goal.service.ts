import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { goals } from '../db/schema.js';
import type { CreateGoalSchema, UpdateGoalSchema, FundGoalSchema } from '../validators/goal.schema.js';
import { roundMoney } from '../utils/money.js';

/**
 * Error personalizado para operaciones de metas de ahorro.
 */
export class GoalError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'GoalError';
    this.code = code;
  }
}

/** Goal completion forecast (P4.8). All amounts are money-rounded. */
export interface GoalForecast {
  goalId: number;
  targetAmount: number;
  savedAmount: number;
  remaining: number;
  /** Monthly contribution used: the caller-provided value, else the estimate. */
  monthlyContribution: number;
  /** true when monthlyContribution was estimated from history (not provided). */
  estimated: boolean;
  /** Months left at this rate (null if already complete or rate is 0). */
  monthsToComplete: number | null;
  /** ISO date (YYYY-MM-DD) of the projected completion (null if never / done). */
  estimatedDate: string | null;
  /** The goal's deadline, if any. */
  deadline: string | null;
  /** vs the deadline: true on/before, false after, null when no deadline/rate. */
  onTrackForDeadline: boolean | null;
  /** true when savedAmount already meets the target. */
  alreadyComplete: boolean;
}

/**
 * Mapeo entre valores del enum GoalType (shared) y valores de la base de datos.
 */
const GOAL_TYPE_TO_DB: Record<string, 'ListaDeseos' | 'Deuda'> = {
  'Lista de Deseos': 'ListaDeseos',
  'Deuda': 'Deuda',
};

const GOAL_TYPE_FROM_DB: Record<string, string> = {
  'ListaDeseos': 'Lista de Deseos',
  'Deuda': 'Deuda',
};

/**
 * Servicio de gestión de metas de ahorro.
 * Implementa lógica de negocio para crear, financiar, retirar y consultar metas.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
export class GoalService {
  /**
   * Crea una nueva meta de ahorro para un usuario.
   * Inicializa savedAmount en 0 y status en 'Activa'.
   *
   * @throws GoalError si los campos no son válidos
   */
  static create(userId: number, input: CreateGoalSchema) {
    const db = getDb();

    const dbType = GOAL_TYPE_TO_DB[input.type];
    if (!dbType) {
      throw new GoalError(
        'Tipo de meta no válido. Debe ser "Lista de Deseos" o "Deuda"',
        'INVALID_GOAL_TYPE'
      );
    }

    const now = new Date().toISOString();

    const result = db
      .insert(goals)
      .values({
        userId,
        name: input.name,
        targetAmount: input.targetAmount,
        savedAmount: 0,
        type: dbType,
        deadline: input.deadline ?? null,
        status: 'Activa',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return {
      ...result,
      type: GOAL_TYPE_FROM_DB[result.type] ?? result.type,
      progress: GoalService.calculateProgress(result.savedAmount, result.targetAmount),
    };
  }

  /**
   * Actualiza una meta existente.
   *
   * @throws GoalError si la meta no existe
   */
  static update(id: number, userId: number, input: UpdateGoalSchema) {
    const db = getDb();

    const existing = db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .get();

    if (!existing) {
      throw new GoalError('Meta no encontrada', 'GOAL_NOT_FOUND');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }

    if (input.targetAmount !== undefined) {
      updateData['targetAmount'] = input.targetAmount;
    }

    if (input.type !== undefined) {
      const dbType = GOAL_TYPE_TO_DB[input.type];
      if (!dbType) {
        throw new GoalError(
          'Tipo de meta no válido. Debe ser "Lista de Deseos" o "Deuda"',
          'INVALID_GOAL_TYPE'
        );
      }
      updateData['type'] = dbType;
    }

    if (input.deadline !== undefined) {
      updateData['deadline'] = input.deadline ?? null;
    }

    const result = db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, id))
      .returning()
      .get();

    return {
      ...result,
      type: GOAL_TYPE_FROM_DB[result!.type] ?? result!.type,
      progress: GoalService.calculateProgress(result!.savedAmount, result!.targetAmount),
    };
  }

  /**
   * Asigna fondos a una meta de ahorro.
   * El monto efectivo asignado es min(amount, targetAmount - savedAmount).
   * Si la meta alcanza 100% de progreso, su estado cambia a 'Completada'.
   *
   * Requirements: 6.4, 6.5, 6.7
   *
   * @throws GoalError si la meta no existe o ya está completada
   */
  static fund(id: number, userId: number, input: FundGoalSchema) {
    const db = getDb();

    const existing = db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .get();

    if (!existing) {
      throw new GoalError('Meta no encontrada', 'GOAL_NOT_FOUND');
    }

    if (existing.status === 'Completada') {
      throw new GoalError('La meta ya está completada', 'GOAL_ALREADY_COMPLETED');
    }

    // Calcular monto efectivo: min(requestedAmount, targetAmount - savedAmount)
    const remaining = roundMoney(existing.targetAmount - existing.savedAmount);
    const effectiveAmount = roundMoney(Math.min(input.amount, remaining));

    const newSavedAmount = roundMoney(existing.savedAmount + effectiveAmount);
    const progress = GoalService.calculateProgress(newSavedAmount, existing.targetAmount);

    // Si el progreso llega a 100%, marcar como Completada
    const newStatus = progress >= 100 ? 'Completada' : 'Activa';

    const now = new Date().toISOString();

    const result = db
      .update(goals)
      .set({
        savedAmount: newSavedAmount,
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(goals.id, id))
      .returning()
      .get();

    return {
      ...result,
      type: GOAL_TYPE_FROM_DB[result!.type] ?? result!.type,
      progress,
      fundedAmount: effectiveAmount,
    };
  }

  /**
   * Retira fondos de una meta de ahorro.
   * El monto efectivo retirado es min(amount, savedAmount), asegurando piso de 0.
   *
   * Requirements: 6.6
   *
   * @throws GoalError si la meta no existe
   */
  static withdraw(id: number, userId: number, input: FundGoalSchema) {
    const db = getDb();

    const existing = db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .get();

    if (!existing) {
      throw new GoalError('Meta no encontrada', 'GOAL_NOT_FOUND');
    }

    // Calcular monto efectivo: min(requestedAmount, savedAmount)
    const effectiveAmount = roundMoney(Math.min(input.amount, existing.savedAmount));

    const newSavedAmount = roundMoney(existing.savedAmount - effectiveAmount);
    const progress = GoalService.calculateProgress(newSavedAmount, existing.targetAmount);

    // Si se retiran fondos de una meta completada, vuelve a Activa
    const newStatus = progress >= 100 ? 'Completada' : 'Activa';

    const now = new Date().toISOString();

    const result = db
      .update(goals)
      .set({
        savedAmount: newSavedAmount,
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(goals.id, id))
      .returning()
      .get();

    return {
      ...result,
      type: GOAL_TYPE_FROM_DB[result!.type] ?? result!.type,
      progress,
      withdrawnAmount: effectiveAmount,
    };
  }

  /**
   * Calcula el progreso de una meta como porcentaje.
   * Fórmula: (savedAmount / targetAmount) * 100, limitado a 100%.
   *
   * Requirements: 6.2
   */
  static calculateProgress(savedAmount: number, targetAmount: number): number {
    if (targetAmount <= 0) {
      return 0;
    }
    const progress = (savedAmount / targetAmount) * 100;
    return Math.min(progress, 100);
  }

  /**
   * Retorna todas las metas de un usuario.
   */
  static list(userId: number) {
    const db = getDb();

    const result = db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .all();

    return result.map((goal) => ({
      ...goal,
      type: GOAL_TYPE_FROM_DB[goal.type] ?? goal.type,
      progress: GoalService.calculateProgress(goal.savedAmount, goal.targetAmount),
    }));
  }

  /**
   * Retorna las metas activas de un usuario.
   */
  static listActive(userId: number) {
    const db = getDb();

    const result = db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, 'Activa')))
      .all();

    return result.map((goal) => ({
      ...goal,
      type: GOAL_TYPE_FROM_DB[goal.type] ?? goal.type,
      progress: GoalService.calculateProgress(goal.savedAmount, goal.targetAmount),
    }));
  }

  /**
   * Obtiene una meta por su ID.
   * Retorna null si no existe.
   */
  static getById(id: number, userId: number) {
    const db = getDb();

    const result = db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .get();

    if (!result) return null;

    return {
      ...result,
      type: GOAL_TYPE_FROM_DB[result.type] ?? result.type,
      progress: GoalService.calculateProgress(result.savedAmount, result.targetAmount),
    };
  }

  /**
   * Goal completion forecast (P4.8): estimates when a goal will be reached.
   *
   * The monthly contribution is either the caller-provided value or, when
   * omitted, the observed average = savedAmount / (months since the goal was
   * created, floored at 1). From `remaining / monthly` we derive the number of
   * months left, the projected completion date, and — if the goal has a
   * deadline — whether it's on track.
   *
   * @throws GoalError GOAL_NOT_FOUND when the goal doesn't exist for the user.
   */
  static forecast(id: number, userId: number, monthlyContribution?: number): GoalForecast {
    const db = getDb();

    const goal = db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .get();

    if (!goal) {
      throw new GoalError('La meta no existe o no pertenece al usuario', 'GOAL_NOT_FOUND');
    }

    const targetAmount = roundMoney(goal.targetAmount);
    const savedAmount = roundMoney(goal.savedAmount);
    const remaining = roundMoney(Math.max(0, targetAmount - savedAmount));
    const alreadyComplete = remaining <= 0;

    // Resolve the monthly contribution: provided (positive) wins; else estimate.
    let monthly: number;
    let estimated: boolean;
    if (monthlyContribution != null && monthlyContribution > 0) {
      monthly = roundMoney(monthlyContribution);
      estimated = false;
    } else {
      const created = new Date(goal.createdAt);
      const monthsSinceCreated = Math.max(
        1,
        (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30.4375),
      );
      monthly = roundMoney(savedAmount / monthsSinceCreated);
      estimated = true;
    }

    let monthsToComplete: number | null = null;
    let estimatedDate: string | null = null;
    let onTrackForDeadline: boolean | null = null;

    if (alreadyComplete) {
      monthsToComplete = 0;
      estimatedDate = new Date().toISOString().slice(0, 10);
    } else if (monthly > 0) {
      monthsToComplete = Math.ceil(remaining / monthly);
      const d = new Date();
      d.setMonth(d.getMonth() + monthsToComplete);
      estimatedDate = d.toISOString().slice(0, 10);
    }

    if (goal.deadline && estimatedDate) {
      onTrackForDeadline = estimatedDate <= goal.deadline.slice(0, 10);
    }

    return {
      goalId: goal.id,
      targetAmount,
      savedAmount,
      remaining,
      monthlyContribution: monthly,
      estimated,
      monthsToComplete,
      estimatedDate,
      deadline: goal.deadline ?? null,
      onTrackForDeadline,
      alreadyComplete,
    };
  }
}
