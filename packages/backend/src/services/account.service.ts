import { eq, and, ne, sql } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { accounts, transactions, transfers, creditSubscriptions, subscriptions } from '../db/schema.js';
import type { CreateAccountSchema, UpdateAccountSchema } from '../validators/account.schema.js';

/**
 * Tipo de estado de salud crediticia.
 */
export type CreditHealthStatus = 'saludable' | 'moderado' | 'crítico';

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
        status: 'Activo',
        currency: input.currency ?? 'MXN',
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
  static async update(id: number, input: UpdateAccountSchema) {
    const db = getDb();

    // Verificar que la cuenta existe
    const existing = db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
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

    const result = db
      .update(accounts)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.bank !== undefined && { bank: input.bank ?? null }),
        ...(input.initialBalance !== undefined && { initialBalance: input.initialBalance }),
        ...(input.balanceLimit !== undefined && { balanceLimit: input.balanceLimit ?? null }),
        ...(input.creditLimit !== undefined && { creditLimit: input.creditLimit ?? null }),
        ...(input.currency !== undefined && { currency: input.currency }),
        updatedAt: now,
      })
      .where(eq(accounts.id, id))
      .returning()
      .get();

    return result;
  }

  /**
   * Desactiva una cuenta cambiando su estado a "Inactivo".
   * Las cuentas inactivas se excluyen del panel principal.
   *
   * @throws AccountError si la cuenta no existe
   */
  static async deactivate(id: number) {
    const db = getDb();

    const existing = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, id))
      .get();

    if (!existing) {
      throw new AccountError('Cuenta no encontrada', 'ACCOUNT_NOT_FOUND');
    }

    const now = new Date().toISOString();

    db.update(accounts)
      .set({ status: 'Inactivo', updatedAt: now })
      .where(eq(accounts.id, id))
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
  static async getById(id: number) {
    const db = getDb();

    const result = db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
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

    // Obtener la cuenta con tipo para determinar la lógica de balance
    const account = db
      .select({ initialBalance: accounts.initialBalance, type: accounts.type })
      .from(accounts)
      .where(eq(accounts.id, id))
      .get();

    if (!account) {
      throw new AccountError('Cuenta no encontrada', 'ACCOUNT_NOT_FOUND');
    }

    const isCredit = account.type === 'Crédito';

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

    // Sumar transferencias recibidas (cuenta es destino)
    const transfersInResult = db
      .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
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

    if (isCredit) {
      // Para cuentas de crédito: recibir una transferencia (pago) reduce la deuda,
      // enviar una transferencia (disposición de crédito) aumenta la deuda.
      return account.initialBalance + incomes - expenses - transfersIn + transfersOut;
    }

    return account.initialBalance + incomes - expenses + transfersIn - transfersOut;
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
