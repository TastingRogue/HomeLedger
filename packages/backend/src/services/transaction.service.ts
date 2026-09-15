import { eq, and, desc, gte, lte, count, inArray } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { transactions, transactionSplits, transactionTags, transactionAudit, accounts, categories, subcategories } from '../db/schema.js';
import type { CreateTransactionSchema, UpdateTransactionSchema, QuickTransactionInput } from '../validators/transaction.schema.js';
import type { TransactionFilters, PaginatedResult } from '@homeledger/shared';
import { TransactionType } from '@homeledger/shared';
import { TagService } from './tag.service.js';
import { WebhookService } from './webhook.service.js';

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

/**
 * Columns tracked in the audit diff (P4.1 Phase 3). Timestamps and ids are
 * excluded — they're noise for a human reading "what changed".
 */
const AUDITED_FIELDS = [
  'name', 'amount', 'type', 'date', 'categoryId', 'subcategoryId', 'accountId',
  'notes', 'merchant', 'subtype', 'reconciled', 'status', 'externalId',
] as const;

type TxRow = typeof transactions.$inferSelect;

/**
 * Writes one audit row. Must be called INSIDE the caller's `sqlite.transaction`
 * so the audit entry commits atomically with the change it describes.
 */
function recordAudit(
  userId: number,
  transactionId: number | null,
  action: 'created' | 'updated' | 'deleted',
  changes: unknown,
): void {
  getDb().insert(transactionAudit).values({
    transactionId,
    userId,
    action,
    changes: changes ?? null,
    createdAt: new Date().toISOString(),
  }).run();
}

/**
 * Builds a { field: { from, to } } diff between two transaction rows, limited to
 * AUDITED_FIELDS. Returns null when nothing meaningful changed.
 */
