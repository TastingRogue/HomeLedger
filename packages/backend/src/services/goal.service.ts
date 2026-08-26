import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { goals } from '../db/schema.js';
import type { CreateGoalSchema, UpdateGoalSchema, FundGoalSchema } from '../validators/goal.schema.js';

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
    const remaining = existing.targetAmount - existing.savedAmount;
    const effectiveAmount = Math.min(input.amount, remaining);

    const newSavedAmount = existing.savedAmount + effectiveAmount;
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
    const effectiveAmount = Math.min(input.amount, existing.savedAmount);

    const newSavedAmount = existing.savedAmount - effectiveAmount;
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
}
