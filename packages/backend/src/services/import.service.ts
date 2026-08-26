/**
 * ImportService – Manages file-based bank transaction imports.
 *
 * Workflow:
 * 1. upload()  → detect/select parser, persist import session, store file in memory
 * 2. preview() → parse stored file, return transactions for user review
 * 3. confirm() → bulk-insert selected transactions with duplicate detection + rules engine
 *
 * Also exposes history and available parsers.
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { imports, transactions, accounts, categories } from '../db/schema.js';
import { TransactionType } from '@smart-finance/shared';
import { TransactionService } from './transaction.service.js';
import { RulesEngineService } from './rules-engine.service.js';
import {
  detectParser,
  getParserById,
  getAvailableParsers as getParserList,
  detectFileFormat,
} from '../importers/index.js';
import type { ParsedTransaction, FieldMapping, BankParser } from '../importers/base-importer.js';

// ============================================
// Error Types
// ============================================

export type ImportErrorCode =
  | 'IMPORT_NOT_FOUND'
  | 'IMPORT_ALREADY_CONFIRMED'
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

export interface ImportPreview {
  sessionId: number;
  filename: string;
  parser: string;
  format: string;
  transactions: ParsedTransaction[];
  totalCount: number;
}

export interface ImportResult {
  sessionId: number;
  importedCount: number;
  duplicateCount: number;
  skippedCount: number;
  transactions: Array<{ id: number; name: string }>;
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

// ============================================
// Service
// ============================================

export class ImportService {
  /**
   * Sube un archivo y crea una sesión de importación.
   * Detecta el formato y parser adecuado, crea el registro en la base de datos,
   * y almacena el contenido del archivo en memoria para la fase de preview/confirm.
   *
   * @param userId - ID del usuario que realiza la importación
   * @param fileBuffer - Buffer del archivo subido
   * @param filename - Nombre original del archivo
   * @param options - Opciones: parser específico, accountId destino
   * @returns Sesión de importación creada
   */
  static upload(
    userId: number,
    fileBuffer: Buffer,
    filename: string,
    options?: { parser?: string; accountId?: number },
  ): ImportSession {
    const db = getDb();

    // Validate file is not empty
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new ImportError('EMPTY_FILE', 'El archivo está vacío o no fue proporcionado');
    }

    // Detect file format
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

    // Validate accountId if provided
    if (options?.accountId) {
      const account = db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, options.accountId), eq(accounts.userId, userId)))
        .get();

      if (!account) {
        throw new ImportError(
          'ACCOUNT_NOT_FOUND',
          'La cuenta destino no existe o no pertenece al usuario',
        );
      }
    }

    // Create import session in DB
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

    // Store file buffer and metadata in memory for preview/confirm phases
    sessionStore.set(session.id, {
      fileBuffer,
      filename,
      parser,
      userId,
      accountId: options?.accountId,
    });

    return session;
  }

  /**
   * Previsualiza las transacciones detectadas en un archivo importado.
   * Parsea el archivo almacenado y retorna las transacciones para revisión del usuario.
   *
   * @param sessionId - ID de la sesión de importación
   * @param userId - ID del usuario (para validación de pertenencia)
   * @returns Preview con transacciones parseadas
   */
  static preview(sessionId: number, userId: number): ImportPreview {
    const db = getDb();

    // Validate session exists and belongs to user
    const session = db
      .select()
      .from(imports)
      .where(and(eq(imports.id, sessionId), eq(imports.userId, userId)))
      .get();

    if (!session) {
      throw new ImportError(
        'IMPORT_NOT_FOUND',
        'Sesión de importación no encontrada',
      );
    }

    if (session.status === 'completed') {
      throw new ImportError(
        'IMPORT_ALREADY_CONFIRMED',
        'Esta importación ya fue confirmada',
      );
    }

    // Retrieve stored session data
    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      throw new ImportError(
        'SESSION_DATA_EXPIRED',
        'Los datos del archivo ya no están disponibles. Suba el archivo nuevamente.',
      );
    }

    // Parse file content
    let parsedTransactions: ParsedTransaction[];
    try {
      parsedTransactions = sessionData.parser.parse(sessionData.fileBuffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al parsear archivo';
      throw new ImportError('PARSE_ERROR', msg);
    }

    if (parsedTransactions.length === 0) {
      throw new ImportError(
        'NO_TRANSACTIONS',
        'No se encontraron transacciones en el archivo',
      );
    }

    // Detect format for metadata
    const formatResult = detectFileFormat(sessionData.fileBuffer, sessionData.filename);

    return {
      sessionId: session.id,
      filename: session.filename,
      parser: sessionData.parser.bankName,
      format: formatResult.format,
      transactions: parsedTransactions,
      totalCount: parsedTransactions.length,
    };
  }

  /**
   * Confirma una importación: inserta las transacciones seleccionadas en la base de datos.
   * Aplica detección de duplicados (misma fecha + monto + nombre para el usuario).
   * Auto-aplica el motor de reglas para auto-categorización.
   * Usa TransactionService.create() para mantener la consistencia de balances.
   *
   * @param sessionId - ID de la sesión de importación
   * @param userId - ID del usuario
   * @param options - Opciones: mappings, selected transaction indices, categoría por defecto, accountId
   * @returns Resultado con contadores de importados, duplicados y errores
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

    // Validate session
    const session = db
      .select()
      .from(imports)
      .where(and(eq(imports.id, sessionId), eq(imports.userId, userId)))
      .get();

    if (!session) {
      throw new ImportError(
        'IMPORT_NOT_FOUND',
        'Sesión de importación no encontrada',
      );
    }

    if (session.status === 'completed') {
      throw new ImportError(
        'IMPORT_ALREADY_CONFIRMED',
        'Esta importación ya fue confirmada',
      );
    }

    // Retrieve stored session data
    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      throw new ImportError(
        'SESSION_DATA_EXPIRED',
        'Los datos del archivo ya no están disponibles. Suba el archivo nuevamente.',
      );
    }

    // Parse file
    let parsedTransactions: ParsedTransaction[];
    try {
      parsedTransactions = sessionData.parser.parse(sessionData.fileBuffer);
    } catch (err) {
      // Mark session as failed
      db.update(imports)
        .set({ status: 'failed' })
        .where(eq(imports.id, sessionId))
        .run();

      const msg = err instanceof Error ? err.message : 'Error desconocido al parsear archivo';
      throw new ImportError('PARSE_ERROR', msg);
    }

    // Filter by selected indices if provided
    if (options?.selectedTransactionIds && options.selectedTransactionIds.length > 0) {
      parsedTransactions = options.selectedTransactionIds
        .filter((idx) => idx >= 0 && idx < parsedTransactions.length)
        .map((idx) => parsedTransactions[idx]!);
    }

    if (parsedTransactions.length === 0) {
      throw new ImportError(
        'NO_TRANSACTIONS',
        'No hay transacciones seleccionadas para importar',
      );
    }

    // Determine accountId (from options or from upload session)
    const accountId = options?.accountId ?? sessionData.accountId;
    if (!accountId) {
      throw new ImportError(
        'ACCOUNT_NOT_FOUND',
        'Se requiere una cuenta destino para la importación',
      );
    }

    // Validate account exists and belongs to user
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

    // Determine default category for transactions without rule match
    const defaultCategoryId = options?.defaultCategoryId ?? ImportService.getDefaultCategoryId();

    // Process each transaction
    const result: ImportResult = {
      sessionId,
      importedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      transactions: [],
    };

    // Use a single DB transaction for atomicity
    const importAll = sqlite.transaction(() => {
      for (const parsed of parsedTransactions) {
        try {
          // Normalize transaction data
          const name = (parsed.description || 'Importación').substring(0, 100);
          const amount = Math.round(Math.abs(parsed.amount) * 100) / 100 || 0.01;
          const date = ImportService.normalizeDate(parsed.date);
          const type = parsed.type === 'income'
            ? TransactionType.Ingreso
            : TransactionType.Gasto;

          // Duplicate detection: same date (YYYY-MM-DD) + amount + name for this user
          if (ImportService.isDuplicate(userId, date, amount, name)) {
            result.duplicateCount++;
            continue;
          }

          // Create transaction via TransactionService (handles balance updates atomically)
          const newTransaction = TransactionService.create(userId, {
            name,
            accountId,
            categoryId: defaultCategoryId,
            amount,
            type,
            date,
          });

          // Auto-apply rules engine for categorization
          try {
            const match = RulesEngineService.evaluate(userId, {
              id: newTransaction.id,
              name: newTransaction.name,
              amount: newTransaction.amount,
              accountName: undefined,
            });

            if (match) {
              // Apply category action if present
              const categoryAction = match.actions.find((a) => a.type === 'setCategory');
              if (categoryAction && typeof categoryAction.value === 'number') {
                db.update(transactions)
                  .set({
                    categoryId: categoryAction.value,
                    updatedAt: new Date().toISOString(),
                  })
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

      // Update import session status
      db.update(imports)
        .set({
          status: 'completed',
          recordCount: result.importedCount,
        })
        .where(eq(imports.id, sessionId))
        .run();
    });

    importAll();

    // Clean up session store
    sessionStore.delete(sessionId);

    return result;
  }

  /**
   * Obtiene el historial de importaciones del usuario.
   *
   * @param userId - ID del usuario
   * @returns Lista de registros de importación ordenados por fecha descendente
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
   * Detecta si una transacción es duplicada.
   * Una transacción se considera duplicada si existe otra con la misma
   * fecha (solo parte de fecha YYYY-MM-DD), monto y nombre para el mismo usuario.
   */
  private static isDuplicate(
    userId: number,
    date: string,
    amount: number,
    name: string,
  ): boolean {
    const db = getDb();
    const datePrefix = date.substring(0, 10); // YYYY-MM-DD

    const existing = db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          sql`substr(${transactions.date}, 1, 10) = ${datePrefix}`,
          eq(transactions.amount, amount),
          eq(transactions.name, name),
        ),
      )
      .get();

    return !!existing;
  }

  /**
   * Normaliza una fecha al formato ISO 8601.
   * Intenta parsear distintos formatos comunes de bancos mexicanos.
   */
  private static normalizeDate(dateStr: string): string {
    // Already ISO format (YYYY-MM-DD...)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      if (dateStr.length === 10) {
        return `${dateStr}T12:00:00.000Z`;
      }
      return dateStr;
    }

    // DD/MM/YYYY format (common in Mexican banks)
    const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}T12:00:00.000Z`;
    }

    // DD-MM-YYYY format
    const ddmmyyyyDash = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr);
    if (ddmmyyyyDash) {
      return `${ddmmyyyyDash[3]}-${ddmmyyyyDash[2]}-${ddmmyyyyDash[1]}T12:00:00.000Z`;
    }

    // Fallback: attempt Date constructor
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    // Last resort: use current date
    return new Date().toISOString();
  }

  /**
   * Obtiene el ID de la categoría por defecto (Corrección) para transacciones sin categorizar.
   */
  private static getDefaultCategoryId(): number {
    const db = getDb();

    const defaultCat = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, 'Corrección'))
      .get();

    if (defaultCat) {
      return defaultCat.id;
    }

    // Fallback: use first available category
    const anyCat = db
      .select({ id: categories.id })
      .from(categories)
      .limit(1)
      .get();

    if (!anyCat) {
      throw new ImportError(
        'NO_CATEGORIES',
        'No hay categorías disponibles en el sistema',
      );
    }

    return anyCat.id;
  }
}
