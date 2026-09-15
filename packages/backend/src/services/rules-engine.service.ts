import { eq, and, ne, sql } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { rules, transactions, accounts, categories } from '../db/schema.js';
import { UNCATEGORIZED_KEY } from '../db/seed.js';
import { TagService } from './tag.service.js';
import { normalizeMerchant } from '../importers/normalize.js';
import type { CreateRuleInput, UpdateRuleSchema } from '../validators/rule.schema.js';

/**
 * Interfaces para el motor de reglas.
 */
export interface RuleCondition {
  field: 'name' | 'amount' | 'account' | 'description' | 'merchant';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'regex';
  value: string | number | [number, number];
  caseSensitive?: boolean;
}

export type RuleActionType =
  | 'setCategory'
  | 'setSubcategory'
  | 'setType'
  | 'addTag'
  | 'flagReview'
  | 'markRecurring'
  | 'ignore';

export interface RuleAction {
  type: RuleActionType;
  // Optional: flagReview / markRecurring / ignore carry no value.
  value?: number | string;
}

/** Tag names used by the flag/recurring actions (P4.5). */
export const REVIEW_TAG = 'review';
export const RECURRING_TAG = 'recurring';

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
 * A rule-learning suggestion (P4.5): proposes creating a rule after the user
 * categorizes a transaction, so the same category applies to other/future
 * transactions from the same merchant.
 */
