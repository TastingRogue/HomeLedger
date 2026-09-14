/**
 * ImportService – Manages file-based bank transaction imports (P4.4 smart importer).
 *
 * Workflow:
 * 1. upload()  → detect/select parser (+ auto-detect the target account),
 *                persist import session, store file in memory
 * 2. preview() → parse stored file, normalize, and annotate each row with a
 *                status (new / duplicate / pending-match) so the user sees what
 *                will happen BEFORE confirming
 * 3. confirm() → bulk-insert selected rows with merchant normalization,
 *                duplicate detection, and pending→posted matching. Every inserted
 *                row is tagged with the import session (importId) for undo.
 * 4. undo()    → reverse exactly the rows a completed session inserted
 *
 * All operations are local/offline — they read only the uploaded file and the
 * user's own data. No network.
 */

import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { imports, transactions, accounts, categories } from '../db/schema.js';
import { UNCATEGORIZED_KEY } from '../db/seed.js';
import { TransactionType } from '@homeledger/shared';
import { TransactionService } from './transaction.service.js';
import { RulesEngineService } from './rules-engine.service.js';
import {
  detectParser,
  getParserById,
  getAvailableParsers as getParserList,
  detectFileFormat,
} from '../importers/index.js';
import { normalizeMerchant, normalizeDate } from '../importers/normalize.js';
import type { ParsedTransaction, FieldMapping, BankParser } from '../importers/base-importer.js';

// ============================================
// Error Types
// ============================================

export type ImportErrorCode =
  | 'IMPORT_NOT_FOUND'
  | 'IMPORT_ALREADY_CONFIRMED'
  | 'IMPORT_NOT_COMPLETED'
  | 'PARSER_NOT_FOUND'
  | 'UNSUPPORTED_FORMAT'
  | 'PARSE_ERROR'
  | 'ACCOUNT_NOT_FOUND'
  | 'NO_TRANSACTIONS'
  | 'EMPTY_FILE'
  | 'NO_CATEGORIES'
  | 'SESSION_DATA_EXPIRED';

export class ImportError extends Error {
  code: ImportErrorCode;

  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = 'ImportError';
    this.code = code;
  }
}

// ============================================
// Types
// ============================================

export interface ImportSession {
  id: number;
  userId: number;
  filename: string;
  parser: string;
  status: string;
  recordCount: number | null;
  createdAt: string;
}

/** Per-row classification computed against the user's existing data. */
export type PreviewRowStatus = 'new' | 'duplicate' | 'pending_match';

/** A parsed row enriched with normalized fields + its computed status. */
export interface PreviewRow extends ParsedTransaction {
  /** Zero-based index into the parsed list (stable id for selection). */
  index: number;
  /** Cleaned-up merchant name (may be ''); the raw description stays in `description`. */
  normalizedMerchant: string;
  /** ISO date after normalization (falls back to the raw string if unparseable). */
  normalizedDate: string;
  /** What confirm() will do with this row. */
  status: PreviewRowStatus;
}

export interface ImportPreview {
  sessionId: number;
  filename: string;
  parser: string;
  format: string;
  transactions: PreviewRow[];
  totalCount: number;
  /** Count of rows that already exist (duplicate). */
  duplicateCount: number;
  /** Count of rows that match an existing pending transaction. */
  pendingMatchCount: number;
  /** Count of genuinely new rows. */
  newCount: number;
  /** The account confirm() will use unless overridden (auto-detected or from upload). */
  detectedAccountId?: number;
}

export interface ImportResult {
  sessionId: number;
  importedCount: number;
  duplicateCount: number;
  skippedCount: number;
  /** Rows that updated an existing pending transaction to posted (P4.4). */
  matchedCount: number;
  transactions: Array<{ id: number; name: string }>;
}

export interface UndoResult {
  sessionId: number;
  removedCount: number;
}

/** In-memory session data stored between upload and confirm */
interface SessionData {
  fileBuffer: Buffer;
  filename: string;
  parser: BankParser;
  userId: number;
  accountId?: number;
}

/** In-memory store for import session data (between upload and confirm) */
const sessionStore = new Map<number, SessionData>();

// How many days apart two transactions can be and still count as the "same"
// movement for pending→posted matching (a charge often posts a few days later).
const PENDING_MATCH_WINDOW_DAYS = 5;

// ============================================
// Service
// ============================================

