import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { rules, transactions, accounts, categories } from '../db/schema.js';
import type { CreateRuleInput, UpdateRuleSchema } from '../validators/rule.schema.js';

/**
 * Interfaces para el motor de reglas.
 */
export interface RuleCondition {
  field: 'name' | 'amount' | 'account' | 'description';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'regex';
  value: string | number | [number, number];
  caseSensitive?: boolean;
}

export interface RuleAction {
  type: 'setCategory' | 'setSubcategory' | 'setType' | 'addTag';
  value: number | string;
}

export interface RuleMatch {
  ruleId: number;
  ruleName: string;
  actions: RuleAction[];
}

export interface ApplyResult {
  processed: number;
  matched: number;
  applied: Array<{
    transactionId: number;
    transactionName: string;
    ruleId: number;
    ruleName: string;
    actions: RuleAction[];
  }>;
}

export interface TestResult {
  matches: Array<{
    transactionId: number;
    transactionName: string;
    matched: boolean;
    actions: RuleAction[] | null;
  }>;
  totalTested: number;
  totalMatched: number;
}

/**
 * Datos de transacción para evaluación de reglas.
 */
export interface TransactionForEvaluation {
  id: number;
  name: string;
  amount: number;
  notes?: string | null;
  accountName?: string;
}

/**
 * Tiempo máximo de ejecución para expresiones regulares (ms).
 */
const REGEX_TIMEOUT_MS = 100;

/**
 * Longitud máxima permitida para patrones regex.
 */
const MAX_REGEX_LENGTH = 200;

/**
 * Error personalizado para operaciones del motor de reglas.
 */
export class RulesEngineError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'RulesEngineError';
    this.code = code;
  }
}

/**
 * Servicio del motor de reglas de auto-categorización.
 * Evalúa reglas contra transacciones para asignar automáticamente categorías y otros atributos.
 *
 * Requirements: design Rules Engine section
 */
