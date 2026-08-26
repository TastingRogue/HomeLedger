import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { transfers, accounts, transactions } from '../db/schema.js';
import type { CreateTransferSchema } from '../validators/transfer.schema.js';

export interface TransferRecord {
  id: number;
  userId: number;
  sourceAccountId: number;
  destinationAccountId: number;
  name: string;
  amount: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

/**
 * Calcula el balance actual de una cuenta:
 * - Cuentas normales (Débito, Inversión, Vales, Efectivo):
 *   balance = initialBalance + Σ ingresos - Σ gastos + Σ transferencias recibidas - Σ transferencias enviadas
 * - Cuentas de Crédito:
 *   El balance representa el crédito utilizado (deuda). Transferencias recibidas (pagos)
 *   reducen la deuda, y transferencias enviadas (disposiciones) la aumentan.
 *   balance = initialBalance + Σ ingresos - Σ gastos - Σ transferencias recibidas + Σ transferencias enviadas
 */
function calculateAccountBalance(accountId: number): number {
  const db = getDb();

  // Get account initial balance and type
  const account = db
    .select({ initialBalance: accounts.initialBalance, type: accounts.type })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .get();

  if (!account) {
    throw new TransferError('Cuenta no encontrada', 'ACCOUNT_NOT_FOUND');
  }

  const initialBalance = account.initialBalance;
  const isCredit = account.type === 'Crédito';

  // Sum of incomes for this account
  const incomeResult = db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), eq(transactions.type, 'Ingreso')))
    .get();

  // Sum of expenses for this account
  const expenseResult = db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), eq(transactions.type, 'Gasto')))
    .get();

  // Sum of transfers received (destination)
  const transfersInResult = db
    .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
    .from(transfers)
    .where(eq(transfers.destinationAccountId, accountId))
    .get();

  // Sum of transfers sent (source)
  const transfersOutResult = db
    .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
    .from(transfers)
    .where(eq(transfers.sourceAccountId, accountId))
    .get();

  const incomes = incomeResult?.total ?? 0;
  const expenses = expenseResult?.total ?? 0;
  const transfersIn = transfersInResult?.total ?? 0;
  const transfersOut = transfersOutResult?.total ?? 0;

  if (isCredit) {
    // Para cuentas de crédito: recibir una transferencia (pago) reduce la deuda,
    // enviar una transferencia (disposición de crédito) aumenta la deuda.
    return initialBalance + incomes - expenses - transfersIn + transfersOut;
  }

  return initialBalance + incomes - expenses + transfersIn - transfersOut;
}

export class TransferService {
  /**
   * Crea una nueva transferencia entre cuentas.
   * Valida que:
   * - La cuenta origen ≠ cuenta destino (ya validado por Zod, pero doble-check)
   * - La cuenta origen tiene fondos suficientes
   * Inserta el registro de transferencia de forma atómica.
   * El balance se calcula dinámicamente, así que solo necesitamos insertar el registro.
   *
   * Requirements: 3.1, 3.2, 3.3, 3.6
   */
  static create(userId: number, input: CreateTransferSchema): TransferRecord {
    const db = getDb();
    const sqlite = getSqlite();

    // Use a transaction for atomicity
    const result = sqlite.transaction(() => {
      // Validate source ≠ destination
      if (input.sourceAccountId === input.destinationAccountId) {
        throw new TransferError(
          'La cuenta origen y la cuenta destino deben ser diferentes',
          'SAME_ACCOUNT'
        );
      }

      // Validate source account exists and belongs to user
      const sourceAccount = db
        .select({ id: accounts.id, userId: accounts.userId, status: accounts.status })
        .from(accounts)
        .where(eq(accounts.id, input.sourceAccountId))
        .get();

      if (!sourceAccount || sourceAccount.userId !== userId) {
        throw new TransferError('La cuenta origen no fue encontrada', 'SOURCE_NOT_FOUND');
      }

      if (sourceAccount.status !== 'Activo') {
        throw new TransferError('La cuenta origen no está activa', 'SOURCE_INACTIVE');
      }

      // Validate destination account exists and belongs to user
      const destAccount = db
        .select({ id: accounts.id, userId: accounts.userId, status: accounts.status })
        .from(accounts)
        .where(eq(accounts.id, input.destinationAccountId))
        .get();

      if (!destAccount || destAccount.userId !== userId) {
        throw new TransferError('La cuenta destino no fue encontrada', 'DESTINATION_NOT_FOUND');
      }

      if (destAccount.status !== 'Activo') {
        throw new TransferError('La cuenta destino no está activa', 'DESTINATION_INACTIVE');
      }

      // Calculate current balance of source account
      const sourceBalance = calculateAccountBalance(input.sourceAccountId);

      // Validate sufficient funds
      if (sourceBalance < input.amount) {
        throw new TransferError(
          'Fondos insuficientes en la cuenta origen',
          'INSUFFICIENT_FUNDS'
        );
      }

      // Insert transfer record (balance is calculated dynamically)
      const now = new Date().toISOString();

      const transfer = db
        .insert(transfers)
        .values({
          userId,
          sourceAccountId: input.sourceAccountId,
          destinationAccountId: input.destinationAccountId,
          name: input.name,
          amount: input.amount,
          date: input.date,
          createdAt: now,
        })
        .returning()
        .get();

      return transfer;
    })();

    return result;
  }