export class ImportService {
  /**
   * Sube un archivo y crea una sesión de importación.
   * Detecta el formato y parser adecuado; si no se indica cuenta, intenta
   * auto-detectarla (P4.4) por el banco del parser o el nombre del archivo.
   */
  static upload(
    userId: number,
    fileBuffer: Buffer,
    filename: string,
    options?: { parser?: string; accountId?: number },
  ): ImportSession {
    const db = getDb();

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new ImportError('EMPTY_FILE', 'El archivo está vacío o no fue proporcionado');
    }

    const formatResult = detectFileFormat(fileBuffer, filename);
    if (formatResult.format === 'unknown') {
      throw new ImportError(
        'UNSUPPORTED_FORMAT',
        'Formato de archivo no soportado. Use CSV, XLSX u OFX.',
      );
    }

    // Select parser
    let parser: BankParser;
    if (options?.parser) {
      const found = getParserById(options.parser);
      if (!found) {
        throw new ImportError(
          'PARSER_NOT_FOUND',
          `Parser '${options.parser}' no encontrado. Use GET /imports/parsers para ver los disponibles.`,
        );
      }
      parser = found;
    } else {
      parser = detectParser(fileBuffer, filename);
    }

    // Resolve target account: explicit → validated; otherwise auto-detect.
    let accountId = options?.accountId;
    if (accountId) {
      const account = db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .get();
      if (!account) {
        throw new ImportError(
          'ACCOUNT_NOT_FOUND',
          'La cuenta destino no existe o no pertenece al usuario',
        );
      }
    } else {
      accountId = ImportService.detectAccount(userId, parser, filename) ?? undefined;
    }

    const now = new Date().toISOString();
    const session = db
      .insert(imports)
      .values({
        userId,
        filename,
        parser: parser.bankId,
        status: 'pending',
        createdAt: now,
      })
      .returning()
      .get();

    sessionStore.set(session.id, {
      fileBuffer,
      filename,
      parser,
      userId,
      accountId,
    });

