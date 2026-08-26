import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { loans, loanPayments } from '../db/schema.js';
import type { CreateLoanSchema, UpdateLoanSchema, RecordPaymentSchema } from '../validators/loan.schema.js';

/**
 * Error personalizado para operaciones de préstamos.
 * Incluye mensajes en español para la interfaz de usuario.
 */
export class LoanError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'LoanError';
    this.code = code;
  }
}

/**
 * Interfaz para cada fila de la tabla de amortización.
 */
export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

/**
 * Servicio de gestión de préstamos.
 * Implementa CRUD para préstamos, registro de pagos con tracking de saldo restante,
 * y generación de tabla de amortización.
 *
 * - create(): inserta préstamo con remainingAmount = principal
 * - recordPayment(): inserta pago, reduce remainingAmount por la porción de capital, status='paid' cuando remainingAmount <= 0
 * - generateSchedule(): calcula tabla de amortización basada en principal, tasa de interés y plazo (meses)
 */
export class LoanService {
  /**
   * Crea un nuevo préstamo para el usuario.
   * El remainingAmount se inicializa al valor del principal.
   */
  static create(userId: number, input: CreateLoanSchema) {
    const db = getDb();

    const now = new Date().toISOString();

    const result = db
      .insert(loans)
      .values({
        userId,
        name: input.name,
        principal: input.principal,
        interestRate: input.interestRate,
        term: input.term,
        remainingAmount: input.principal,
        startDate: input.startDate,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return result;
  }

  /**
   * Actualiza un préstamo existente.
   *
   * @throws LoanError si el préstamo no existe o ya está pagado
   */
  static update(id: number, userId: number, input: UpdateLoanSchema) {
    const db = getDb();

    const existing = db
      .select()
      .from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, userId)))
      .get();

    if (!existing) {
      throw new LoanError('Préstamo no encontrado', 'LOAN_NOT_FOUND');
    }

    if (existing.status === 'paid') {
      throw new LoanError(
        'No se puede modificar un préstamo que ya fue pagado',
        'LOAN_ALREADY_PAID'
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }

    if (input.interestRate !== undefined) {
      updateData['interestRate'] = input.interestRate;
    }

    if (input.term !== undefined) {
      updateData['term'] = input.term;
    }

    if (input.startDate !== undefined) {
      updateData['startDate'] = input.startDate;
    }

    const result = db
      .update(loans)
      .set(updateData)
      .where(eq(loans.id, id))
      .returning()
      .get();

    return result;
  }

