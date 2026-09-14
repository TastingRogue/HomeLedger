import { eq, and, ne, desc, sql } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { accounts, transactions, transfers, creditSubscriptions, subscriptions } from '../db/schema.js';
import type { CreateAccountSchema, UpdateAccountSchema } from '../validators/account.schema.js';
import { roundMoney } from '../utils/money.js';
import { getInstanceCurrency, isSupportedCurrency } from '../config/currency.js';

/**
 * Tipo de estado de salud crediticia.
 */
export type CreditHealthStatus = 'saludable' | 'moderado' | 'crítico';

/** Rounds an exchange rate to 6 decimals (enough precision for FX). */
function roundRate(rate: number): number {
  return Math.round(rate * 1e6) / 1e6;
}

/**
 * Error personalizado para operaciones de cuentas.
 */
export class AccountError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AccountError';
    this.code = code;
  }
}

/**
 * Servicio de gestión de cuentas financieras.
 * Implementa lógica de negocio para crear, editar, desactivar y consultar cuentas.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */
export class AccountService {
  /**
   * Resolves the account currency (P4.11 multi-currency). Any supported currency
   * is allowed; when omitted it defaults to the instance/base currency. A
   * non-base currency must be paired with an exchange rate (validated by the
   * caller) so aggregations can convert to base.
   *
   * @throws AccountError INVALID_CURRENCY if an unsupported currency is requested
   */
  private static resolveCurrency(requested?: string | null): string {
    if (requested == null || requested === '') return getInstanceCurrency();
    const normalized = requested.toUpperCase();
    if (!isSupportedCurrency(normalized)) {
      throw new AccountError(
        `Moneda no soportada: ${requested}.`,
        'INVALID_CURRENCY',
      );
    }
    return normalized;
  }

  /**
   * Resolves the exchange rate to base for an account (P4.11). A base-currency
   * account is always rate 1; a foreign-currency account uses the provided rate
   * (must be > 0) or falls back to 1 when none is given.
   */
  private static resolveExchangeRate(currency: string, requestedRate?: number | null): number {
    if (currency === getInstanceCurrency()) return 1;
    if (requestedRate != null && requestedRate > 0) return roundRate(requestedRate);
    return 1;
  }

  /**
   * Crea una nueva cuenta financiera para un usuario.
   * Valida que el nombre sea único entre cuentas activas del mismo usuario.
   *
   * @throws AccountError si el nombre ya existe en otra cuenta activa
   */
  static async create(userId: number, input: CreateAccountSchema) {
    const db = getDb();

    // Validar nombre único entre cuentas activas del usuario
    const isUnique = await AccountService.validateUniqueName(userId, input.name);
    if (!isUnique) {
      throw new AccountError(
        'Ya existe una cuenta activa con ese nombre',
        'DUPLICATE_ACCOUNT_NAME'
      );
    }

    const now = new Date().toISOString();
    const resolvedCurrency = AccountService.resolveCurrency(input.currency);

    const result = db
      .insert(accounts)
      .values({
        userId,
        name: input.name,
        type: input.type,
        bank: input.bank ?? null,
        initialBalance: input.initialBalance,
        balanceLimit: input.balanceLimit ?? null,
        creditLimit: input.creditLimit ?? null,
        // P4.2 statement fields (credit-only; null for other types)
        statementDay: input.statementDay ?? null,
        paymentDueDay: input.paymentDueDay ?? null,
        apr: input.apr ?? null,
        minimumPayment: input.minimumPayment ?? null,
        status: 'Activo',
        currency: resolvedCurrency,
        exchangeRate: AccountService.resolveExchangeRate(resolvedCurrency, input.exchangeRate),
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return result;
  }

  /**
   * Actualiza una cuenta existente.
   * Valida que el nombre sea único excluyendo la propia cuenta.
   *
   * @throws AccountError si la cuenta no existe o el nombre ya está en uso
   */
  static async update(id: number, userId: number, input: UpdateAccountSchema) {
    const db = getDb();

    // Verificar que la cuenta existe y pertenece al usuario (aislamiento por usuario)
    const existing = db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .get();

    if (!existing) {
      throw new AccountError('Cuenta no encontrada', 'ACCOUNT_NOT_FOUND');
    }

    // Si se cambia el nombre, validar unicidad excluyendo la cuenta actual
    if (input.name && input.name !== existing.name) {
      const isUnique = await AccountService.validateUniqueName(
        existing.userId,
        input.name,
        id
      );
      if (!isUnique) {
        throw new AccountError(
          'Ya existe una cuenta activa con ese nombre',
          'DUPLICATE_ACCOUNT_NAME'
        );
      }
    }

    const now = new Date().toISOString();

    // P4.11: currency + exchangeRate move together. If either is provided,
    // recompute the effective currency and its rate (base currency → rate 1).
    let currencyUpdate: { currency: string; exchangeRate: number } | undefined;
    if (input.currency !== undefined || input.exchangeRate !== undefined) {
      const currency = input.currency !== undefined
        ? AccountService.resolveCurrency(input.currency)
        : existing.currency;
      const rate = AccountService.resolveExchangeRate(
        currency,
        input.exchangeRate !== undefined ? input.exchangeRate : existing.exchangeRate,
      );
      currencyUpdate = { currency, exchangeRate: rate };
    }

    const result = db
      .update(accounts)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.bank !== undefined && { bank: input.bank ?? null }),
        ...(input.initialBalance !== undefined && { initialBalance: input.initialBalance }),
        ...(input.balanceLimit !== undefined && { balanceLimit: input.balanceLimit ?? null }),
        ...(input.creditLimit !== undefined && { creditLimit: input.creditLimit ?? null }),
        // P4.2 statement fields
        ...(input.statementDay !== undefined && { statementDay: input.statementDay ?? null }),
        ...(input.paymentDueDay !== undefined && { paymentDueDay: input.paymentDueDay ?? null }),
        ...(input.apr !== undefined && { apr: input.apr ?? null }),
        ...(input.minimumPayment !== undefined && { minimumPayment: input.minimumPayment ?? null }),
        ...(currencyUpdate !== undefined && currencyUpdate),
        updatedAt: now,
      })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning()
      .get();