    return session;
  }

  /**
   * Previsualiza las transacciones detectadas, normalizadas y clasificadas
   * (nueva / duplicada / coincide-con-pendiente) contra los datos del usuario.
   */
  static preview(sessionId: number, userId: number): ImportPreview {
    const db = getDb();

    const session = db
      .select()
      .from(imports)
      .where(and(eq(imports.id, sessionId), eq(imports.userId, userId)))
      .get();

    if (!session) {
      throw new ImportError('IMPORT_NOT_FOUND', 'Sesión de importación no encontrada');
    }
    if (session.status === 'completed') {
      throw new ImportError('IMPORT_ALREADY_CONFIRMED', 'Esta importación ya fue confirmada');
    }

    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      throw new ImportError(
        'SESSION_DATA_EXPIRED',
        'Los datos del archivo ya no están disponibles. Suba el archivo nuevamente.',
      );
    }

    let parsed: ParsedTransaction[];
    try {
      parsed = sessionData.parser.parse(sessionData.fileBuffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al parsear archivo';
      throw new ImportError('PARSE_ERROR', msg);
    }

    if (parsed.length === 0) {
      throw new ImportError('NO_TRANSACTIONS', 'No se encontraron transacciones en el archivo');
    }

    const formatResult = detectFileFormat(sessionData.fileBuffer, sessionData.filename);
    const accountId = sessionData.accountId;

    let duplicateCount = 0;
    let pendingMatchCount = 0;
    let newCount = 0;

    const rows: PreviewRow[] = parsed.map((p, index) => {
      const normalizedMerchant = normalizeMerchant(p.description);
      const normalizedDate = normalizeDate(p.date) ?? p.date;
      const amount = Math.round(Math.abs(p.amount) * 100) / 100 || 0.01;
      const name = (p.description || 'Importación').substring(0, 100);
      const type = p.type === 'income' ? TransactionType.Ingreso : TransactionType.Gasto;
      const externalId = p.reference ? String(p.reference).substring(0, 120) : null;

      const status = ImportService.classifyRow(
        userId,
        { date: normalizedDate, amount, name, type, externalId },
        accountId,
      );
      if (status === 'duplicate') duplicateCount++;
      else if (status === 'pending_match') pendingMatchCount++;
      else newCount++;

      return { ...p, index, normalizedMerchant, normalizedDate, status };
    });

    return {
      sessionId: session.id,
      filename: session.filename,
      parser: sessionData.parser.bankName,
      format: formatResult.format,
      transactions: rows,
      totalCount: rows.length,
      duplicateCount,
      pendingMatchCount,
      newCount,
      detectedAccountId: accountId,
    };
  }

  /**
   * Confirma una importación: inserta las transacciones seleccionadas.
   * - Normaliza el comercio (merchant) para dedupe/reglas más confiables.
   * - Detecta duplicados (externalId estable, o fecha+monto+nombre).
   * - Empareja pendiente→confirmada: si una fila coincide con una transacción
   *   'pending' existente (mismo monto, fecha cercana), la marca 'posted' en
   *   lugar de insertar un duplicado.
   * - Etiqueta cada fila insertada con la sesión (importId) para poder deshacer.
   */
  static confirm(
    sessionId: number,
    userId: number,
    options?: {
      mappings?: FieldMapping[];
      selectedTransactionIds?: number[];
      defaultCategoryId?: number;
      accountId?: number;
    },
  ): ImportResult {
    const db = getDb();
    const sqlite = getSqlite();

    const session = db
      .select()
      .from(imports)
      .where(and(eq(imports.id, sessionId), eq(imports.userId, userId)))
      .get();

    if (!session) {
      throw new ImportError('IMPORT_NOT_FOUND', 'Sesión de importación no encontrada');
    }
    if (session.status === 'completed') {
      throw new ImportError('IMPORT_ALREADY_CONFIRMED', 'Esta importación ya fue confirmada');
    }

    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      throw new ImportError(
        'SESSION_DATA_EXPIRED',
        'Los datos del archivo ya no están disponibles. Suba el archivo nuevamente.',
      );
    }

    let parsedTransactions: ParsedTransaction[];
    try {
      parsedTransactions = sessionData.parser.parse(sessionData.fileBuffer);
    } catch (err) {
      db.update(imports).set({ status: 'failed' }).where(eq(imports.id, sessionId)).run();
      const msg = err instanceof Error ? err.message : 'Error desconocido al parsear archivo';
      throw new ImportError('PARSE_ERROR', msg);
    }

    // Filter by selected indices if provided
    if (options?.selectedTransactionIds && options.selectedTransactionIds.length > 0) {
      const selected = new Set(options.selectedTransactionIds);
      parsedTransactions = parsedTransactions.filter((_p, idx) => selected.has(idx));
    }

    if (parsedTransactions.length === 0) {
      throw new ImportError('NO_TRANSACTIONS', 'No hay transacciones seleccionadas para importar');
    }

    const accountId = options?.accountId ?? sessionData.accountId;
    if (!accountId) {
      throw new ImportError('ACCOUNT_NOT_FOUND', 'Se requiere una cuenta destino para la importación');
    }

    const account = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .get();
    if (!account) {
      throw new ImportError('ACCOUNT_NOT_FOUND', 'La cuenta destino no existe o no pertenece al usuario');
    }

    const defaultCategoryId = options?.defaultCategoryId ?? ImportService.getDefaultCategoryId(userId);

    const result: ImportResult = {
      sessionId,
      importedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      matchedCount: 0,
      transactions: [],
    };

    const importAll = sqlite.transaction(() => {
      for (const parsed of parsedTransactions) {
        try {
          const name = (parsed.description || 'Importación').substring(0, 100);
          const amount = Math.round(Math.abs(parsed.amount) * 100) / 100 || 0.01;
          const date = normalizeDate(parsed.date) ?? new Date().toISOString();
          const type = parsed.type === 'income' ? TransactionType.Ingreso : TransactionType.Gasto;
          const externalId = parsed.reference ? String(parsed.reference).substring(0, 120) : null;
          // Prefer a cleaned-up merchant; fall back to the raw description.
          const merchant = normalizeMerchant(parsed.description) || (parsed.description
            ? parsed.description.substring(0, 100)
            : null);

          // 1) Hard duplicate: stable externalId, or exact date+amount+name.
          if (externalId && TransactionService.findByExternalId(userId, externalId)) {
            result.duplicateCount++;
            continue;
          }
          if (ImportService.isDuplicate(userId, date, amount, name, accountId)) {
            result.duplicateCount++;
            continue;
          }

          // 2) Pending→posted match: promote an existing pending row instead of
          //    inserting a near-duplicate. Only when the incoming row is posted.
          const pending = ImportService.findPendingMatch(userId, accountId, date, amount, type);
          if (pending) {
            // Promote the existing pending row to posted. We deliberately do NOT
            // set importId here — the row pre-existed, so undo must not delete it.
            // Undo only removes rows the import INSERTED (those carry importId).
            TransactionService.update(pending.id, userId, {
              status: 'posted',
              // Fill in the external id/merchant if the pending row lacked them.
              ...(externalId ? { externalId } : {}),
              ...(merchant ? { merchant } : {}),
            });
            result.matchedCount++;
            result.transactions.push({ id: pending.id, name: pending.name });
            continue;
          }

          // 3) Insert a fresh transaction, tag it with the import session.
          const newTransaction = TransactionService.create(userId, {
            name,
            accountId,
            categoryId: defaultCategoryId,
            amount,
            type,
            date,
            merchant,
            externalId,
          });
          db.update(transactions)
            .set({ importId: sessionId })
            .where(eq(transactions.id, newTransaction.id))
            .run();

          // Auto-apply rules engine for categorization
          try {
            const match = RulesEngineService.evaluate(userId, {
              id: newTransaction.id,
              name: newTransaction.name,
              amount: newTransaction.amount,
              accountName: undefined,
            });
            if (match) {
              const categoryAction = match.actions.find((a) => a.type === 'setCategory');
              if (categoryAction && typeof categoryAction.value === 'number') {
                db.update(transactions)
                  .set({ categoryId: categoryAction.value, updatedAt: new Date().toISOString() })
                  .where(eq(transactions.id, newTransaction.id))
                  .run();
              }
            }
          } catch {
            // Rules engine errors should not block the import
          }

          result.importedCount++;
          result.transactions.push({ id: newTransaction.id, name: newTransaction.name });
        } catch {
          result.skippedCount++;
        }
      }

      db.update(imports)
        .set({ status: 'completed', recordCount: result.importedCount + result.matchedCount })
        .where(eq(imports.id, sessionId))
        .run();
    });

    importAll();
    sessionStore.delete(sessionId);
    return result;
  }

  /**
   * Deshace una importación: revierte exactamente las transacciones que la
   * sesión creó (importId = sessionId). Las filas que solo se ACTUALIZARON
   * (emparejamiento pendiente→confirmada) no se revierten a 'pending' — solo se
   * eliminan las que la importación insertó. Marca la sesión como 'reverted'.
   */
  static undo(sessionId: number, userId: number): UndoResult {
    const db = getDb();
    const sqlite = getSqlite();

    const session = db
      .select()
      .from(imports)
      .where(and(eq(imports.id, sessionId), eq(imports.userId, userId)))
      .get();

    if (!session) {
      throw new ImportError('IMPORT_NOT_FOUND', 'Sesión de importación no encontrada');
    }
    if (session.status !== 'completed') {
      throw new ImportError(
        'IMPORT_NOT_COMPLETED',
        'Solo se pueden deshacer importaciones completadas',
      );
    }

    // Rows this session INSERTED all carry importId = sessionId. Promoted
    // pending rows were deliberately left without importId (they pre-existed),
    // so this cleanly reverses only what the import added.
    const createdRows = db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.importId, sessionId)))
      .all();

    let removedCount = 0;
    const undoAll = sqlite.transaction(() => {
      for (const row of createdRows) {
        try {
          TransactionService.delete(row.id, userId);
          removedCount++;
        } catch {
          // If a row can't be deleted (e.g. now referenced elsewhere), skip it.
        }
      }
      db.update(imports).set({ status: 'reverted' }).where(eq(imports.id, sessionId)).run();
    });

    undoAll();
    return { sessionId, removedCount };
  }

  /**
   * Obtiene el historial de importaciones del usuario.
   */
  static getHistory(userId: number): ImportSession[] {
    const db = getDb();
    return db
      .select()
      .from(imports)
      .where(eq(imports.userId, userId))
      .orderBy(desc(imports.createdAt))
      .all();
  }

  /**
   * Retorna la lista de parsers disponibles con sus metadatos.
   */
  static getAvailableParsers() {
    return getParserList();
  }

  // ============================================
  // Private helpers
  // ============================================

  /**
   * Auto-detects the target account (P4.4) when the user didn't pick one.
   * Heuristic (offline, over the user's own accounts):
   *  1. Match the parser's bank name against each account's `bank`/`name`.
   *  2. Otherwise match tokens from the filename against account names/banks.
   * Returns the account id or null when nothing matches confidently.
   */
  private static detectAccount(userId: number, parser: BankParser, filename: string): number | null {
    const db = getDb();
    const userAccounts = db
      .select({ id: accounts.id, name: accounts.name, bank: accounts.bank })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .all();

    if (userAccounts.length === 0) return null;

    const norm = (s: string | null | undefined) => (s ?? '').toLowerCase();
    // Bank keywords from the parser id/name (e.g. 'bbva_mx' → ['bbva','mx']).
    const bankKeywords = `${parser.bankId} ${parser.bankName}`
      .toLowerCase()
      .split(/[\s_]+/)
      .filter((k) => k.length >= 3 && k !== 'mexico' && k !== 'mx' && k !== 'genérico' && k !== 'generico' && k !== 'csv');

    // 1) Match by bank keyword in account name/bank.
    for (const acc of userAccounts) {
      const hay = `${norm(acc.name)} ${norm(acc.bank)}`;
      if (bankKeywords.some((kw) => hay.includes(kw))) {
        return acc.id;
      }
    }

    // 2) Match by filename tokens against account name/bank.
    const fileTokens = norm(filename)
      .replace(/\.[a-z0-9]+$/i, '')
      .split(/[\s_.-]+/)
      .filter((t) => t.length >= 3);
    for (const acc of userAccounts) {
      const hay = `${norm(acc.name)} ${norm(acc.bank)}`;
      if (fileTokens.some((t) => hay.includes(t) || t.includes(norm(acc.name)))) {
        return acc.id;
      }
    }

    return null;
  }

  /**
   * Classifies a normalized row against existing data for the preview.
   */
  private static classifyRow(
    userId: number,
    row: { date: string; amount: number; name: string; type: TransactionType; externalId: string | null },
    accountId: number | undefined,
  ): PreviewRowStatus {
    if (row.externalId && TransactionService.findByExternalId(userId, row.externalId)) {
      return 'duplicate';
    }
    if (accountId && ImportService.isDuplicate(userId, row.date, row.amount, row.name, accountId)) {
      return 'duplicate';
    }
    if (accountId && ImportService.findPendingMatch(userId, accountId, row.date, row.amount, row.type)) {
      return 'pending_match';
    }
    return 'new';
  }

  /**
   * Detecta si una transacción es duplicada: misma fecha (YYYY-MM-DD), monto y
   * nombre para la misma cuenta del usuario.
   */
  private static isDuplicate(
    userId: number,
    date: string,
    amount: number,
    name: string,
    accountId: number,
  ): boolean {
    const db = getDb();
    const datePrefix = date.substring(0, 10);

    const existing = db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, accountId),
          sql`substr(${transactions.date}, 1, 10) = ${datePrefix}`,
          eq(transactions.amount, amount),
          eq(transactions.name, name),
        ),
      )
      .get();

    return !!existing;
  }

  /**
   * Finds an existing 'pending' transaction that the incoming (posted) row
   * likely corresponds to: same account, same type, same amount, and a date
   * within PENDING_MATCH_WINDOW_DAYS. Returns the row or null.
   */
  private static findPendingMatch(
    userId: number,
    accountId: number,
    date: string,
    amount: number,
    type: TransactionType,
  ): { id: number; name: string } | null {
    const db = getDb();

    const target = new Date(date);
    if (isNaN(target.getTime())) return null;
    const windowMs = PENDING_MATCH_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const from = new Date(target.getTime() - windowMs).toISOString();
    const to = new Date(target.getTime() + windowMs).toISOString();

    const match = db
      .select({ id: transactions.id, name: transactions.name })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, accountId),
          eq(transactions.status, 'pending'),
          eq(transactions.type, type),
          eq(transactions.amount, amount),
          gte(transactions.date, from),
          lte(transactions.date, to),
        ),
      )
      .get();

    return match ?? null;
  }

  /**
   * Resolves the user's default "uncategorized" category id.
   */
  private static getDefaultCategoryId(userId: number): number {
    const db = getDb();

    const defaultCat = db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.key, UNCATEGORIZED_KEY)))
      .get();

    if (defaultCat) return defaultCat.id;

    const anyCat = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.userId, userId))
      .limit(1)
      .get();

    if (!anyCat) {
      throw new ImportError('NO_CATEGORIES', 'No hay categorías disponibles para el usuario');
    }

    return anyCat.id;
  }
}
