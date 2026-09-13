import { eq } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import {
  accounts,
  transactions,
  transactionSplits,
  transfers,
  subscriptions,
  goals,
  budgets,
  budgetCategories,
  categories,
  subcategories,
  rules,
  alerts,
  assets,
  liabilities,
  loans,
  loanPayments,
  networthSnapshots,
  creditSubscriptions,
  recurringTransactions,
} from '../db/schema.js';

/** Application version used in backup metadata */
const APP_VERSION = '0.1.0';

/**
 * Error personalizado para operaciones de respaldo.
 * Mensajes en español según requisitos de la aplicación.
 */
export class BackupError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'BackupError';
    this.code = code;
  }
}

/**
 * Estructura de datos exportada en el respaldo.
 */
export interface BackupData {
  accounts: unknown[];
  transactions: unknown[];
  transactionSplits: unknown[];
  transfers: unknown[];
  subscriptions: unknown[];
  goals: unknown[];
  budgets: unknown[];
  budgetCategories: unknown[];
  categories: unknown[];
  subcategories: unknown[];
  rules: unknown[];
  alerts: unknown[];
  assets: unknown[];
  liabilities: unknown[];
  loans: unknown[];
  loanPayments: unknown[];
  networthSnapshots: unknown[];
  creditSubscriptions: unknown[];
  recurringTransactions: unknown[];
}

/**
 * Estructura completa del archivo de respaldo JSON.
 */
export interface BackupFile {
  version: string;
  exportedAt: string;
  userId: number;
  data: BackupData;
}

/**
 * Servicio de respaldo de datos.
 * Permite exportar todos los datos de un usuario a JSON e importarlos restaurando el estado completo.
 *
 * Requirements: 13.3, 13.4, 13.7, 13.8, 13.9
 */
export class BackupService {
  /**
   * Exporta todos los datos del usuario a un objeto JSON con metadatos.
   * Incluye versión de la app, fecha de exportación en ISO 8601, y userId.
   *
   * @param userId - ID del usuario cuyos datos se exportarán
   * @returns Objeto BackupFile con todos los datos serializados
   *
   * Requirements: 13.3, 13.7
   */
  static export(userId: number): BackupFile {
    const db = getDb();

    const data: BackupData = {
      accounts: db.select().from(accounts).where(eq(accounts.userId, userId)).all(),
      transactions: db.select().from(transactions).where(eq(transactions.userId, userId)).all(),
      transactionSplits: db
        .select({
          id: transactionSplits.id,
          transactionId: transactionSplits.transactionId,
          categoryId: transactionSplits.categoryId,
          amount: transactionSplits.amount,
          note: transactionSplits.note,
        })
        .from(transactionSplits)
        .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
        .where(eq(transactions.userId, userId))
        .all(),
      transfers: db.select().from(transfers).where(eq(transfers.userId, userId)).all(),
      subscriptions: db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).all(),
      goals: db.select().from(goals).where(eq(goals.userId, userId)).all(),
      budgets: db.select().from(budgets).where(eq(budgets.userId, userId)).all(),
      budgetCategories: db
        .select({
          id: budgetCategories.id,
          budgetId: budgetCategories.budgetId,
          categoryId: budgetCategories.categoryId,
          allocated: budgetCategories.allocated,
          rollover: budgetCategories.rollover,
        })
        .from(budgetCategories)
        .innerJoin(budgets, eq(budgetCategories.budgetId, budgets.id))
        .where(eq(budgets.userId, userId))
        .all(),
      categories: db.select().from(categories).where(eq(categories.userId, userId)).all(),
      subcategories: db
        .select({
          id: subcategories.id,
          categoryId: subcategories.categoryId,
          name: subcategories.name,
          createdAt: subcategories.createdAt,
        })
        .from(subcategories)
        .innerJoin(categories, eq(subcategories.categoryId, categories.id))
        .where(eq(categories.userId, userId))
        .all(),
      rules: db.select().from(rules).where(eq(rules.userId, userId)).all(),
      alerts: db.select().from(alerts).where(eq(alerts.userId, userId)).all(),
      assets: db.select().from(assets).where(eq(assets.userId, userId)).all(),
      liabilities: db.select().from(liabilities).where(eq(liabilities.userId, userId)).all(),
      loans: db.select().from(loans).where(eq(loans.userId, userId)).all(),
      loanPayments: db
        .select({
          id: loanPayments.id,
          loanId: loanPayments.loanId,
          amount: loanPayments.amount,
          principal: loanPayments.principal,
          interest: loanPayments.interest,
          date: loanPayments.date,
          createdAt: loanPayments.createdAt,
        })
        .from(loanPayments)
        .innerJoin(loans, eq(loanPayments.loanId, loans.id))
        .where(eq(loans.userId, userId))
        .all(),
      networthSnapshots: db.select().from(networthSnapshots).where(eq(networthSnapshots.userId, userId)).all(),
      creditSubscriptions: db
        .select({
          id: creditSubscriptions.id,
          accountId: creditSubscriptions.accountId,
          subscriptionId: creditSubscriptions.subscriptionId,
        })
        .from(creditSubscriptions)
        .innerJoin(accounts, eq(creditSubscriptions.accountId, accounts.id))
        .where(eq(accounts.userId, userId))
        .all(),
      recurringTransactions: db
        .select()
        .from(recurringTransactions)
        .where(eq(recurringTransactions.userId, userId))
        .all(),
    };