export class RulesEngineService {
  /**
   * Crea una nueva regla de auto-categorización.
   */
  static create(userId: number, input: CreateRuleInput) {
    const db = getDb();
    const now = new Date().toISOString();

    const result = db
      .insert(rules)
      .values({
        userId,
        name: input.name,
        priority: input.priority,
        conditions: input.conditions as unknown as string,
        actions: input.actions as unknown as string,
        enabled: input.enabled ?? true,
        matchCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return result;
  }

  /**
   * Actualiza una regla existente.
   *
   * @throws RulesEngineError si la regla no existe o no pertenece al usuario
   */
  static update(id: number, userId: number, input: UpdateRuleSchema) {
    const db = getDb();

    const existing = db
      .select()
      .from(rules)
      .where(and(eq(rules.id, id), eq(rules.userId, userId)))
      .get();

    if (!existing) {
      throw new RulesEngineError(
        'La regla no existe o no pertenece al usuario',
        'RULE_NOT_FOUND'
      );
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) updateData['name'] = input.name;
    if (input.priority !== undefined) updateData['priority'] = input.priority;
    if (input.conditions !== undefined) updateData['conditions'] = input.conditions;
    if (input.actions !== undefined) updateData['actions'] = input.actions;
    if (input.enabled !== undefined) updateData['enabled'] = input.enabled;

    const result = db
      .update(rules)
      .set(updateData)
      .where(eq(rules.id, id))
      .returning()
      .get();

    return result;
  }

  /**
   * Elimina una regla.
   *
   * @throws RulesEngineError si la regla no existe o no pertenece al usuario
   */
  static delete(id: number, userId: number): void {
    const db = getDb();

    const existing = db
      .select()
      .from(rules)
      .where(and(eq(rules.id, id), eq(rules.userId, userId)))
      .get();

    if (!existing) {
      throw new RulesEngineError(
        'La regla no existe o no pertenece al usuario',
        'RULE_NOT_FOUND'
      );
    }

    db.delete(rules).where(eq(rules.id, id)).run();
  }

  /**
   * Lista todas las reglas de un usuario ordenadas por prioridad ascendente.
   */
  static list(userId: number) {
    const db = getDb();

    return db
      .select()
      .from(rules)
      .where(eq(rules.userId, userId))
      .orderBy(rules.priority)
      .all();
  }

  /**
   * Evalúa una transacción contra todas las reglas habilitadas del usuario.
   * Las reglas se ordenan por prioridad ascendente (menor número = mayor prioridad).
   * La primera regla que coincida gana (first match wins).
   *
   * @returns RuleMatch con las acciones a aplicar, o null si ninguna regla coincide
   */
  static evaluate(userId: number, transaction: TransactionForEvaluation): RuleMatch | null {
    const db = getDb();

    // Obtener reglas habilitadas del usuario, ordenadas por prioridad asc
    const userRules = db
      .select()
      .from(rules)
      .where(and(eq(rules.userId, userId), eq(rules.enabled, true)))
      .orderBy(rules.priority)
      .all();

    for (const rule of userRules) {
      const conditions = rule.conditions as unknown as RuleCondition[];
      const actions = rule.actions as unknown as RuleAction[];

      // Todas las condiciones deben cumplirse (AND lógico)
      const allMatch = conditions.every((condition) =>
        RulesEngineService.evaluateCondition(transaction, condition)
      );

      if (allMatch) {
        // Incrementar contador de matches
        db.update(rules)
          .set({ matchCount: sql`${rules.matchCount} + 1` })
          .where(eq(rules.id, rule.id))
          .run();

        return {
          ruleId: rule.id,
          ruleName: rule.name,
          actions,
        };
      }
    }

    return null;
  }

  /**
   * Aplica reglas a todas las transacciones sin categorizar del usuario.
   * "Sin categorizar" se define como transacciones cuya categoría tiene el flag isSystem
   * y el nombre es "Corrección" o similar categoría genérica, o alternativamente
   * se buscan transacciones que no tengan una categoría específica asignada.
   *
   * Para esta implementación, busca transacciones que pertenezcan a categorías del sistema
   * con nombre "Corrección" (la categoría genérica/por defecto del sistema).
   */
  static applyToUncategorized(userId: number): ApplyResult {
    const db = getDb();

    // Encontrar la categoría "Corrección" (categoría por defecto/genérica del sistema)
    const defaultCategory = db
      .select()
      .from(categories)
      .where(and(eq(categories.isSystem, true), eq(categories.name, 'Corrección')))
      .get();

    if (!defaultCategory) {
      return { processed: 0, matched: 0, applied: [] };
    }

    // Obtener transacciones sin categorizar (asociadas a la categoría por defecto)
    const uncategorizedTransactions = db
      .select({
        id: transactions.id,
        name: transactions.name,
        amount: transactions.amount,
        notes: transactions.notes,
        accountId: transactions.accountId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.categoryId, defaultCategory.id)
        )
      )
      .all();

    const result: ApplyResult = {
      processed: uncategorizedTransactions.length,
      matched: 0,
      applied: [],
    };

    for (const txn of uncategorizedTransactions) {
      // Obtener nombre de la cuenta para evaluación del campo 'account'
      const account = db
        .select({ name: accounts.name })
        .from(accounts)
        .where(eq(accounts.id, txn.accountId))
        .get();

      const transactionForEval: TransactionForEvaluation = {
        id: txn.id,
        name: txn.name,
        amount: txn.amount,
        notes: txn.notes,
        accountName: account?.name,
      };

      const match = RulesEngineService.evaluate(userId, transactionForEval);

      if (match) {
        // Aplicar acciones a la transacción
        RulesEngineService.applyActions(txn.id, match.actions);

        result.matched++;
        result.applied.push({
          transactionId: txn.id,
          transactionName: txn.name,
          ruleId: match.ruleId,
          ruleName: match.ruleName,
          actions: match.actions,
        });
      }
    }

    return result;
  }

  /**
   * Prueba una regla (dry-run) contra un conjunto de transacciones.
   * No persiste cambios, solo reporta qué transacciones coincidirían.
   */
  static test(
    userId: number,
    ruleInput: CreateRuleInput,
    transactionIds?: number[]
  ): TestResult {
    const db = getDb();

    // Construir la consulta de transacciones
    let txnQuery;
    if (transactionIds && transactionIds.length > 0) {
      txnQuery = db
        .select({
          id: transactions.id,
          name: transactions.name,
          amount: transactions.amount,
          notes: transactions.notes,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            sql`${transactions.id} IN (${sql.join(
              transactionIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          )
        )
        .all();
    } else {
      // Si no se especifican IDs, probar contra las últimas 50 transacciones
      txnQuery = db
        .select({
          id: transactions.id,
          name: transactions.name,
          amount: transactions.amount,
          notes: transactions.notes,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(sql`${transactions.date} DESC`)
        .limit(50)
        .all();
    }

    const conditions = ruleInput.conditions as RuleCondition[];
    const actions = ruleInput.actions as RuleAction[];

    const matches: TestResult['matches'] = [];
    let totalMatched = 0;

    for (const txn of txnQuery) {
      // Obtener nombre de cuenta
      const account = db
        .select({ name: accounts.name })
        .from(accounts)
        .where(eq(accounts.id, txn.accountId))
        .get();

      const transactionForEval: TransactionForEvaluation = {
        id: txn.id,
        name: txn.name,
        amount: txn.amount,
        notes: txn.notes,
        accountName: account?.name,
      };

      const allMatch = conditions.every((condition) =>
        RulesEngineService.evaluateCondition(transactionForEval, condition)
      );

      if (allMatch) {
        totalMatched++;
        matches.push({
          transactionId: txn.id,
          transactionName: txn.name,
          matched: true,
          actions,
        });
      } else {
        matches.push({
          transactionId: txn.id,
          transactionName: txn.name,
          matched: false,
          actions: null,
        });
      }
    }

    return {
      matches,
      totalTested: txnQuery.length,
      totalMatched,
    };
  }

  /**
   * Evalúa una condición individual contra una transacción.
   */
  static evaluateCondition(
    transaction: TransactionForEvaluation,
    condition: RuleCondition
  ): boolean {
    const fieldValue = RulesEngineService.getFieldValue(transaction, condition.field);

    // Si el campo no tiene valor, la condición no se cumple
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    switch (condition.operator) {
      case 'contains':
        return RulesEngineService.evalContains(
          String(fieldValue),
          String(condition.value),
          condition.caseSensitive
        );

      case 'equals':
        return RulesEngineService.evalEquals(
          fieldValue,
          condition.value,
          condition.caseSensitive
        );

      case 'startsWith':
        return RulesEngineService.evalStartsWith(
          String(fieldValue),
          String(condition.value),
          condition.caseSensitive
        );

      case 'endsWith':
        return RulesEngineService.evalEndsWith(
          String(fieldValue),
          String(condition.value),
          condition.caseSensitive
        );

      case 'greaterThan':
        return RulesEngineService.evalGreaterThan(fieldValue, condition.value);

      case 'lessThan':
        return RulesEngineService.evalLessThan(fieldValue, condition.value);

      case 'between':
        return RulesEngineService.evalBetween(fieldValue, condition.value);

      case 'regex':
        return RulesEngineService.evalRegex(
          String(fieldValue),
          String(condition.value),
          condition.caseSensitive
        );

      default:
        return false;
    }
  }

  /**
   * Obtiene el valor de un campo de la transacción para evaluación.
   */
  private static getFieldValue(
    transaction: TransactionForEvaluation,
    field: RuleCondition['field']
  ): string | number | undefined | null {
    switch (field) {
      case 'name':
        return transaction.name;
      case 'amount':
        return transaction.amount;
      case 'account':
        return transaction.accountName;
      case 'description':
        return transaction.notes;
      default:
        return undefined;
    }
  }

  /**
   * Evaluador: contiene (búsqueda de substring).
   */
  private static evalContains(
    fieldValue: string,
    searchValue: string,
    caseSensitive?: boolean
  ): boolean {
    if (caseSensitive) {
      return fieldValue.includes(searchValue);
    }
    return fieldValue.toLowerCase().includes(searchValue.toLowerCase());
  }

  /**
   * Evaluador: igualdad exacta.
   */
  private static evalEquals(
    fieldValue: string | number,
    conditionValue: string | number | [number, number],
    caseSensitive?: boolean
  ): boolean {
    if (typeof fieldValue === 'number' && typeof conditionValue === 'number') {
      return fieldValue === conditionValue;
    }
    if (caseSensitive) {
      return String(fieldValue) === String(conditionValue);
    }
    return String(fieldValue).toLowerCase() === String(conditionValue).toLowerCase();
  }

  /**
   * Evaluador: comienza con.
   */
  private static evalStartsWith(
    fieldValue: string,
    searchValue: string,
    caseSensitive?: boolean
  ): boolean {
    if (caseSensitive) {
      return fieldValue.startsWith(searchValue);
    }
    return fieldValue.toLowerCase().startsWith(searchValue.toLowerCase());
  }

  /**
   * Evaluador: termina con.
   */
  private static evalEndsWith(
    fieldValue: string,
    searchValue: string,
    caseSensitive?: boolean
  ): boolean {
    if (caseSensitive) {
      return fieldValue.endsWith(searchValue);
    }
    return fieldValue.toLowerCase().endsWith(searchValue.toLowerCase());
  }

  /**
   * Evaluador: mayor que (para campos numéricos).
   */
  private static evalGreaterThan(
    fieldValue: string | number,
    conditionValue: string | number | [number, number]
  ): boolean {
    const numField = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue));
    const numCondition = typeof conditionValue === 'number' ? conditionValue : parseFloat(String(conditionValue));

    if (isNaN(numField) || isNaN(numCondition)) {
      return false;
    }
    return numField > numCondition;
  }

  /**
   * Evaluador: menor que (para campos numéricos).
   */
  private static evalLessThan(
    fieldValue: string | number,
    conditionValue: string | number | [number, number]
  ): boolean {
    const numField = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue));
    const numCondition = typeof conditionValue === 'number' ? conditionValue : parseFloat(String(conditionValue));

    if (isNaN(numField) || isNaN(numCondition)) {
      return false;
    }
    return numField < numCondition;
  }

  /**
   * Evaluador: entre dos valores (inclusivo).
   */
  private static evalBetween(
    fieldValue: string | number,
    conditionValue: string | number | [number, number]
  ): boolean {
    if (!Array.isArray(conditionValue) || conditionValue.length !== 2) {
      return false;
    }

    const numField = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue));
    const [min, max] = conditionValue;

    if (isNaN(numField)) {
      return false;
    }
    return numField >= min && numField <= max;
  }

  /**
   * Evaluador: expresión regular con protección contra ReDoS.
   * - Limita la longitud del patrón regex.
   * - Usa un timeout simulado mediante limitación del input.
   */
  private static evalRegex(
    fieldValue: string,
    pattern: string,
    caseSensitive?: boolean
  ): boolean {
    // Protección contra patrones demasiado largos
    if (pattern.length > MAX_REGEX_LENGTH) {
      throw new RulesEngineError(
        `El patrón regex excede el máximo permitido de ${MAX_REGEX_LENGTH} caracteres`,
        'REGEX_TOO_LONG'
      );
    }

    // Protección contra patrones potencialmente peligrosos (ReDoS)
    // Rechazar patrones con repeticiones anidadas como (a+)+ o (a*)*
    const dangerousPatterns = /(\([^)]*[+*][^)]*\))[+*]|\(\?[^)]*\)\{/;
    if (dangerousPatterns.test(pattern)) {
      throw new RulesEngineError(
        'El patrón regex contiene repeticiones anidadas que podrían causar problemas de rendimiento',
        'REGEX_DANGEROUS_PATTERN'
      );
    }

    try {
      const flags = caseSensitive ? '' : 'i';
      const regex = new RegExp(pattern, flags);

      // Ejecutar con timeout usando límite de input
      // Para protección adicional, limitamos el campo a 10000 chars
      const limitedValue = fieldValue.substring(0, 10000);

      const startTime = Date.now();
      const result = regex.test(limitedValue);
      const elapsed = Date.now() - startTime;

      // Si la ejecución excede el timeout, lanzar error
      if (elapsed > REGEX_TIMEOUT_MS) {
        throw new RulesEngineError(
          'La evaluación del regex excedió el tiempo máximo permitido',
          'REGEX_TIMEOUT'
        );
      }

      return result;
    } catch (error) {
      if (error instanceof RulesEngineError) {
        throw error;
      }
      // Error de sintaxis en el regex
      throw new RulesEngineError(
        `El patrón regex es inválido: ${(error as Error).message}`,
        'REGEX_INVALID'
      );
    }
  }

  /**
   * Aplica las acciones de una regla a una transacción específica.
   * Persiste los cambios en la base de datos.
   */
  private static applyActions(transactionId: number, actions: RuleAction[]): void {
    const db = getDb();

    for (const action of actions) {
      switch (action.type) {
        case 'setCategory':
          db.update(transactions)
            .set({ categoryId: Number(action.value), updatedAt: new Date().toISOString() })
            .where(eq(transactions.id, transactionId))
            .run();
          break;

        case 'setSubcategory':
          db.update(transactions)
            .set({ subcategoryId: Number(action.value), updatedAt: new Date().toISOString() })
            .where(eq(transactions.id, transactionId))
            .run();
          break;

        case 'setType':
          db.update(transactions)
            .set({ type: String(action.value) as 'Ingreso' | 'Gasto', updatedAt: new Date().toISOString() })
            .where(eq(transactions.id, transactionId))
            .run();
          break;

        case 'addTag':
          // Tags se almacenan en el campo notes, separados por coma
          const txn = db
            .select({ notes: transactions.notes })
            .from(transactions)
            .where(eq(transactions.id, transactionId))
            .get();

          const currentNotes = txn?.notes || '';
          const tag = String(action.value);
          const newNotes = currentNotes ? `${currentNotes}, ${tag}` : tag;

          db.update(transactions)
            .set({ notes: newNotes, updatedAt: new Date().toISOString() })
            .where(eq(transactions.id, transactionId))
            .run();
          break;
      }
    }
  }
}