  /**
   * Elimina una transferencia y revierte el movimiento.
   * Dado que el balance se calcula dinámicamente a partir de los registros,
   * simplemente eliminar el registro revierte el efecto automáticamente.
   *
   * Requirements: 3.5
   */
  static delete(id: number, userId: number): void {
    const db = getDb();
    const sqlite = getSqlite();

    sqlite.transaction(() => {
      // Find the transfer and verify ownership
      const transfer = db
        .select()
        .from(transfers)
        .where(and(eq(transfers.id, id), eq(transfers.userId, userId)))
        .get();

      if (!transfer) {
        throw new TransferError('Transferencia no encontrada', 'TRANSFER_NOT_FOUND');
      }

      // Delete the transfer record (balance recalculates dynamically)
      db.delete(transfers).where(eq(transfers.id, id)).run();
    })();
  }

  /**
   * Lista todas las transferencias de un usuario ordenadas por fecha descendente.
   *
   * Requirements: 3.4
   */
  static list(userId: number): TransferRecord[] {
    const db = getDb();

    const results = db
      .select()
      .from(transfers)
      .where(eq(transfers.userId, userId))
      .orderBy(desc(transfers.date))
      .all();

    return results;
  }

  /**
   * Actualiza una transferencia existente.
   * Valida ownership y que las cuentas sean válidas.
   */
  static update(id: number, userId: number, input: Partial<CreateTransferSchema>): TransferRecord {
    const db = getDb();
    const sqlite = getSqlite();

    const result = sqlite.transaction(() => {
      const existing = db
        .select()
        .from(transfers)
        .where(and(eq(transfers.id, id), eq(transfers.userId, userId)))
        .get();

      if (!existing) {
        throw new TransferError('Transferencia no encontrada', 'TRANSFER_NOT_FOUND');
      }

      const sourceId = input.sourceAccountId ?? existing.sourceAccountId;
      const destId = input.destinationAccountId ?? existing.destinationAccountId;

      if (sourceId === destId) {
        throw new TransferError('La cuenta origen y destino deben ser diferentes', 'SAME_ACCOUNT');
      }

      // Validate accounts exist and belong to user
      if (input.sourceAccountId) {
        const src = db.select({ id: accounts.id, userId: accounts.userId }).from(accounts).where(eq(accounts.id, input.sourceAccountId)).get();
        if (!src || src.userId !== userId) throw new TransferError('Cuenta origen no encontrada', 'SOURCE_NOT_FOUND');
      }
      if (input.destinationAccountId) {
        const dst = db.select({ id: accounts.id, userId: accounts.userId }).from(accounts).where(eq(accounts.id, input.destinationAccountId)).get();
        if (!dst || dst.userId !== userId) throw new TransferError('Cuenta destino no encontrada', 'DESTINATION_NOT_FOUND');
      }

      const updated = db
        .update(transfers)
        .set({
          name: input.name ?? existing.name,
          amount: input.amount ?? existing.amount,
          date: input.date ?? existing.date,
          sourceAccountId: sourceId,
          destinationAccountId: destId,
        })
        .where(eq(transfers.id, id))
        .returning()
        .get();

      return updated!;
    })();

    return result;
  }

  /**
   * Obtiene una transferencia por ID, verificando pertenencia al usuario.
   */
  static getById(id: number, userId: number): TransferRecord | null {
    const db = getDb();

    const transfer = db
      .select()
      .from(transfers)
      .where(and(eq(transfers.id, id), eq(transfers.userId, userId)))
      .get();

    return transfer ?? null;
  }
}

/**
 * Error personalizado para operaciones de transferencia.
 */
export class TransferError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'TransferError';
    this.code = code;
  }
}