    BackupService.recordHistory(userId, 'export');

    return {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      userId,
      data,
    };
  }

  /**
   * Ensures the backup history table exists (created outside Drizzle migrations).
   */
  private static ensureHistoryTable(): void {
    getSqlite().exec(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    getSqlite().exec('CREATE INDEX IF NOT EXISTS backup_history_user_id_idx ON backup_history(user_id)');
  }

  /**
   * Records a backup export/import event for the user's history.
   */
  static recordHistory(userId: number, type: 'export' | 'import'): void {
    this.ensureHistoryTable();
    getSqlite()
      .prepare('INSERT INTO backup_history (user_id, type, created_at) VALUES (?, ?, ?)')
      .run(userId, type, new Date().toISOString());
  }

  /**
   * Returns the backup export/import history for a user, newest first.
   */
  static getHistory(userId: number): { id: number; type: string; createdAt: string }[] {
    this.ensureHistoryTable();
    return getSqlite()
      .prepare('SELECT id, type, created_at as createdAt FROM backup_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
      .all(userId) as { id: number; type: string; createdAt: string }[];
  }

  /**
   * Importa datos desde un archivo de respaldo JSON, reemplazando todos los datos
   * existentes del usuario de forma atómica.
   *
   * @param userId - ID del usuario cuyos datos se reemplazarán
   * @param backup - Objeto de respaldo a importar (ya parseado)
   * @param confirmed - Flag de confirmación explícita del usuario
   *
   * @throws BackupError si el formato es inválido, la versión es incompatible, o no se confirma
   *
   * Requirements: 13.4, 13.8, 13.9
   */
  static import(userId: number, backup: unknown, confirmed: boolean): void {
    // Require explicit user confirmation before proceeding
    if (!confirmed) {
      throw new BackupError(
        'Debe confirmar la operación. Los datos actuales serán reemplazados por completo.',
        'CONFIRMATION_REQUIRED'
      );
    }

    // Validate the backup structure
    const validatedBackup = BackupService.validateBackup(backup);

    const db = getDb();
    const sqlite = getSqlite();

    // Perform atomic replacement using a database transaction
    sqlite.transaction(() => {
      // Delete all existing user data in dependency order (children first)
      // Credit subscriptions (depends on accounts and subscriptions)
      const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId)).all();
      const userAccountIds = userAccounts.map(a => a.id);
      if (userAccountIds.length > 0) {
        for (const accountId of userAccountIds) {
          db.delete(creditSubscriptions).where(eq(creditSubscriptions.accountId, accountId)).run();
        }
      }

      // Transaction splits (depends on transactions)
      const userTransactions = db.select({ id: transactions.id }).from(transactions).where(eq(transactions.userId, userId)).all();
      const userTransactionIds = userTransactions.map(t => t.id);
      if (userTransactionIds.length > 0) {
        for (const txId of userTransactionIds) {
          db.delete(transactionSplits).where(eq(transactionSplits.transactionId, txId)).run();
        }
      }

      // Budget categories (depends on budgets)
      const userBudgets = db.select({ id: budgets.id }).from(budgets).where(eq(budgets.userId, userId)).all();
      const userBudgetIds = userBudgets.map(b => b.id);
      if (userBudgetIds.length > 0) {
        for (const budgetId of userBudgetIds) {
          db.delete(budgetCategories).where(eq(budgetCategories.budgetId, budgetId)).run();
        }
      }

      // Loan payments (depends on loans)
      const userLoans = db.select({ id: loans.id }).from(loans).where(eq(loans.userId, userId)).all();
      const userLoanIds = userLoans.map(l => l.id);
      if (userLoanIds.length > 0) {
        for (const loanId of userLoanIds) {
          db.delete(loanPayments).where(eq(loanPayments.loanId, loanId)).run();
        }
      }

      // Subcategories (depends on categories)
      const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId)).all();
      const userCategoryIds = userCategories.map(c => c.id);
      if (userCategoryIds.length > 0) {
        for (const catId of userCategoryIds) {
          db.delete(subcategories).where(eq(subcategories.categoryId, catId)).run();
        }
      }

      // Delete main entities owned by user
      db.delete(transactions).where(eq(transactions.userId, userId)).run();
      db.delete(transfers).where(eq(transfers.userId, userId)).run();
      db.delete(subscriptions).where(eq(subscriptions.userId, userId)).run();
      db.delete(recurringTransactions).where(eq(recurringTransactions.userId, userId)).run();
      db.delete(goals).where(eq(goals.userId, userId)).run();
      db.delete(budgets).where(eq(budgets.userId, userId)).run();
      db.delete(rules).where(eq(rules.userId, userId)).run();
      db.delete(alerts).where(eq(alerts.userId, userId)).run();
      db.delete(assets).where(eq(assets.userId, userId)).run();
      db.delete(liabilities).where(eq(liabilities.userId, userId)).run();
      db.delete(loans).where(eq(loans.userId, userId)).run();
      db.delete(networthSnapshots).where(eq(networthSnapshots.userId, userId)).run();
      // Receipt analyses + items and attachments (created outside Drizzle via raw
      // SQL in ReceiptService/AttachmentService). Delete before accounts/categories.
      // Guarded by table existence so a fresh DB without these tables won't fail.
      const tableExists = (name: string): boolean =>
        !!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name);
      if (tableExists('receipt_items')) {
        sqlite.prepare('DELETE FROM receipt_items WHERE analysis_id IN (SELECT id FROM receipt_analyses WHERE user_id = ?)').run(userId);
      }
      if (tableExists('receipt_analyses')) {
        sqlite.prepare('DELETE FROM receipt_analyses WHERE user_id = ?').run(userId);
      }
      if (tableExists('attachments')) {
        sqlite.prepare('DELETE FROM attachments WHERE user_id = ?').run(userId);
      }

      db.delete(accounts).where(eq(accounts.userId, userId)).run();
      db.delete(categories).where(eq(categories.userId, userId)).run();

      // Insert imported data. We do NOT preserve original primary keys, because
      // ids are global (shared across users) and reusing them collides with
      // rows owned by other users. Instead we insert with fresh autoincrement
      // ids and remap every foreign-key reference via old->new id maps.
      const backupData = validatedBackup.data;

      // Helpers to read a numeric id/foreign key from a raw backup record.
      const oldId = (rec: Record<string, unknown>): number | null =>
        typeof rec['id'] === 'number' ? (rec['id'] as number) : null;
      const fk = (rec: Record<string, unknown>, key: string): number | null =>
        typeof rec[key] === 'number' ? (rec[key] as number) : null;
      const remap = (map: Map<number, number>, value: number | null | undefined): number | null =>
        value == null ? null : (map.get(value) ?? null);

      // old id -> new id maps for tables referenced by others
      const catMap = new Map<number, number>();
      const subcatMap = new Map<number, number>();
      const acctMap = new Map<number, number>();
      const txMap = new Map<number, number>();
      const subMap = new Map<number, number>();
      const budgetMap = new Map<number, number>();
      const loanMap = new Map<number, number>();

      // Categories (parents of many; drop original id)
      for (const cat of backupData.categories ?? []) {
        const rec = cat as Record<string, unknown>;
        const { id: _drop, ...rest } = rec;
        const inserted = db.insert(categories).values({
          ...(rest as typeof categories.$inferInsert),
          userId,
        }).returning({ id: categories.id }).get();
        const prev = oldId(rec);
        if (prev != null) catMap.set(prev, inserted.id);
      }

      // Subcategories (categoryId -> catMap)
      for (const sub of backupData.subcategories ?? []) {
        const rec = sub as Record<string, unknown>;
        const newCategoryId = remap(catMap, fk(rec, 'categoryId'));
        if (newCategoryId == null) continue; // orphan; skip
        const { id: _drop, categoryId: _c, ...rest } = rec;
        const inserted = db.insert(subcategories).values({
          ...(rest as Omit<typeof subcategories.$inferInsert, 'categoryId'>),
          categoryId: newCategoryId,
        }).returning({ id: subcategories.id }).get();
        const prev = oldId(rec);
        if (prev != null) subcatMap.set(prev, inserted.id);
      }

      // Accounts (parents of transactions/transfers/subscriptions; drop id)
      for (const acc of backupData.accounts ?? []) {
        const rec = acc as Record<string, unknown>;
        const { id: _drop, ...rest } = rec;
        const inserted = db.insert(accounts).values({
          ...(rest as typeof accounts.$inferInsert),
          userId,
        }).returning({ id: accounts.id }).get();
        const prev = oldId(rec);
        if (prev != null) acctMap.set(prev, inserted.id);
      }

      // Transactions (accountId, categoryId, subcategoryId remapped)
      for (const tx of backupData.transactions ?? []) {
        const rec = tx as Record<string, unknown>;
        const newAccountId = remap(acctMap, fk(rec, 'accountId'));
        const newCategoryId = remap(catMap, fk(rec, 'categoryId'));
        if (newAccountId == null || newCategoryId == null) continue; // required FKs
        const newSubcategoryId = remap(subcatMap, fk(rec, 'subcategoryId'));
        const { id: _drop, accountId: _a, categoryId: _c, subcategoryId: _s, ...rest } = rec;
        const inserted = db.insert(transactions).values({
          ...(rest as Omit<typeof transactions.$inferInsert, 'accountId' | 'categoryId' | 'subcategoryId'>),
          userId,
          accountId: newAccountId,
          categoryId: newCategoryId,
          subcategoryId: newSubcategoryId,
        }).returning({ id: transactions.id }).get();
        const prev = oldId(rec);
        if (prev != null) txMap.set(prev, inserted.id);
      }

      // Transaction splits (transactionId, categoryId remapped)
      for (const split of backupData.transactionSplits ?? []) {
        const rec = split as Record<string, unknown>;
        const newTxId = remap(txMap, fk(rec, 'transactionId'));
        const newCategoryId = remap(catMap, fk(rec, 'categoryId'));
        if (newTxId == null || newCategoryId == null) continue;
        const { id: _drop, transactionId: _t, categoryId: _c, ...rest } = rec;
        db.insert(transactionSplits).values({
          ...(rest as Omit<typeof transactionSplits.$inferInsert, 'transactionId' | 'categoryId'>),
          transactionId: newTxId,
          categoryId: newCategoryId,
        }).run();
      }

      // Transfers (source/destination account ids remapped)
      for (const transfer of backupData.transfers ?? []) {
        const rec = transfer as Record<string, unknown>;
        const newSource = remap(acctMap, fk(rec, 'sourceAccountId'));
        const newDest = remap(acctMap, fk(rec, 'destinationAccountId'));
        if (newSource == null || newDest == null) continue;
        const { id: _drop, sourceAccountId: _s, destinationAccountId: _d, ...rest } = rec;
        db.insert(transfers).values({
          ...(rest as Omit<typeof transfers.$inferInsert, 'sourceAccountId' | 'destinationAccountId'>),
          userId,
          sourceAccountId: newSource,
          destinationAccountId: newDest,
        }).run();
      }

      // Subscriptions (accountId, categoryId remapped)
      for (const sub of backupData.subscriptions ?? []) {
        const rec = sub as Record<string, unknown>;
        const newAccountId = remap(acctMap, fk(rec, 'accountId'));
        const newCategoryId = remap(catMap, fk(rec, 'categoryId'));
        if (newAccountId == null || newCategoryId == null) continue;
        const { id: _drop, accountId: _a, categoryId: _c, ...rest } = rec;
        const inserted = db.insert(subscriptions).values({
          ...(rest as Omit<typeof subscriptions.$inferInsert, 'accountId' | 'categoryId'>),
          userId,
          accountId: newAccountId,
          categoryId: newCategoryId,
        }).returning({ id: subscriptions.id }).get();
        const prev = oldId(rec);
        if (prev != null) subMap.set(prev, inserted.id);
      }

      // Recurring transactions (accountId, categoryId remapped)
      for (const rec2 of backupData.recurringTransactions ?? []) {
        const rec = rec2 as Record<string, unknown>;
        const newAccountId = remap(acctMap, fk(rec, 'accountId'));
        const newCategoryId = remap(catMap, fk(rec, 'categoryId'));
        if (newAccountId == null || newCategoryId == null) continue;
        const { id: _drop, accountId: _a, categoryId: _c, ...rest } = rec;
        db.insert(recurringTransactions).values({
          ...(rest as Omit<typeof recurringTransactions.$inferInsert, 'accountId' | 'categoryId'>),
          userId,
          accountId: newAccountId,
          categoryId: newCategoryId,
        }).run();
      }

      // Goals (no cross-FK; drop id)
      for (const goal of backupData.goals ?? []) {
        const rec = goal as Record<string, unknown>;
        const { id: _drop, ...rest } = rec;
        db.insert(goals).values({
          ...(rest as typeof goals.$inferInsert),
          userId,
        }).run();
      }

      // Budgets (drop id, map for budgetCategories)
      for (const budget of backupData.budgets ?? []) {
        const rec = budget as Record<string, unknown>;
        const { id: _drop, ...rest } = rec;
        const inserted = db.insert(budgets).values({
          ...(rest as typeof budgets.$inferInsert),
          userId,
        }).returning({ id: budgets.id }).get();
        const prev = oldId(rec);
        if (prev != null) budgetMap.set(prev, inserted.id);
      }

      // Budget categories (budgetId, categoryId remapped)
      for (const bc of backupData.budgetCategories ?? []) {
        const rec = bc as Record<string, unknown>;
        const newBudgetId = remap(budgetMap, fk(rec, 'budgetId'));
        const newCategoryId = remap(catMap, fk(rec, 'categoryId'));
        if (newBudgetId == null || newCategoryId == null) continue;
        const { id: _drop, budgetId: _b, categoryId: _c, ...rest } = rec;
        db.insert(budgetCategories).values({
          ...(rest as Omit<typeof budgetCategories.$inferInsert, 'budgetId' | 'categoryId'>),
          budgetId: newBudgetId,
          categoryId: newCategoryId,
        }).run();
      }

      // Rules (no cross-FK; drop id)
      for (const rule of backupData.rules ?? []) {
        const rec = rule as Record<string, unknown>;
        const { id: _drop, ...rest } = rec;
        db.insert(rules).values({
          ...(rest as typeof rules.$inferInsert),
          userId,
        }).run();
      }

      // Alerts (no cross-FK; drop id)
      for (const alert of backupData.alerts ?? []) {
        const rec = alert as Record<string, unknown>;
        const { id: _drop, ...rest } = rec;
        db.insert(alerts).values({
          ...(rest as typeof alerts.$inferInsert),
          userId,
        }).run();
      }

      // Assets (no cross-FK; drop id)
      for (const asset of backupData.assets ?? []) {
        const rec = asset as Record<string, unknown>;
        const { id: _drop, ...rest } = rec;
        db.insert(assets).values({
          ...(rest as typeof assets.$inferInsert),
          userId,
        }).run();
      }

      // Liabilities (no cross-FK; drop id)
      for (const liability of backupData.liabilities ?? []) {
        const rec = liability as Record<string, unknown>;
        const { id: _drop, ...rest } = rec;
        db.insert(liabilities).values({
          ...(rest as typeof liabilities.$inferInsert),
          userId,
        }).run();
      }

      // Loans (drop id, map for loanPayments)
      for (const loan of backupData.loans ?? []) {
        const rec = loan as Record<string, unknown>;
        const { id: _drop, ...rest } = rec;
        const inserted = db.insert(loans).values({
          ...(rest as typeof loans.$inferInsert),
          userId,
        }).returning({ id: loans.id }).get();
        const prev = oldId(rec);
        if (prev != null) loanMap.set(prev, inserted.id);
      }

      // Loan payments (loanId remapped)
      for (const payment of backupData.loanPayments ?? []) {
        const rec = payment as Record<string, unknown>;
        const newLoanId = remap(loanMap, fk(rec, 'loanId'));
        if (newLoanId == null) continue;
        const { id: _drop, loanId: _l, ...rest } = rec;
        db.insert(loanPayments).values({
          ...(rest as Omit<typeof loanPayments.$inferInsert, 'loanId'>),
          loanId: newLoanId,
        }).run();
      }

      // Networth snapshots (no cross-FK; drop id)
      for (const snapshot of backupData.networthSnapshots ?? []) {
        const rec = snapshot as Record<string, unknown>;
        const { id: _drop, ...rest } = rec;
        db.insert(networthSnapshots).values({
          ...(rest as typeof networthSnapshots.$inferInsert),
          userId,
        }).run();
      }

      // Credit subscriptions (accountId, subscriptionId remapped)
      for (const cs of backupData.creditSubscriptions ?? []) {
        const rec = cs as Record<string, unknown>;
        const newAccountId = remap(acctMap, fk(rec, 'accountId'));
        const newSubscriptionId = remap(subMap, fk(rec, 'subscriptionId'));
        if (newAccountId == null || newSubscriptionId == null) continue;
        db.insert(creditSubscriptions).values({
          accountId: newAccountId,
          subscriptionId: newSubscriptionId,
        }).run();
      }
    })();

    BackupService.recordHistory(userId, 'import');
  }

  /**
   * Validates the backup structure and version compatibility.
   * Rejects invalid format or incompatible major version.
   *
   * @param backup - Raw parsed backup object to validate
   * @returns Validated BackupFile object
   * @throws BackupError if format is invalid or version is incompatible
   *
   * Requirements: 13.8
   */
  static validateBackup(backup: unknown): BackupFile {
    if (!backup || typeof backup !== 'object') {
      throw new BackupError(
        'El formato del archivo de respaldo es inválido. Se esperaba un objeto JSON.',
        'INVALID_FORMAT'
      );
    }

    const obj = backup as Record<string, unknown>;

    // Validate required top-level fields
    if (!obj['version'] || typeof obj['version'] !== 'string') {
      throw new BackupError(
        'El archivo de respaldo no contiene un campo "version" válido.',
        'MISSING_VERSION'
      );
    }

    if (!obj['exportedAt'] || typeof obj['exportedAt'] !== 'string') {
      throw new BackupError(
        'El archivo de respaldo no contiene un campo "exportedAt" válido.',
        'MISSING_EXPORTED_AT'
      );
    }

    // Validate exportedAt is a valid ISO 8601 date
    if (isNaN(Date.parse(obj['exportedAt'] as string))) {
      throw new BackupError(
        'La fecha de exportación no está en formato ISO 8601 válido.',
        'INVALID_DATE_FORMAT'
      );
    }

    if (!obj['data'] || typeof obj['data'] !== 'object') {
      throw new BackupError(
        'El archivo de respaldo no contiene un campo "data" válido.',
        'MISSING_DATA'
      );
    }

    // Validate version compatibility (reject if major version differs)
    const backupVersion = obj['version'] as string;
    const backupMajor = BackupService.parseMajorVersion(backupVersion);
    const appMajor = BackupService.parseMajorVersion(APP_VERSION);

    if (backupMajor === null) {
      throw new BackupError(
        `La versión del respaldo "${backupVersion}" no tiene un formato válido (se espera semver: X.Y.Z).`,
        'INVALID_VERSION_FORMAT'
      );
    }

    if (backupMajor !== appMajor) {
      throw new BackupError(
        `La versión del respaldo (${backupVersion}) es incompatible con la versión actual de la aplicación (${APP_VERSION}). Las versiones mayores deben coincidir.`,
        'INCOMPATIBLE_VERSION'
      );
    }

    // Validate that data contains expected arrays (optional, but must be arrays if present)
    const data = obj['data'] as Record<string, unknown>;
    const expectedArrayFields = [
      'accounts', 'transactions', 'transactionSplits', 'transfers',
      'subscriptions', 'goals', 'budgets', 'budgetCategories',
      'categories', 'subcategories', 'rules', 'alerts',
      'assets', 'liabilities', 'loans', 'loanPayments',
      'networthSnapshots', 'creditSubscriptions', 'recurringTransactions',
    ];

    for (const field of expectedArrayFields) {
      if (data[field] !== undefined && !Array.isArray(data[field])) {
        throw new BackupError(
          `El campo "data.${field}" debe ser un arreglo.`,
          'INVALID_DATA_FIELD'
        );
      }
    }

    return {
      version: backupVersion,
      exportedAt: obj['exportedAt'] as string,
      userId: typeof obj['userId'] === 'number' ? obj['userId'] : 0,
      data: {
        accounts: Array.isArray(data['accounts']) ? data['accounts'] : [],
        transactions: Array.isArray(data['transactions']) ? data['transactions'] : [],
        transactionSplits: Array.isArray(data['transactionSplits']) ? data['transactionSplits'] : [],
        transfers: Array.isArray(data['transfers']) ? data['transfers'] : [],
        subscriptions: Array.isArray(data['subscriptions']) ? data['subscriptions'] : [],
        goals: Array.isArray(data['goals']) ? data['goals'] : [],
        budgets: Array.isArray(data['budgets']) ? data['budgets'] : [],
        budgetCategories: Array.isArray(data['budgetCategories']) ? data['budgetCategories'] : [],
        categories: Array.isArray(data['categories']) ? data['categories'] : [],
        subcategories: Array.isArray(data['subcategories']) ? data['subcategories'] : [],
        rules: Array.isArray(data['rules']) ? data['rules'] : [],
        alerts: Array.isArray(data['alerts']) ? data['alerts'] : [],
        assets: Array.isArray(data['assets']) ? data['assets'] : [],
        liabilities: Array.isArray(data['liabilities']) ? data['liabilities'] : [],
        loans: Array.isArray(data['loans']) ? data['loans'] : [],
        loanPayments: Array.isArray(data['loanPayments']) ? data['loanPayments'] : [],
        networthSnapshots: Array.isArray(data['networthSnapshots']) ? data['networthSnapshots'] : [],
        creditSubscriptions: Array.isArray(data['creditSubscriptions']) ? data['creditSubscriptions'] : [],
        recurringTransactions: Array.isArray(data['recurringTransactions']) ? data['recurringTransactions'] : [],
      },
    };
  }

  /**
   * Parses the major version number from a semver string.
   * Returns null if the version string is not valid semver.
   */
  static parseMajorVersion(version: string): number | null {
    const match = version.match(/^(\d+)\.\d+\.\d+/);
    if (!match) return null;
    return parseInt(match[1]!, 10);
  }
}
