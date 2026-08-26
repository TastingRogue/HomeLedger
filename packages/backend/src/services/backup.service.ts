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

    return {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      userId,
      data,
    };
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
      db.delete(accounts).where(eq(accounts.userId, userId)).run();
      db.delete(categories).where(eq(categories.userId, userId)).run();

      // Insert imported data with the current user's ID
      const backupData = validatedBackup.data;

      // Insert categories first (other entities depend on them)
      if (backupData.categories && backupData.categories.length > 0) {
        for (const cat of backupData.categories) {
          const record = cat as Record<string, unknown>;
          db.insert(categories).values({
            ...(record as typeof categories.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert subcategories
      if (backupData.subcategories && backupData.subcategories.length > 0) {
        for (const sub of backupData.subcategories) {
          db.insert(subcategories).values(sub as typeof subcategories.$inferInsert).run();
        }
      }

      // Insert accounts (transactions depend on them)
      if (backupData.accounts && backupData.accounts.length > 0) {
        for (const acc of backupData.accounts) {
          const record = acc as Record<string, unknown>;
          db.insert(accounts).values({
            ...(record as typeof accounts.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert transactions
      if (backupData.transactions && backupData.transactions.length > 0) {
        for (const tx of backupData.transactions) {
          const record = tx as Record<string, unknown>;
          db.insert(transactions).values({
            ...(record as typeof transactions.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert transaction splits
      if (backupData.transactionSplits && backupData.transactionSplits.length > 0) {
        for (const split of backupData.transactionSplits) {
          db.insert(transactionSplits).values(split as typeof transactionSplits.$inferInsert).run();
        }
      }

      // Insert transfers
      if (backupData.transfers && backupData.transfers.length > 0) {
        for (const transfer of backupData.transfers) {
          const record = transfer as Record<string, unknown>;
          db.insert(transfers).values({
            ...(record as typeof transfers.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert subscriptions
      if (backupData.subscriptions && backupData.subscriptions.length > 0) {
        for (const sub of backupData.subscriptions) {
          const record = sub as Record<string, unknown>;
          db.insert(subscriptions).values({
            ...(record as typeof subscriptions.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert recurring transactions
      if (backupData.recurringTransactions && backupData.recurringTransactions.length > 0) {
        for (const rec of backupData.recurringTransactions) {
          const record = rec as Record<string, unknown>;
          db.insert(recurringTransactions).values({
            ...(record as typeof recurringTransactions.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert goals
      if (backupData.goals && backupData.goals.length > 0) {
        for (const goal of backupData.goals) {
          const record = goal as Record<string, unknown>;
          db.insert(goals).values({
            ...(record as typeof goals.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert budgets
      if (backupData.budgets && backupData.budgets.length > 0) {
        for (const budget of backupData.budgets) {
          const record = budget as Record<string, unknown>;
          db.insert(budgets).values({
            ...(record as typeof budgets.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert budget categories
      if (backupData.budgetCategories && backupData.budgetCategories.length > 0) {
        for (const bc of backupData.budgetCategories) {
          db.insert(budgetCategories).values(bc as typeof budgetCategories.$inferInsert).run();
        }
      }

      // Insert rules
      if (backupData.rules && backupData.rules.length > 0) {
        for (const rule of backupData.rules) {
          const record = rule as Record<string, unknown>;
          db.insert(rules).values({
            ...(record as typeof rules.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert alerts
      if (backupData.alerts && backupData.alerts.length > 0) {
        for (const alert of backupData.alerts) {
          const record = alert as Record<string, unknown>;
          db.insert(alerts).values({
            ...(record as typeof alerts.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert assets
      if (backupData.assets && backupData.assets.length > 0) {
        for (const asset of backupData.assets) {
          const record = asset as Record<string, unknown>;
          db.insert(assets).values({
            ...(record as typeof assets.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert liabilities
      if (backupData.liabilities && backupData.liabilities.length > 0) {
        for (const liability of backupData.liabilities) {
          const record = liability as Record<string, unknown>;
          db.insert(liabilities).values({
            ...(record as typeof liabilities.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert loans
      if (backupData.loans && backupData.loans.length > 0) {
        for (const loan of backupData.loans) {
          const record = loan as Record<string, unknown>;
          db.insert(loans).values({
            ...(record as typeof loans.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert loan payments
      if (backupData.loanPayments && backupData.loanPayments.length > 0) {
        for (const payment of backupData.loanPayments) {
          db.insert(loanPayments).values(payment as typeof loanPayments.$inferInsert).run();
        }
      }

      // Insert networth snapshots
      if (backupData.networthSnapshots && backupData.networthSnapshots.length > 0) {
        for (const snapshot of backupData.networthSnapshots) {
          const record = snapshot as Record<string, unknown>;
          db.insert(networthSnapshots).values({
            ...(record as typeof networthSnapshots.$inferInsert),
            userId,
          }).run();
        }
      }

      // Insert credit subscriptions
      if (backupData.creditSubscriptions && backupData.creditSubscriptions.length > 0) {
        for (const cs of backupData.creditSubscriptions) {
          db.insert(creditSubscriptions).values(cs as typeof creditSubscriptions.$inferInsert).run();
        }
      }
    })();
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
