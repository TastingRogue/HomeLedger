import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SubscriptionService, SubscriptionError } from './subscription.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, accounts, categories, subscriptions, transactions } from '../db/schema.js';
import { SubscriptionCycle } from '@smart-finance/shared';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';

process.env['DATA_DIR'] = './data/test-subscription';

/** Helper to get today's local date as YYYY-MM-DD */
function getTodayStr(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Helper to get a future local date as YYYY-MM-DD */
function getFutureDateStr(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Helper to get a past local date as YYYY-MM-DD */
function getPastDateStr(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('SubscriptionService', () => {
  let userId: number;
  let accountId: number;
  let categoryId: number;

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

      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'D�bito',
        bank TEXT,
        initial_balance REAL NOT NULL DEFAULT 0,
        balance_limit REAL,
        credit_limit REAL,
        status TEXT NOT NULL DEFAULT 'Activo',
        currency TEXT NOT NULL DEFAULT 'MXN',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        subcategory_id INTEGER,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        attachment_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON transactions(account_id);

      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        cycle TEXT NOT NULL,
        start_date TEXT NOT NULL,
        next_payment_date TEXT NOT NULL,
        auto_charge INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Activa',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS subscriptions_user_id_status_idx ON subscriptions(user_id, status);
      CREATE INDEX IF NOT EXISTS subscriptions_next_payment_date_idx ON subscriptions(next_payment_date);
    `);
  });

  beforeEach(() => {
    const db = getDb();
    // Clean tables in correct order
    db.delete(transactions).run();
    db.delete(subscriptions).run();
    db.delete(accounts).run();
    db.delete(categories).run();
    db.delete(users).run();

    // Create a test user
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

    // Create an account with balance of 5000
    const account = db
      .insert(accounts)
      .values({
        userId,
        name: 'Cuenta Principal',
        type: 'D�bito',
        initialBalance: 5000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    accountId = account.id;

    // Create a category
    const category = db
      .insert(categories)
      .values({
        userId: null,
        name: 'Entretenimiento',
        isSystem: true,
        createdAt: now,
      })
      .returning()
      .get();
    categoryId = category.id;
  });

  afterAll(() => {
    closeDatabase();
    // Clean up test database
    const dbPath = path.resolve('./data/test-subscription/smart-finance.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    const dir = path.resolve('./data/test-subscription');
    if (fs.existsSync(dir)) fs.rmdirSync(dir);
  });

  describe('create()', () => {
    it('should create a weekly subscription', () => {
      const result = SubscriptionService.create(userId, {
        name: 'Spotify',
        startDate: '2024-01-15',
        amount: 115.00,
        cycle: SubscriptionCycle.Semanal,
        categoryId,
        accountId,
        autoCharge: false,
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Spotify');
      expect(result.amount).toBe(115.00);
      expect(result.cycle).toBe('Semanal');
      expect(result.status).toBe('Activa');
      expect(result.nextPaymentDate).toBe('2024-01-22'); // +7 days
    });

    it('should create a monthly subscription', () => {
      const result = SubscriptionService.create(userId, {
        name: 'Netflix',
        startDate: '2024-01-15',
        amount: 199.00,
        cycle: SubscriptionCycle.Mensual,
        categoryId,
        accountId,
        autoCharge: true,
      });

      expect(result.name).toBe('Netflix');
      expect(result.cycle).toBe('Mensual');
      expect(result.autoCharge).toBe(true);
      expect(result.nextPaymentDate).toBe('2024-02-15'); // +1 month
    });

    it('should reject subscription with non-existent account', () => {
      expect(() =>
        SubscriptionService.create(userId, {
          name: 'Test',
          startDate: '2024-01-15',
          amount: 100,
          cycle: SubscriptionCycle.Mensual,
          categoryId,
          accountId: 99999,
          autoCharge: false,
        })
      ).toThrow(SubscriptionError);
    });

    it('should reject subscription with non-existent category', () => {
      expect(() =>
        SubscriptionService.create(userId, {
          name: 'Test',
          startDate: '2024-01-15',
          amount: 100,
          cycle: SubscriptionCycle.Mensual,
          categoryId: 99999,
          accountId,
          autoCharge: false,
        })
      ).toThrow(SubscriptionError);
    });
  });

  describe('calculateNextPayment()', () => {
    it('should add 7 days for Semanal cycle', () => {
      const result = SubscriptionService.calculateNextPayment(
        '2024-01-15',
        SubscriptionCycle.Semanal
      );
      expect(result).toBe('2024-01-22');
    });

    it('should add 1 month for Mensual cycle', () => {
      const result = SubscriptionService.calculateNextPayment(
        '2024-01-15',
        SubscriptionCycle.Mensual
      );
      expect(result).toBe('2024-02-15');
    });

    it('should clamp day to last day of month (Jan 31 ? Feb 28 in non-leap year)', () => {
      const result = SubscriptionService.calculateNextPayment(
        '2023-01-31',
        SubscriptionCycle.Mensual
      );
      expect(result).toBe('2023-02-28');
    });

    it('should clamp day to last day of month (Jan 31 ? Feb 29 in leap year)', () => {
      const result = SubscriptionService.calculateNextPayment(
        '2024-01-31',
        SubscriptionCycle.Mensual
      );
      expect(result).toBe('2024-02-29');
    });

    it('should handle month transition correctly (Mar 31 ? Apr 30)', () => {
      const result = SubscriptionService.calculateNextPayment(
        '2024-03-31',
        SubscriptionCycle.Mensual
      );
      expect(result).toBe('2024-04-30');
    });

    it('should handle year transition (Dec 15 ? Jan 15)', () => {
      const result = SubscriptionService.calculateNextPayment(
        '2024-12-15',
        SubscriptionCycle.Mensual
      );
      expect(result).toBe('2025-01-15');
    });

    it('should handle week crossing month boundary', () => {
      const result = SubscriptionService.calculateNextPayment(
        '2024-01-28',
        SubscriptionCycle.Semanal
      );
      expect(result).toBe('2024-02-04');
    });
  });

  describe('calculateDaysRemaining()', () => {
    it('should return 0 when payment is due today', () => {
      const todayStr = getTodayStr();
      const result = SubscriptionService.calculateDaysRemaining(todayStr);
      expect(result).toBe(0);
    });

    it('should return positive days for future payment', () => {
      const futureStr = getFutureDateStr(5);
      const result = SubscriptionService.calculateDaysRemaining(futureStr);
      expect(result).toBe(5);
    });

    it('should return negative days for overdue payment', () => {
      const pastStr = getPastDateStr(3);
      const result = SubscriptionService.calculateDaysRemaining(pastStr);
      expect(result).toBe(-3);
    });
  });

  describe('deactivate()', () => {
    it('should deactivate an active subscription', () => {
      const sub = SubscriptionService.create(userId, {
        name: 'Netflix',
        startDate: '2024-01-15',
        amount: 199.00,
        cycle: SubscriptionCycle.Mensual,
        categoryId,
        accountId,
        autoCharge: false,
      });

      const result = SubscriptionService.deactivate(sub.id, userId);
      expect(result!.status).toBe('Inactiva');
    });

    it('should throw when subscription does not exist', () => {
      expect(() => SubscriptionService.deactivate(99999, userId)).toThrow(SubscriptionError);
    });

    it('should throw when subscription is already inactive', () => {
      const sub = SubscriptionService.create(userId, {
        name: 'Netflix',
        startDate: '2024-01-15',
        amount: 199.00,
        cycle: SubscriptionCycle.Mensual,
        categoryId,
        accountId,
        autoCharge: false,
      });

      SubscriptionService.deactivate(sub.id, userId);

      expect(() => SubscriptionService.deactivate(sub.id, userId)).toThrow('ya est� inactiva');
    });
  });

  describe('processAutoCharges()', () => {
    it('should create Gasto transaction for due subscriptions with autoCharge', () => {
      const db = getDb();
      const todayStr = getTodayStr();
      const now = new Date().toISOString();

      // Insert a subscription that is due today with autoCharge
      db.insert(subscriptions)
        .values({
          userId,
          accountId,
          categoryId,
          name: 'Netflix Auto',
          amount: 199.00,
          cycle: 'Mensual',
          startDate: '2024-01-15',
          nextPaymentDate: todayStr,
          autoCharge: true,
          status: 'Activa',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const processed = SubscriptionService.processAutoCharges();
      expect(processed).toBe(1);

      // Verify transaction was created
      const txns = db.select().from(transactions).all();
      expect(txns).toHaveLength(1);
      expect(txns[0]!.name).toBe('Netflix Auto');
      expect(txns[0]!.amount).toBe(199.00);
      expect(txns[0]!.type).toBe('Gasto');

      // Verify account balance was reduced
      const account = db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .get();
      expect(account!.initialBalance).toBe(5000 - 199.00);
    });

    it('should not process subscriptions without autoCharge', () => {
      const db = getDb();
      const todayStr = getTodayStr();
      const now = new Date().toISOString();

      db.insert(subscriptions)
        .values({
          userId,
          accountId,
          categoryId,
          name: 'Manual Sub',
          amount: 100.00,
          cycle: 'Mensual',
          startDate: '2024-01-15',
          nextPaymentDate: todayStr,
          autoCharge: false,
          status: 'Activa',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const processed = SubscriptionService.processAutoCharges();
      expect(processed).toBe(0);
    });

    it('should not process inactive subscriptions', () => {
      const db = getDb();
      const todayStr = getTodayStr();
      const now = new Date().toISOString();

      db.insert(subscriptions)
        .values({
          userId,
          accountId,
          categoryId,
          name: 'Inactive Sub',
          amount: 100.00,
          cycle: 'Mensual',
          startDate: '2024-01-15',
          nextPaymentDate: todayStr,
          autoCharge: true,
          status: 'Inactiva',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const processed = SubscriptionService.processAutoCharges();
      expect(processed).toBe(0);
    });

    it('should allow balance to go negative (Req 4.7)', () => {
      const db = getDb();
      const todayStr = getTodayStr();
      const now = new Date().toISOString();

      // Set account balance to just 50 (less than subscription amount)
      db.update(accounts)
        .set({ initialBalance: 50 })
        .where(eq(accounts.id, accountId))
        .run();

      db.insert(subscriptions)
        .values({
          userId,
          accountId,
          categoryId,
          name: 'Expensive Sub',
          amount: 500.00,
          cycle: 'Mensual',
          startDate: '2024-01-15',
          nextPaymentDate: todayStr,
          autoCharge: true,
          status: 'Activa',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const processed = SubscriptionService.processAutoCharges();
      expect(processed).toBe(1);

      // Verify balance is negative
      const account = db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .get();
      expect(account!.initialBalance).toBe(50 - 500); // -450
    });

    it('should update nextPaymentDate after processing', () => {
      const db = getDb();
      const todayStr = getTodayStr();
      const now = new Date().toISOString();

      db.insert(subscriptions)
        .values({
          userId,
          accountId,
          categoryId,
          name: 'Weekly Sub',
          amount: 50.00,
          cycle: 'Semanal',
          startDate: '2024-01-01',
          nextPaymentDate: todayStr,
          autoCharge: true,
          status: 'Activa',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      SubscriptionService.processAutoCharges();

      // Verify nextPaymentDate was updated to +7 days
      const subs = db.select().from(subscriptions).all();
      const expectedStr = getFutureDateStr(7);
      expect(subs[0]!.nextPaymentDate).toBe(expectedStr);
    });
  });

  describe('getCalendar()', () => {
    it('should return active subscriptions sorted by days remaining ascending', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Create subscriptions with different nextPaymentDates
      const future5 = getFutureDateStr(5);
      const future2 = getFutureDateStr(2);
      const future10 = getFutureDateStr(10);

      db.insert(subscriptions)
        .values([
          {
            userId,
            accountId,
            categoryId,
            name: 'Sub 5 Days',
            amount: 100,
            cycle: 'Mensual',
            startDate: '2024-01-01',
            nextPaymentDate: future5,
            autoCharge: false,
            status: 'Activa',
            createdAt: now,
            updatedAt: now,
          },
          {
            userId,
            accountId,
            categoryId,
            name: 'Sub 2 Days',
            amount: 200,
            cycle: 'Semanal',
            startDate: '2024-01-01',
            nextPaymentDate: future2,
            autoCharge: false,
            status: 'Activa',
            createdAt: now,
            updatedAt: now,
          },
          {
            userId,
            accountId,
            categoryId,
            name: 'Sub 10 Days',
            amount: 300,
            cycle: 'Mensual',
            startDate: '2024-01-01',
            nextPaymentDate: future10,
            autoCharge: false,
            status: 'Activa',
            createdAt: now,
            updatedAt: now,
          },
        ])
        .run();

      const calendar = SubscriptionService.getCalendar(userId);

      expect(calendar).toHaveLength(3);
      expect(calendar[0]!.name).toBe('Sub 2 Days');
      expect(calendar[0]!.daysRemaining).toBe(2);
      expect(calendar[1]!.name).toBe('Sub 5 Days');
      expect(calendar[1]!.daysRemaining).toBe(5);
      expect(calendar[2]!.name).toBe('Sub 10 Days');
      expect(calendar[2]!.daysRemaining).toBe(10);
    });

    it('should exclude inactive subscriptions from calendar', () => {
      const db = getDb();
      const now = new Date().toISOString();
      const future = getFutureDateStr(3);

      db.insert(subscriptions)
        .values([
          {
            userId,
            accountId,
            categoryId,
            name: 'Active Sub',
            amount: 100,
            cycle: 'Mensual',
            startDate: '2024-01-01',
            nextPaymentDate: future,
            autoCharge: false,
            status: 'Activa',
            createdAt: now,
            updatedAt: now,
          },
          {
            userId,
            accountId,
            categoryId,
            name: 'Inactive Sub',
            amount: 200,
            cycle: 'Mensual',
            startDate: '2024-01-01',
            nextPaymentDate: future,
            autoCharge: false,
            status: 'Inactiva',
            createdAt: now,
            updatedAt: now,
          },
        ])
        .run();

      const calendar = SubscriptionService.getCalendar(userId);
      expect(calendar).toHaveLength(1);
      expect(calendar[0]!.name).toBe('Active Sub');
    });

    it('should return empty array when no active subscriptions', () => {
      const calendar = SubscriptionService.getCalendar(userId);
      expect(calendar).toHaveLength(0);
    });
  });

  describe('getById()', () => {
    it('should return a subscription by id', () => {
      const created = SubscriptionService.create(userId, {
        name: 'Find Me',
        startDate: '2024-01-15',
        amount: 99.00,
        cycle: SubscriptionCycle.Mensual,
        categoryId,
        accountId,
        autoCharge: false,
      });

      const found = SubscriptionService.getById(created.id, userId);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Find Me');
    });

    it('should return null for non-existent subscription', () => {
      const found = SubscriptionService.getById(99999, userId);
      expect(found).toBeNull();
    });
  });
});