    return result;
  }

  /**
   * Desactiva una cuenta cambiando su estado a "Inactivo".
   * Las cuentas inactivas se excluyen del panel principal.
   *
   * @throws AccountError si la cuenta no existe o no pertenece al usuario
   */
  static async deactivate(id: number, userId: number) {
    const db = getDb();

    const existing = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .get();

    if (!existing) {
      throw new AccountError('Cuenta no encontrada', 'ACCOUNT_NOT_FOUND');
    }

    const now = new Date().toISOString();

    db.update(accounts)
      .set({ status: 'Inactivo', updatedAt: now })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .run();
  }

  /**
   * Retorna todas las cuentas activas de un usuario.
   */
  static async getActive(userId: number) {
    const db = getDb();

    const result = db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.status, 'Activo')
        )
      )
      .all();

    return result;
  }

  /**
   * Obtiene una cuenta por su ID.
   * Retorna null si no existe.
   */
  static async getById(id: number, userId: number) {
    const db = getDb();

    const result = db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .get();

    return result ?? null;
  }

  /**
   * Calcula el balance actual de una cuenta usando la fórmula:
   * - Cuentas normales (Débito, Inversión, Vales, Efectivo):
   *   balance = initialBalance + Σ(Ingresos) - Σ(Gastos) + Σ(transferencias recibidas) - Σ(transferencias enviadas)
   * - Cuentas de Crédito:
   *   El balance representa el crédito utilizado (deuda). Transferencias recibidas (pagos)
   *   reducen la deuda, y transferencias enviadas (disposiciones) la aumentan.
   *   balance = initialBalance + Σ(Ingresos) - Σ(Gastos) - Σ(transferencias recibidas) + Σ(transferencias enviadas)
   *
   * @throws AccountError si la cuenta no existe
   */
  static async calculateBalance(id: number): Promise<number> {
    const db = getDb();

    // Balance is computed the same for all account types (P4.2 unified formula).
    const account = db
      .select({ initialBalance: accounts.initialBalance })
      .from(accounts)
      .where(eq(accounts.id, id))
      .get();

    if (!account) {
      throw new AccountError('Cuenta no encontrada', 'ACCOUNT_NOT_FOUND');
    }

    // Sumar ingresos
    const incomeResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, id),
          eq(transactions.type, 'Ingreso')
        )
      )
      .get();

    // Sumar gastos
    const expenseResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, id),
          eq(transactions.type, 'Gasto')
        )
      )
      .get();

    // Sumar transferencias recibidas (cuenta es destino). P4.11: usa
    // destination_amount cuando existe (cross-currency), si no el amount origen.
    const transfersInResult = db
      .select({ total: sql<number>`COALESCE(SUM(COALESCE(${transfers.destinationAmount}, ${transfers.amount})), 0)` })
      .from(transfers)
      .where(eq(transfers.destinationAccountId, id))
      .get();

    // Sumar transferencias enviadas (cuenta es origen)
    const transfersOutResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
      .from(transfers)
      .where(eq(transfers.sourceAccountId, id))
      .get();

    const incomes = incomeResult?.total ?? 0;
    const expenses = expenseResult?.total ?? 0;
    const transfersIn = transfersInResult?.total ?? 0;
    const transfersOut = transfersOutResult?.total ?? 0;

    // P4.2: unified formula for ALL account types under the negative-balance =
    // debt convention used everywhere (dashboard/alerts/utilization via
    // Math.abs). A credit card's balance is negative (amount owed); an expense
    // makes it more negative, and a PAYMENT (transfer INTO the card) moves it
    // toward zero (reduces debt). The old credit branch inverted the transfer
    // signs, which double-counted a payment as MORE debt — that bug is removed.
    return roundMoney(account.initialBalance + incomes - expenses + transfersIn - transfersOut);
  }

  /**
   * Valida que no exista otra cuenta activa con el mismo nombre para el usuario.
   * Retorna true si el nombre es único, false si ya existe.
   *
   * @param userId - ID del usuario
   * @param name - Nombre a validar
   * @param excludeId - ID de cuenta a excluir (para edición)
   */
  static async validateUniqueName(
    userId: number,
    name: string,
    excludeId?: number
  ): Promise<boolean> {
    const db = getDb();

    const conditions = [
      eq(accounts.userId, userId),
      eq(accounts.name, name),
      eq(accounts.status, 'Activo'),
    ];

    if (excludeId !== undefined) {
      conditions.push(ne(accounts.id, excludeId));
    }

    const existing = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(...conditions))
      .get();

    return !existing;
  }

  /**
   * Calcula la utilización de crédito de una cuenta de tipo Crédito.
   * Fórmula: |balance| / creditLimit * 100
   *
   * El balance de una cuenta de crédito típicamente es negativo (cargos reducen el saldo),
   * por lo que se usa el valor absoluto del balance calculado.
   *
   * @returns Porcentaje de utilización con hasta 2 decimales
   * @throws AccountError si la cuenta no existe, no es de tipo Crédito, o no tiene límite configurado
   *
   * Requirements: 5.2, 5.6
   */
  static async calculateCreditUtilization(id: number): Promise<number> {
    const db = getDb();

    const account = db
      .select({ type: accounts.type, creditLimit: accounts.creditLimit })
      .from(accounts)
      .where(eq(accounts.id, id))
      .get();

    if (!account) {
      throw new AccountError('Cuenta no encontrada', 'ACCOUNT_NOT_FOUND');
    }

    if (account.type !== 'Crédito') {
      throw new AccountError(
        'La cuenta no es de tipo Crédito',
        'NOT_CREDIT_ACCOUNT'
      );
    }

    if (!account.creditLimit || account.creditLimit <= 0) {
      throw new AccountError(
        'La cuenta de crédito no tiene un límite de crédito válido configurado',
        'NO_CREDIT_LIMIT'
      );
    }

    const balance = await AccountService.calculateBalance(id);
    const utilization = (Math.abs(balance) / account.creditLimit) * 100;

    // Redondear a 2 decimales
    return Math.round(utilization * 100) / 100;
  }

  /**
   * Obtiene el estado de salud crediticia basado en la utilización.
   * - saludable: 0-30%
   * - moderado: 31-70%
   * - crítico: 71-100% o superior
   *
   * @returns Objeto con utilización y estado de salud
   * @throws AccountError si la cuenta no es válida para monitoreo de crédito
   *
   * Requirements: 5.3
   */
  static async getCreditHealthStatus(id: number): Promise<{
    utilization: number;
    status: CreditHealthStatus;
  }> {
    const utilization = await AccountService.calculateCreditUtilization(id);

    let status: CreditHealthStatus;

    if (utilization <= 30) {
      status = 'saludable';
    } else if (utilization <= 70) {
      status = 'moderado';
    } else {
      status = 'crítico';
    }

    return { utilization, status };
  }

  /**
   * Computes the statement summary for a credit account (P4.2): amount owed,
   * available credit, utilization, and the next statement-close / payment-due
   * dates derived from the configured day-of-month. Payment history (incoming
   * transfers) is surfaced separately by the route.
   *
   * @throws AccountError if the account doesn't exist or isn't a credit account.
   */
  static async getCreditStatement(id: number): Promise<{
    creditLimit: number | null;
    owed: number;
    availableCredit: number | null;
    utilization: number | null;
    statementDay: number | null;
    paymentDueDay: number | null;
    apr: number | null;
    minimumPayment: number | null;
    nextStatementDate: string | null;
    nextDueDate: string | null;
  }> {
    const db = getDb();

    const account = db
      .select({
        type: accounts.type,
        creditLimit: accounts.creditLimit,
        statementDay: accounts.statementDay,
        paymentDueDay: accounts.paymentDueDay,
        apr: accounts.apr,
        minimumPayment: accounts.minimumPayment,
      })
      .from(accounts)
      .where(eq(accounts.id, id))
      .get();

    if (!account) {
      throw new AccountError('Cuenta no encontrada', 'ACCOUNT_NOT_FOUND');
    }
    if (account.type !== 'Crédito') {
      throw new AccountError('La cuenta no es de tipo Crédito', 'NOT_CREDIT_ACCOUNT');
    }

    const balance = await AccountService.calculateBalance(id);
    // Under the negative-balance convention, owed = the negative part of the
    // balance (a positive/zero balance means nothing is owed).
    const owed = roundMoney(Math.max(0, -balance));
    const availableCredit = account.creditLimit != null
      ? roundMoney(Math.max(0, account.creditLimit - owed))
      : null;
    const utilization = account.creditLimit && account.creditLimit > 0
      ? Math.round((owed / account.creditLimit) * 10000) / 100
      : null;

    return {
      creditLimit: account.creditLimit ?? null,
      owed,
      availableCredit,
      utilization,
      statementDay: account.statementDay ?? null,
      paymentDueDay: account.paymentDueDay ?? null,
      apr: account.apr ?? null,
      minimumPayment: account.minimumPayment ?? null,
      nextStatementDate: AccountService.nextDateForDayOfMonth(account.statementDay ?? null),
      nextDueDate: AccountService.nextDateForDayOfMonth(account.paymentDueDay ?? null),
    };
  }

  /**
   * Given a day-of-month (1–31), returns the next occurrence as YYYY-MM-DD (today
   * if it matches, else this month or next), clamped to the month's length.
   * Returns null when no day is configured.
   */
  static nextDateForDayOfMonth(day: number | null): string | null {
    if (day == null) return null;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const today = now.getDate();
    // Clamp the target day to the number of days in the candidate month.
    const clamp = (year: number, month: number) => {
      const last = new Date(year, month + 1, 0).getDate();
      return Math.min(day, last);
    };
    let targetY = y;
    let targetM = m;
    if (clamp(y, m) < today) {
      // This month's occurrence already passed → roll to next month.
      targetM = m + 1;
      if (targetM > 11) { targetM = 0; targetY = y + 1; }
    }
    const d = clamp(targetY, targetM);
    return `${targetY}-${String(targetM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  /**
   * Returns the payment history of a credit account (P4.2): transfers INTO this
   * account (i.e. payments toward the card), newest first, scoped by user.
   */
  static getCreditPayments(id: number, userId: number) {
    const db = getDb();
    return db
      .select({
        id: transfers.id,
        name: transfers.name,
        amount: transfers.amount,
        date: transfers.date,
        sourceAccountId: transfers.sourceAccountId,
      })
      .from(transfers)
      .where(and(eq(transfers.destinationAccountId, id), eq(transfers.userId, userId)))
      .orderBy(desc(transfers.date))
      .all();
  }

  /**
   * Obtiene las suscripciones vinculadas a una cuenta de crédito,
   * consultando la tabla de enlace creditSubscriptions.
   * Incluye información de días restantes para el próximo cobro.
   *
   * @returns Lista de suscripciones vinculadas con sus días restantes
   * @throws AccountError si la cuenta no existe
   *
   * Requirements: 5.5
   */
  static async getLinkedSubscriptions(id: number): Promise<Array<{
    id: number;
    name: string;
    amount: number;
    cycle: 'Semanal' | 'Mensual';
    nextPaymentDate: string;
    daysRemaining: number;
    status: 'Activa' | 'Inactiva';
  }>> {
    const db = getDb();

    // Verificar que la cuenta existe
    const account = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, id))
      .get();

    if (!account) {
      throw new AccountError('Cuenta no encontrada', 'ACCOUNT_NOT_FOUND');
    }

    // Consultar suscripciones vinculadas via la tabla de enlace creditSubscriptions
    const linkedSubs = db
      .select({
        id: subscriptions.id,
        name: subscriptions.name,
        amount: subscriptions.amount,
        cycle: subscriptions.cycle,
        nextPaymentDate: subscriptions.nextPaymentDate,
        status: subscriptions.status,
      })
      .from(creditSubscriptions)
      .innerJoin(subscriptions, eq(creditSubscriptions.subscriptionId, subscriptions.id))
      .where(eq(creditSubscriptions.accountId, id))
      .all();

    // Calcular días restantes para cada suscripción
    return linkedSubs.map((sub) => ({
      ...sub,
      daysRemaining: AccountService.calculateDaysRemaining(sub.nextPaymentDate),
    }));
  }

  /**
   * Calcula los días restantes hasta la próxima fecha de pago.
   * Retorna 0 si la fecha es hoy, negativo si está vencida.
   */
  private static calculateDaysRemaining(nextPaymentDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse the date string as local date to avoid timezone issues
    const parts = nextPaymentDate.split('T')[0]!.split('-');
    const paymentDate = new Date(
      parseInt(parts[0]!, 10),
      parseInt(parts[1]!, 10) - 1,
      parseInt(parts[2]!, 10)
    );
    paymentDate.setHours(0, 0, 0, 0);

    const diffMs = paymentDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}