export interface RuleSuggestion {
  suggested: boolean;
  /** Which field the proposed rule would match on ('merchant' or 'name'). */
  field?: 'merchant' | 'name';
  /** The value to match (the normalized merchant, or the transaction name). */
  value?: string;
  /** Target category the rule would set. */
  categoryId?: number;
  categoryName?: string;
  /** How many OTHER of the user's transactions this rule would newly affect. */
  matchingCount?: number;
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
  merchant?: string | null;
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
   * Rule learning (P4.5): given a transaction the user just categorized, decide
   * whether to suggest creating a rule that applies that category to other
   * transactions from the same merchant.
   *
   * Suggest only when it's actually useful:
   *  - the transaction has a stable match key (normalized merchant, else name),
   *  - its category is a real (non-"uncategorized") category,
   *  - NO existing enabled rule already matches this transaction, and
   *  - there is at least one OTHER of the user's transactions with the same
   *    merchant/name that is NOT already in that category (something to fix).
   */
  static suggestRuleForTransaction(userId: number, transactionId: number): RuleSuggestion {
    const db = getDb();

    const txn = db
      .select({
        id: transactions.id,
        name: transactions.name,
        amount: transactions.amount,
        notes: transactions.notes,
        merchant: transactions.merchant,
        categoryId: transactions.categoryId,
        accountId: transactions.accountId,
      })
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .get();

    if (!txn) return { suggested: false };

    // Don't suggest for the "uncategorized" bucket — that's not a real choice.
    const uncategorized = db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.key, UNCATEGORIZED_KEY)))
      .get();
    if (uncategorized && txn.categoryId === uncategorized.id) return { suggested: false };

    // Derive the match key: prefer the normalized merchant, else the raw name.
    const merchantKey = normalizeMerchant(txn.merchant ?? txn.name);
    const field: 'merchant' | 'name' = txn.merchant ? 'merchant' : 'name';
    const value = merchantKey || txn.name;
    if (!value || value.trim().length < 2) return { suggested: false };

    // If an existing enabled rule already matches this transaction, no need.
    const account = db
      .select({ name: accounts.name })
      .from(accounts)
      .where(eq(accounts.id, txn.accountId))
      .get();
    const alreadyMatched = RulesEngineService.matchesAnyEnabledRule(userId, {
      id: txn.id,
      name: txn.name,
      amount: txn.amount,
      notes: txn.notes,
      accountName: account?.name,
      merchant: txn.merchant,
    });
    if (alreadyMatched) return { suggested: false };

    // Count OTHER transactions from the same merchant (by normalized merchant or
    // name substring, case-insensitive) that are NOT yet in this category.
    const others = db
      .select({ id: transactions.id, name: transactions.name, merchant: transactions.merchant })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), ne(transactions.id, txn.id), ne(transactions.categoryId, txn.categoryId)))
      .all();

    const needle = value.toLowerCase();
    const matchingCount = others.filter((o) => {
      const hay = normalizeMerchant(o.merchant ?? o.name).toLowerCase() || o.name.toLowerCase();
      return hay.includes(needle) || needle.includes(hay);
    }).length;

    if (matchingCount === 0) return { suggested: false };

    const category = db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.id, txn.categoryId), eq(categories.userId, userId)))
      .get();

    return {
      suggested: true,
      field,
      value,
      categoryId: txn.categoryId,
      categoryName: category?.name,
      matchingCount,
    };
  }

  /**
   * Public entry point to apply a matched rule's actions to a transaction.
   * Used by the importer so imported rows get the full action set (category,
   * tags, flag/recurring) and honor 'ignore'. Delegates to applyActions.
   */
  static applyMatchActions(transactionId: number, actions: RuleAction[]): void {
    RulesEngineService.applyActions(transactionId, actions);
  }

  /** True if any enabled rule matches the given transaction (no side effects). */
  private static matchesAnyEnabledRule(userId: number, txn: TransactionForEvaluation): boolean {
    const db = getDb();
    const userRules = db
      .select()
      .from(rules)
      .where(and(eq(rules.userId, userId), eq(rules.enabled, true)))
      .all();

    for (const rule of userRules) {
      const conditions = rule.conditions as unknown as RuleCondition[];
      if (conditions.every((c) => RulesEngineService.evaluateCondition(txn, c))) {
        return true;
      }
    }
    return false;
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

    // Find the user's own "uncategorized" category by stable KEY (per user,
    // language-independent).
    const defaultCategory = db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.key, UNCATEGORIZED_KEY)))
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
        merchant: transactions.merchant,
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
        merchant: txn.merchant,
      };

      const match = RulesEngineService.evaluate(userId, transactionForEval);

      if (match) {
        // Aplicar acciones a la transacción (applyActions short-circuits on 'ignore')
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
          merchant: transactions.merchant,
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
          merchant: transactions.merchant,
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
        merchant: txn.merchant,
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
      case 'merchant':
        return transaction.merchant;
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

    // P4.5: an 'ignore' action means "leave this transaction exactly as it is" —
    // it wins over any other action in the same rule (protect from changes).
    if (actions.some((a) => a.type === 'ignore')) {
      return;
    }

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

        case 'addTag': {
          // P4.1 Phase 2: tags are a real M2M entity now (was: concatenated into
          // `notes`). Resolve the transaction's owner, get-or-create the tag for
          // that user, and attach it (idempotent).
          const txn = db
            .select({ userId: transactions.userId })
            .from(transactions)
            .where(eq(transactions.id, transactionId))
            .get();
          const tagName = String(action.value ?? '').trim();
          if (txn && tagName) {
            const tag = TagService.getOrCreate(txn.userId, tagName);
            TagService.attach(transactionId, tag.id, txn.userId);
          }
          break;
        }

        // P4.5: flag/recurring are modeled as reusable tags (no schema change).
        case 'flagReview':
          RulesEngineService.attachSystemTag(transactionId, REVIEW_TAG);
          break;

        case 'markRecurring':
          RulesEngineService.attachSystemTag(transactionId, RECURRING_TAG);
          break;

        // 'ignore' is handled at the evaluate/apply level (short-circuit); it
        // performs no field mutation here on purpose.
        case 'ignore':
          break;
      }
    }
  }

  /** Attaches a fixed system tag (review/recurring) to a transaction (P4.5). */
  private static attachSystemTag(transactionId: number, tagName: string): void {
    const db = getDb();
    const txn = db
      .select({ userId: transactions.userId })
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .get();
    if (!txn) return;
    const tag = TagService.getOrCreate(txn.userId, tagName);
    TagService.attach(transactionId, tag.id, txn.userId);
  }
}