function diffTransaction(before: TxRow, after: TxRow): Record<string, { from: unknown; to: unknown }> | null {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of AUDITED_FIELDS) {
    const a = before[field];
    const b = after[field];
    if (a !== b) diff[field] = { from: a, to: b };
  }
  return Object.keys(diff).length > 0 ? diff : null;
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

    // Validate the category exists and belongs to this user.
    const category = db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId)))
      .get();

    if (!category) {
      throw new TransactionError(
        'La categoría especificada no existe',
        'CATEGORY_NOT_FOUND'
      );
    }

    // If a subcategory is provided, it must belong to the chosen category.
    if (input.subcategoryId != null) {
      TransactionService.assertSubcategoryBelongs(input.subcategoryId, input.categoryId);
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
          subcategoryId: input.subcategoryId ?? null,
          name: input.name,
          amount: input.amount,
          type: input.type,
          date: input.date,
          // P4.1 richer fields (optional; sensible defaults preserve prior behavior)
          merchant: input.merchant ?? null,
          subtype: input.subtype ?? null,
          reconciled: input.reconciled ?? false,
          status: input.status ?? 'posted',
          externalId: input.externalId ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      // Audit: record creation with a snapshot of the audited fields. (P4.1 Phase 3)
      const snapshot: Record<string, unknown> = {};
      for (const f of AUDITED_FIELDS) snapshot[f] = newTransaction[f];
      recordAudit(userId, newTransaction.id, 'created', snapshot);

      return newTransaction;
    })();

    // P4.13: fire the transaction.created webhook (fire-and-forget, post-commit).
    WebhookService.deliver(userId, 'transaction.created', {
      id: result.id,
      accountId: result.accountId,
      categoryId: result.categoryId,
      name: result.name,
      amount: result.amount,
      type: result.type,
      date: result.date,
      merchant: result.merchant,
    });

    return result;
  }

  /**
   * Ensures a subcategory exists and belongs to the given category.
   * @throws TransactionError SUBCATEGORY_NOT_FOUND otherwise.
   */
  private static assertSubcategoryBelongs(subcategoryId: number, categoryId: number): void {
    const db = getDb();
    const sub = db
      .select({ id: subcategories.id })
      .from(subcategories)
      .where(and(eq(subcategories.id, subcategoryId), eq(subcategories.categoryId, categoryId)))
      .get();
    if (!sub) {
      throw new TransactionError(
        'La subcategoría no existe o no pertenece a la categoría seleccionada',
        'SUBCATEGORY_NOT_FOUND',
      );
    }
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
        .where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId)))
        .get();

      if (!newCategory) {
        throw new TransactionError(
          'La nueva categoría especificada no existe',
          'CATEGORY_NOT_FOUND'
        );
      }
    }

    // Resolve subcategory changes. The effective category is the new one if
    // provided, else the existing one. Rules:
    //  - subcategoryId provided (non-null): validate it belongs to the effective category.
    //  - subcategoryId === null: clear it.
    //  - subcategoryId omitted but category changed: clear it (avoid orphaning to a
    //    subcategory of the old category).
    const effectiveCategoryId = input.categoryId ?? existing.categoryId;
    let subcategoryUpdate: { subcategoryId: number | null } | undefined;
    if (input.subcategoryId !== undefined) {
      if (input.subcategoryId === null) {
        subcategoryUpdate = { subcategoryId: null };
      } else {
        TransactionService.assertSubcategoryBelongs(input.subcategoryId, effectiveCategoryId);
        subcategoryUpdate = { subcategoryId: input.subcategoryId };
      }
    } else if (input.categoryId !== undefined && input.categoryId !== existing.categoryId) {
      subcategoryUpdate = { subcategoryId: null };
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
          ...(subcategoryUpdate !== undefined && subcategoryUpdate),
          ...(input.amount !== undefined && { amount: input.amount }),
          ...(input.type !== undefined && { type: input.type }),
          // P4.1 richer fields. `!== undefined` so null explicitly clears them.
          ...(input.merchant !== undefined && { merchant: input.merchant ?? null }),
          ...(input.subtype !== undefined && { subtype: input.subtype ?? null }),
          ...(input.reconciled !== undefined && { reconciled: input.reconciled }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.externalId !== undefined && { externalId: input.externalId ?? null }),
          updatedAt: now,
        })
        .where(eq(transactions.id, id))
        .returning()
        .get();

      // Audit: record the field-level diff (skipped when nothing changed). (P4.1 Phase 3)
      const changes = diffTransaction(existing, updated);
      if (changes) recordAudit(userId, id, 'updated', changes);

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
      // Audit BEFORE deleting: snapshot the audited fields (+ the original id/name
      // for identification, since the FK is set-null on delete). (P4.1 Phase 3)
      const snapshot: Record<string, unknown> = { id: existing.id };
      for (const f of AUDITED_FIELDS) snapshot[f] = existing[f];
      recordAudit(userId, id, 'deleted', snapshot);

      // Delete associated splits first (cascade should handle this, but explicit is safer)
      db.delete(transactionSplits)
        .where(eq(transactionSplits.transactionId, id))
        .run();

      // Delete the transaction (sets transaction_audit.transaction_id to NULL via FK)
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
    // P4.1 richer-model filters.
    if (filters.reconciled !== undefined) {
      conditions.push(eq(transactions.reconciled, filters.reconciled));
    }
    if (filters.status) {
      conditions.push(eq(transactions.status, filters.status));
    }
    if (filters.subtype) {
      conditions.push(eq(transactions.subtype, filters.subtype));
    }
    // P4.1 Phase 2: filter by tag via a subquery on the M2M join table.
    if (filters.tagId) {
      const db2 = getDb();
      const tagged = db2
        .select({ id: transactionTags.transactionId })
        .from(transactionTags)
        .where(eq(transactionTags.tagId, filters.tagId));
      conditions.push(inArray(transactions.id, tagged));
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
   * Returns ALL transactions matching the given filters (no pagination), with
   * account and category names resolved via joins. Used for CSV export, where
   * the user expects the whole filtered dataset in one file rather than a page.
   * Ordered by date descending to match the list view.
   */
  static listAllForExport(
    userId: number,
    filters: Pick<TransactionFilters, 'accountId' | 'categoryId' | 'type' | 'startDate' | 'endDate'>
  ): {
    date: string;
    name: string;
    merchant: string;
    type: string;
    amount: number;
    accountName: string;
    categoryName: string;
    notes: string;
  }[] {
    const db = getDb();

    const conditions = [eq(transactions.userId, userId)];
    if (filters.accountId) conditions.push(eq(transactions.accountId, filters.accountId));
    if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
    if (filters.type) conditions.push(eq(transactions.type, filters.type));
    if (filters.startDate) conditions.push(gte(transactions.date, filters.startDate));
    if (filters.endDate) conditions.push(lte(transactions.date, filters.endDate));

    const rows = db
      .select({
        date: transactions.date,
        name: transactions.name,
        merchant: transactions.merchant,
        type: transactions.type,
        amount: transactions.amount,
        accountName: accounts.name,
        categoryName: categories.name,
        notes: transactions.notes,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date))
      .all();

    return rows.map((r) => ({
      date: r.date,
      name: r.name,
      merchant: r.merchant ?? '',
      type: r.type,
      amount: r.amount,
      accountName: r.accountName ?? '',
      categoryName: r.categoryName ?? '',
      notes: r.notes ?? '',
    }));
  }

  /**
   * Finds a transaction by its imported source id (`externalId`) for a user.
   * Used by the importer to skip rows already imported from the same source.
   * Returns null when none match or when `externalId` is empty.
   */
  static findByExternalId(userId: number, externalId: string) {
    if (!externalId) return null;
    const db = getDb();
    return db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.externalId, externalId)))
      .get() ?? null;
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

    // Validate and get category name (system or own)
    const category = db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId)))
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

    // P4.13: fire the transaction.created webhook (fire-and-forget, post-commit).
    WebhookService.deliver(userId, 'transaction.created', {
      id: result.id,
      accountId: result.accountId,
      categoryId: result.categoryId,
      name: result.name,
      amount: result.amount,
      type: result.type,
      date: result.date,
      merchant: result.merchant,
    });

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

    // Validate all categories exist and are usable by this user (system or own)
    for (const splitInput of splits) {
      const cat = db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, splitInput.categoryId), eq(categories.userId, userId)))
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
   * Elimina todos los splits de una transacción (la transacción vuelve a usar
   * únicamente su categoría principal). No-op si no tenía splits.
   *
   * @throws TransactionError si la transacción no existe o no pertenece al usuario
   */
  static clearSplits(id: number, userId: number): void {
    const db = getDb();
    const parent = db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .get();
    if (!parent) {
      throw new TransactionError('La transacción no existe o no pertenece al usuario', 'TRANSACTION_NOT_FOUND');
    }
    db.delete(transactionSplits).where(eq(transactionSplits.transactionId, id)).run();
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

    // Attached tags (P4.1 Phase 2).
    const tags = TagService.listForTransaction(id);

    return { ...transaction, splits, tags };
  }

  /**
   * Returns the audit history for a transaction, newest first (P4.1 Phase 3).
   * Scoped by userId so a user only sees their own transactions' history.
   * @throws TransactionError if the transaction doesn't belong to the user.
   */
  static getAuditHistory(id: number, userId: number) {
    const db = getDb();

    const tx = db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .get();
    if (!tx) {
      throw new TransactionError('La transacción no existe o no pertenece al usuario', 'TRANSACTION_NOT_FOUND');
    }

    return db
      .select()
      .from(transactionAudit)
      .where(and(eq(transactionAudit.transactionId, id), eq(transactionAudit.userId, userId)))
      .orderBy(desc(transactionAudit.createdAt), desc(transactionAudit.id))
      .all();
  }
}
