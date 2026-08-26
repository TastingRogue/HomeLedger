import { eq, and, desc, gte, lte, count } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { transactions, transactionSplits, accounts, categories } from '../db/schema.js';
import type { CreateTransactionSchema, UpdateTransactionSchema, QuickTransactionInput } from '../validators/transaction.schema.js';
import type { TransactionFilters, PaginatedResult } from '@smart-finance/shared';
import { TransactionType } from '@smart-finance/shared';

// ============================================
// Types
// ============================================

export interface SplitInput {
  categoryId: number;
  amount: number;
  note?: string;
}

// ============================================
// Custom Error
// ============================================

export class TransactionError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'TransactionError';
    this.code = code;
  }
}

// ============================================
// TransactionService
// ============================================

export class TransactionService {
  /**
   * Crea una nueva transacción y actualiza el balance de la cuenta asociada.
   * Gasto resta del balance, Ingreso suma al balance.
   * Operación atómica usando transacción de base de datos.
   * Requisitos: 2.1, 2.2, 2.3, 2.4, 2.7
   */
  static create(userId: number, input: CreateTransactionSchema) {
    const db = getDb();
    const sqlite = getSqlite();

    // Validate account exists and belongs to user
    const account = db
      .select({ id: accounts.id, userId: accounts.userId })
      .from(accounts)
      .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)))
      .get();

    if (!account) {
      throw new TransactionError(
        'La cuenta especificada no existe o no pertenece al usuario',
        'ACCOUNT_NOT_FOUND'
      );
    }

    // Validate category exists
    const category = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .get();

    if (!category) {
      throw new TransactionError(
        'La categoría especificada no existe',
        'CATEGORY_NOT_FOUND'
      );
    }

    const now = new Date().toISOString();

    // Atomic operation: insert transaction + update account balance
    const result = sqlite.transaction(() => {
      // Insert the transaction
      const newTransaction = db
        .insert(transactions)
        .values({
          userId,
          accountId: input.accountId,
          categoryId: input.categoryId,
          name: input.name,
          amount: input.amount,
          type: input.type,
          date: input.date,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      return newTransaction;
    })();

    return result;
  }

  /**
   * Actualiza una transacción existente. Revierte el efecto anterior y aplica el nuevo.
   * Maneja cambio de cuenta: revierte en la cuenta original y aplica en la nueva.
   * Operación atómica.
   * Requisitos: 2.8, 2.9
   */
  static update(id: number, userId: number, input: UpdateTransactionSchema) {
    const db = getDb();
    const sqlite = getSqlite();

    // Get the existing transaction
    const existing = db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .get();

    if (!existing) {
      throw new TransactionError(
        'La transacción no existe o no pertenece al usuario',
        'TRANSACTION_NOT_FOUND'
      );
    }

    // Validate new account if changed
    if (input.accountId && input.accountId !== existing.accountId) {
      const newAccount = db
        .select({ id: accounts.id, userId: accounts.userId })
        .from(accounts)
        .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)))
        .get();

      if (!newAccount) {
        throw new TransactionError(
          'La nueva cuenta especificada no existe o no pertenece al usuario',
          'ACCOUNT_NOT_FOUND'
        );
      }
    }

    // Validate new category if changed
    if (input.categoryId) {
      const newCategory = db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, input.categoryId))
        .get();

      if (!newCategory) {
        throw new TransactionError(
          'La nueva categoría especificada no existe',
          'CATEGORY_NOT_FOUND'
        );
      }
    }

    const now = new Date().toISOString();

    const result = sqlite.transaction(() => {
      // Update the transaction record
      const updated = db
        .update(transactions)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.accountId !== undefined && { accountId: input.accountId }),
          ...(input.date !== undefined && { date: input.date }),
          ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
          ...(input.amount !== undefined && { amount: input.amount }),
          ...(input.type !== undefined && { type: input.type }),
          updatedAt: now,
        })
        .where(eq(transactions.id, id))
        .returning()
        .get();

      return updated;
    })();

    return result;
  }

  /**
   * Elimina una transacción y revierte su efecto en el balance de la cuenta.
   * Gasto: suma el monto de vuelta. Ingreso: resta el monto.
   * Operación atómica.
   * Requisitos: 2.5
   */
  static delete(id: number, userId: number): void {
    const db = getDb();
    const sqlite = getSqlite();

    // Get the existing transaction
    const existing = db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .get();

    if (!existing) {
      throw new TransactionError(
        'La transacción no existe o no pertenece al usuario',
        'TRANSACTION_NOT_FOUND'
      );
    }

    sqlite.transaction(() => {
      // Delete associated splits first (cascade should handle this, but explicit is safer)
      db.delete(transactionSplits)
        .where(eq(transactionSplits.transactionId, id))
        .run();

      // Delete the transaction
      db.delete(transactions)
        .where(eq(transactions.id, id))
        .run();
    })();
  }

  /**
   * Lista transacciones con filtros y paginación, ordenadas por fecha descendente.
   * Filtros: accountId, categoryId, type, startDate, endDate.
   * Requisitos: 2.6
   */
  static list(userId: number, filters: TransactionFilters): PaginatedResult<typeof transactions.$inferSelect> {
    const db = getDb();

    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [eq(transactions.userId, userId)];

    if (filters.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId));
    }
    if (filters.categoryId) {
      conditions.push(eq(transactions.categoryId, filters.categoryId));
    }
    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }
    if (filters.startDate) {
      conditions.push(gte(transactions.date, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(transactions.date, filters.endDate));
    }

    const whereClause = and(...conditions);

    // Get total count
    const totalResult = db
      .select({ value: count() })
      .from(transactions)
      .where(whereClause)
      .get();

    const total = totalResult?.value ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    // Get paginated results ordered by date desc
    const items = db
      .select()
      .from(transactions)
      .where(whereClause)
      .orderBy(desc(transactions.date))
      .limit(pageSize)
      .offset(offset)
      .all();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Registro rápido de transacción.
   * Auto-completa fecha/hora con zona horaria CST (America/Mexico_City).
   * Usa el nombre de la categoría como nombre de la transacción.
   * Requisitos: 11.2
   */
  static quickCreate(userId: number, input: QuickTransactionInput) {
    const db = getDb();
    const sqlite = getSqlite();

    // Validate account exists and belongs to user
    const account = db
      .select({ id: accounts.id, userId: accounts.userId })
      .from(accounts)
      .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)))
      .get();

    if (!account) {
      throw new TransactionError(
        'La cuenta especificada no existe o no pertenece al usuario',
        'ACCOUNT_NOT_FOUND'
      );
    }

    // Validate and get category name
    const category = db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .get();

    if (!category) {
      throw new TransactionError(
        'La categoría especificada no existe',
        'CATEGORY_NOT_FOUND'
      );
    }

    // Auto-fill date with current CST datetime (America/Mexico_City)
    const now = new Date();
    const cstDate = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now).replace(' ', 'T');

    const type = input.type ?? TransactionType.Gasto;
    const transactionName = category.name;
    const nowIso = now.toISOString();

    // Atomic operation: insert transaction + update balance
    const result = sqlite.transaction(() => {
      const newTransaction = db
        .insert(transactions)
        .values({
          userId,
          accountId: input.accountId,
          categoryId: input.categoryId,
          name: transactionName,
          amount: input.amount,
          type,
          date: cstDate,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .returning()
        .get();

      return newTransaction;
    })();

    return result;
  }

  /**
   * Divide una transacción en splits por categoría.
   * Valida que la suma de los splits sea exactamente igual al monto de la transacción padre.
   * Requisitos: 2.4 (asociación a categoría)
   */
  static split(id: number, userId: number, splits: SplitInput[]) {
    const db = getDb();
    const sqlite = getSqlite();

    // Get the parent transaction
    const parentTransaction = db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .get();

    if (!parentTransaction) {
      throw new TransactionError(
        'La transacción no existe o no pertenece al usuario',
        'TRANSACTION_NOT_FOUND'
      );
    }

    if (splits.length === 0) {
      throw new TransactionError(
        'Debe proporcionar al menos un split',
        'SPLITS_EMPTY'
      );
    }

    // Validate sum of splits equals parent amount
    const splitsSum = splits.reduce((sum, s) => sum + s.amount, 0);
    // Use rounding to avoid floating-point precision issues
    const roundedSum = Math.round(splitsSum * 100) / 100;
    const parentAmount = Math.round(parentTransaction.amount * 100) / 100;

    if (roundedSum !== parentAmount) {
      throw new TransactionError(
        `La suma de los splits (${roundedSum}) no es igual al monto de la transacción (${parentAmount})`,
        'SPLITS_SUM_MISMATCH'
      );
    }

    // Validate all categories exist
    for (const splitInput of splits) {
      const cat = db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, splitInput.categoryId))
        .get();

      if (!cat) {
        throw new TransactionError(
          `La categoría con ID ${splitInput.categoryId} no existe`,
          'CATEGORY_NOT_FOUND'
        );
      }
    }

    // Atomic: delete existing splits and insert new ones
    const result = sqlite.transaction(() => {
      // Remove any existing splits for this transaction
      db.delete(transactionSplits)
        .where(eq(transactionSplits.transactionId, id))
        .run();

      // Insert new splits
      const insertedSplits = splits.map((splitInput) => {
        return db
          .insert(transactionSplits)
          .values({
            transactionId: id,
            categoryId: splitInput.categoryId,
            amount: splitInput.amount,
            note: splitInput.note ?? null,
          })
          .returning()
          .get();
      });

      return insertedSplits;
    })();

    return result;
  }

  /**
   * Obtiene una transacción por ID, incluyendo sus splits si los tiene.
   */
  static getById(id: number, userId: number) {
    const db = getDb();

    const transaction = db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .get();

    if (!transaction) {
      return null;
    }

    // Get splits if any
    const splits = db
      .select()
      .from(transactionSplits)
      .where(eq(transactionSplits.transactionId, id))
      .all();

    return { ...transaction, splits };
  }
}
