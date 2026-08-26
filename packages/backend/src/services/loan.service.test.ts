import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { LoanService, LoanError } from './loan.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, loans, loanPayments } from '../db/schema.js';
import fs from 'node:fs';
import path from 'node:path';

process.env['DATA_DIR'] = './data/test-loan';

describe('LoanService', () => {
  let userId: number;

  beforeAll(() => {
    const sqlite = getSqlite();
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);

      CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        principal REAL NOT NULL,
        interest_rate REAL NOT NULL,
        term INTEGER NOT NULL,
        remaining_amount REAL NOT NULL,
        start_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS loans_user_id_idx ON loans(user_id);
      CREATE INDEX IF NOT EXISTS loans_user_id_status_idx ON loans(user_id, status);

      CREATE TABLE IF NOT EXISTS loan_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        principal REAL NOT NULL,
        interest REAL NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS loan_payments_loan_id_idx ON loan_payments(loan_id);
      CREATE INDEX IF NOT EXISTS loan_payments_date_idx ON loan_payments(date);
    `);
  });

  beforeEach(() => {
    const db = getDb();
    db.delete(loanPayments).run();
    db.delete(loans).run();
    db.delete(users).run();

    const now = new Date().toISOString();
    const user = db
      .insert(users)
      .values({
        email: 'test@test.com',
        passwordHash: 'hashed',
        name: 'Test User',
        role: 'user',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    userId = user.id;
  });

  afterAll(() => {
    closeDatabase();
    const dbPath = path.resolve('./data/test-loan/smart-finance.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    const dir = path.resolve('./data/test-loan');
    if (fs.existsSync(dir)) fs.rmdirSync(dir);
  });

  describe('create()', () => {
    it('should create a loan with remainingAmount equal to principal', () => {
      const result = LoanService.create(userId, {
        name: 'Pr�stamo Auto',
        principal: 200000,
        interestRate: 12,
        term: 48,
        startDate: '2024-01-15',
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Pr�stamo Auto');
      expect(result.principal).toBe(200000);
      expect(result.interestRate).toBe(12);
      expect(result.term).toBe(48);
      expect(result.remainingAmount).toBe(200000);
      expect(result.startDate).toBe('2024-01-15');
      expect(result.status).toBe('active');
    });

    it('should create a loan with 0% interest rate', () => {
      const result = LoanService.create(userId, {
        name: 'Pr�stamo Sin Inter�s',
        principal: 10000,
        interestRate: 0,
        term: 12,
        startDate: '2024-06-01',
      });

      expect(result.interestRate).toBe(0);
      expect(result.remainingAmount).toBe(10000);
    });
  });

  describe('update()', () => {
    it('should update loan name', () => {
      const loan = LoanService.create(userId, {
        name: 'Original',
        principal: 50000,
        interestRate: 10,
        term: 24,
        startDate: '2024-01-01',
      });

      const result = LoanService.update(loan.id, userId, { name: 'Actualizado' });
      expect(result!.name).toBe('Actualizado');
    });

    it('should update interest rate and term', () => {
      const loan = LoanService.create(userId, {
        name: 'Pr�stamo',
        principal: 50000,
        interestRate: 10,
        term: 24,
        startDate: '2024-01-01',
      });

      const result = LoanService.update(loan.id, userId, { interestRate: 8, term: 36 });
      expect(result!.interestRate).toBe(8);
      expect(result!.term).toBe(36);
    });

    it('should throw error for non-existent loan', () => {
      expect(() =>
        LoanService.update(99999, userId, { name: 'No Existe' })
      ).toThrow(LoanError);
    });

    it('should throw error when updating a paid loan', () => {
      const loan = LoanService.create(userId, {
        name: 'Pr�stamo',
        principal: 1000,
        interestRate: 0,
        term: 1,
        startDate: '2024-01-01',
      });

      // Pay it off
      LoanService.recordPayment(loan.id, userId, {
        amount: 1000,
        principal: 1000,
        interest: 0,
        date: '2024-02-01',
      });

      expect(() =>
        LoanService.update(loan.id, userId, { name: 'Nuevo Nombre' })
      ).toThrow('No se puede modificar un pr�stamo que ya fue pagado');
    });
  });

  describe('recordPayment()', () => {
    it('should reduce remainingAmount by the principal portion', () => {
      const loan = LoanService.create(userId, {
        name: 'Pr�stamo Test',
        principal: 10000,
        interestRate: 12,
        term: 12,
        startDate: '2024-01-01',
      });

      const result = LoanService.recordPayment(loan.id, userId, {
        amount: 1000,
        principal: 900,
        interest: 100,
        date: '2024-02-01',
      });

      expect(result.payment.amount).toBe(1000);
      expect(result.payment.principal).toBe(900);
      expect(result.payment.interest).toBe(100);
      expect(result.loan!.remainingAmount).toBe(9100);
      expect(result.loan!.status).toBe('active');
    });

    it('should set status to paid when remainingAmount reaches 0', () => {
      const loan = LoanService.create(userId, {
        name: 'Pr�stamo Peque�o',
        principal: 1000,
        interestRate: 0,
        term: 2,
        startDate: '2024-01-01',
      });

      // First payment
      LoanService.recordPayment(loan.id, userId, {
        amount: 500,
        principal: 500,
        interest: 0,
        date: '2024-02-01',
      });

      // Final payment
      const result = LoanService.recordPayment(loan.id, userId, {
        amount: 500,
        principal: 500,
        interest: 0,
        date: '2024-03-01',
      });

      expect(result.loan!.remainingAmount).toBe(0);
      expect(result.loan!.status).toBe('paid');
    });

    it('should throw error for non-existent loan', () => {
      expect(() =>
        LoanService.recordPayment(99999, userId, {
          amount: 100,
          principal: 90,
          interest: 10,
          date: '2024-02-01',
        })
      ).toThrow(LoanError);
    });

    it('should throw error when paying a fully paid loan', () => {
      const loan = LoanService.create(userId, {
        name: 'Pr�stamo Pagado',
        principal: 500,
        interestRate: 0,
        term: 1,
        startDate: '2024-01-01',
      });

      LoanService.recordPayment(loan.id, userId, {
        amount: 500,
        principal: 500,
        interest: 0,
        date: '2024-02-01',
      });

      expect(() =>
        LoanService.recordPayment(loan.id, userId, {
          amount: 100,
          principal: 100,
          interest: 0,
          date: '2024-03-01',
        })
      ).toThrow('No se pueden registrar pagos en un pr�stamo ya liquidado');
    });

    it('should throw error when principal + interest does not match total', () => {
      const loan = LoanService.create(userId, {
        name: 'Pr�stamo Mismatch',
        principal: 10000,
        interestRate: 12,
        term: 12,
        startDate: '2024-01-01',
      });

      expect(() =>
        LoanService.recordPayment(loan.id, userId, {
          amount: 1000,
          principal: 800,
          interest: 100,
          date: '2024-02-01',
        })
      ).toThrow('La suma de capital e inter�s debe ser igual al monto total del pago');
    });
  });

  describe('generateSchedule()', () => {
    it('should generate a schedule with correct number of months', () => {
      const loan = LoanService.create(userId, {
        name: 'Pr�stamo 12 meses',
        principal: 12000,
        interestRate: 12,
        term: 12,
        startDate: '2024-01-01',
      });

      const schedule = LoanService.generateSchedule(loan.id, userId);

      expect(schedule).toHaveLength(12);
      expect(schedule[0]!.month).toBe(1);
      expect(schedule[11]!.month).toBe(12);
    });

    it('should have last row with remainingBalance of 0', () => {
      const loan = LoanService.create(userId, {
        name: 'Pr�stamo Amortizaci�n',
        principal: 100000,
        interestRate: 10,
        term: 24,
        startDate: '2024-01-01',
      });

      const schedule = LoanService.generateSchedule(loan.id, userId);

      expect(schedule[schedule.length - 1]!.remainingBalance).toBe(0);
    });

    it('should work with 0% interest rate', () => {
      const loan = LoanService.create(userId, {
        name: 'Sin Inter�s',
        principal: 12000,
        interestRate: 0,
        term: 12,
        startDate: '2024-01-01',
      });

      const schedule = LoanService.generateSchedule(loan.id, userId);

      expect(schedule).toHaveLength(12);
      // Each payment should be exactly 1000
      for (const row of schedule) {
        expect(row.interest).toBe(0);
        expect(row.principal).toBe(1000);
        expect(row.payment).toBe(1000);
      }
      expect(schedule[11]!.remainingBalance).toBe(0);
    });

    it('should throw error for non-existent loan', () => {
      expect(() =>
        LoanService.generateSchedule(99999, userId)
      ).toThrow(LoanError);
    });

    it('should have decreasing interest and increasing principal portions', () => {
      const loan = LoanService.create(userId, {
        name: 'Amortizaci�n Francesa',
        principal: 100000,
        interestRate: 12,
        term: 12,
        startDate: '2024-01-01',
      });

      const schedule = LoanService.generateSchedule(loan.id, userId);

      // In French amortization, interest decreases over time
      for (let i = 1; i < schedule.length - 1; i++) {
        expect(schedule[i]!.interest).toBeLessThanOrEqual(schedule[i - 1]!.interest);
        expect(schedule[i]!.principal).toBeGreaterThanOrEqual(schedule[i - 1]!.principal);
      }
    });
  });

  describe('calculateAmortizationSchedule() - pure function', () => {
    it('should correctly calculate for known values', () => {
      // 10,000 at 12% annual for 12 months
      const schedule = LoanService.calculateAmortizationSchedule(10000, 12, 12);

      expect(schedule).toHaveLength(12);
      // First month interest = 10000 * 0.01 = 100
      expect(schedule[0]!.interest).toBe(100);
      // Total of all payments � principal + total interest
      const totalPaid = schedule.reduce((sum, row) => sum + row.payment, 0);
      expect(totalPaid).toBeGreaterThan(10000);
      // Last balance should be 0
      expect(schedule[11]!.remainingBalance).toBe(0);
    });
  });

  describe('list()', () => {
    it('should return all loans for a user', () => {
      LoanService.create(userId, {
        name: 'Pr�stamo 1',
        principal: 10000,
        interestRate: 10,
        term: 12,
        startDate: '2024-01-01',
      });
      LoanService.create(userId, {
        name: 'Pr�stamo 2',
        principal: 20000,
        interestRate: 8,
        term: 24,
        startDate: '2024-06-01',
      });

      const result = LoanService.list(userId);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no loans exist', () => {
      const result = LoanService.list(userId);
      expect(result).toHaveLength(0);
    });
  });

  describe('getById()', () => {
    it('should return a loan by id', () => {
      const created = LoanService.create(userId, {
        name: 'Find Me',
        principal: 5000,
        interestRate: 5,
        term: 6,
        startDate: '2024-01-01',
      });

      const found = LoanService.getById(created.id, userId);
      expect(found.name).toBe('Find Me');
      expect(found.principal).toBe(5000);
    });

    it('should throw error for non-existent loan', () => {
      expect(() =>
        LoanService.getById(99999, userId)
      ).toThrow(LoanError);
    });
  });

  describe('listPayments()', () => {
    it('should return all payments for a loan', () => {
      const loan = LoanService.create(userId, {
        name: 'Pr�stamo Pagos',
        principal: 3000,
        interestRate: 0,
        term: 3,
        startDate: '2024-01-01',
      });

      LoanService.recordPayment(loan.id, userId, {
        amount: 1000, principal: 1000, interest: 0, date: '2024-02-01',
      });
      LoanService.recordPayment(loan.id, userId, {
        amount: 1000, principal: 1000, interest: 0, date: '2024-03-01',
      });

      const payments = LoanService.listPayments(loan.id, userId);
      expect(payments).toHaveLength(2);
    });

    it('should throw error for non-existent loan', () => {
      expect(() =>
        LoanService.listPayments(99999, userId)
      ).toThrow(LoanError);
    });
  });
});