  /**
   * Registra un pago para un préstamo.
   * - Inserta el registro de pago en loanPayments
   * - Reduce remainingAmount por la porción de capital
   * - Si remainingAmount <= 0, cambia el status a 'paid'
   *
   * @throws LoanError si el préstamo no existe, ya está pagado, o el pago es inválido
   */
  static recordPayment(id: number, userId: number, input: RecordPaymentSchema) {
    const db = getDb();

    const loan = db
      .select()
      .from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, userId)))
      .get();

    if (!loan) {
      throw new LoanError('Préstamo no encontrado', 'LOAN_NOT_FOUND');
    }

    if (loan.status === 'paid') {
      throw new LoanError(
        'No se pueden registrar pagos en un préstamo ya liquidado',
        'LOAN_ALREADY_PAID'
      );
    }

    // Validar que la suma de principal + interest sea coherente con el monto total
    const sumParts = Math.round((input.principal + input.interest) * 100) / 100;
    const totalAmount = Math.round(input.amount * 100) / 100;
    if (Math.abs(sumParts - totalAmount) > 0.01) {
      throw new LoanError(
        'La suma de capital e interés debe ser igual al monto total del pago',
        'PAYMENT_AMOUNT_MISMATCH'
      );
    }

    const now = new Date().toISOString();

    // Insertar el registro de pago
    const payment = db
      .insert(loanPayments)
      .values({
        loanId: id,
        amount: input.amount,
        principal: input.principal,
        interest: input.interest,
        date: input.date,
        createdAt: now,
      })
      .returning()
      .get();

    // Reducir el monto restante por la porción de capital
    const newRemaining = Math.round((loan.remainingAmount - input.principal) * 100) / 100;
    const newStatus = newRemaining <= 0 ? 'paid' : 'active';

    db.update(loans)
      .set({
        remainingAmount: Math.max(newRemaining, 0),
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(loans.id, id))
      .run();

    // Obtener el préstamo actualizado
    const updatedLoan = db
      .select()
      .from(loans)
      .where(eq(loans.id, id))
      .get();

    return {
      payment,
      loan: updatedLoan,
    };
  }

  /**
   * Genera la tabla de amortización para un préstamo.
   * Usa el método de amortización francesa (cuota fija).
   *
   * Fórmula de cuota mensual:
   *   M = P * [r(1+r)^n] / [(1+r)^n - 1]
   * donde:
   *   P = principal
   *   r = tasa de interés mensual (interestRate / 100 / 12)
   *   n = número de meses (term)
   *
   * Si la tasa de interés es 0, la cuota es simplemente principal / term.
   *
   * @throws LoanError si el préstamo no existe
   */
  static generateSchedule(id: number, userId: number): AmortizationRow[] {
    const db = getDb();

    const loan = db
      .select()
      .from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, userId)))
      .get();

    if (!loan) {
      throw new LoanError('Préstamo no encontrado', 'LOAN_NOT_FOUND');
    }

    return LoanService.calculateAmortizationSchedule(
      loan.principal,
      loan.interestRate,
      loan.term
    );
  }

  /**
   * Calcula la tabla de amortización dado el principal, tasa y plazo.
   * Función pura, útil para testing y reutilización.
   */
  static calculateAmortizationSchedule(
    principal: number,
    annualRate: number,
    termMonths: number
  ): AmortizationRow[] {
    const schedule: AmortizationRow[] = [];
    const monthlyRate = annualRate / 100 / 12;

    let monthlyPayment: number;

    if (monthlyRate === 0) {
      // Sin interés, cuota simple
      monthlyPayment = principal / termMonths;
    } else {
      // Fórmula de amortización francesa
      const factor = Math.pow(1 + monthlyRate, termMonths);
      monthlyPayment = principal * (monthlyRate * factor) / (factor - 1);
    }

    let remainingBalance = principal;

    for (let month = 1; month <= termMonths; month++) {
      const interestPortion = remainingBalance * monthlyRate;
      let principalPortion = monthlyPayment - interestPortion;

      // Última cuota: ajustar para cerrar exactamente
      if (month === termMonths) {
        principalPortion = remainingBalance;
        monthlyPayment = principalPortion + interestPortion;
      }

      remainingBalance -= principalPortion;

      // Evitar valores negativos por redondeo
      if (remainingBalance < 0) {
        remainingBalance = 0;
      }

      schedule.push({
        month,
        payment: Math.round(monthlyPayment * 100) / 100,
        principal: Math.round(principalPortion * 100) / 100,
        interest: Math.round(interestPortion * 100) / 100,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
      });
    }

    return schedule;
  }

  /**
   * Lista todos los préstamos de un usuario.
   */
  static list(userId: number) {
    const db = getDb();

    return db
      .select()
      .from(loans)
      .where(eq(loans.userId, userId))
      .all();
  }

  /**
   * Obtiene un préstamo por ID.
   *
   * @throws LoanError si no existe
   */
  static getById(id: number, userId: number) {
    const db = getDb();

    const loan = db
      .select()
      .from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, userId)))
      .get();

    if (!loan) {
      throw new LoanError('Préstamo no encontrado', 'LOAN_NOT_FOUND');
    }

    return loan;
  }

  /**
   * Lista todos los pagos registrados para un préstamo.
   */
  static listPayments(id: number, userId: number) {
    const db = getDb();

    // Verificar que el préstamo pertenece al usuario
    const loan = db
      .select()
      .from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, userId)))
      .get();

    if (!loan) {
      throw new LoanError('Préstamo no encontrado', 'LOAN_NOT_FOUND');
    }

    return db
      .select()
      .from(loanPayments)
      .where(eq(loanPayments.loanId, id))
      .all();
  }
}
