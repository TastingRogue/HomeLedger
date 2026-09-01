import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TransactionService, TransactionError } from './transaction.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, accounts, categories, transactions, transactionSplits } from '../db/schema.js';
import { TransactionType } from '@smart-finance/shared';

// Set test environment variables
process.env['DATA_DIR'] = './data/test-transaction';
process.env['JWT_SECRET'] = 'test-secret';

describe('TransactionService', () => {
  let testUserId: number;
  let testAccountId: number;
  let testCategoryId: number;
  let testCategory2Id: number;

  beforeAll(() => {
    const sqlite = getSqlite();

    // Create all required tables
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
        type TEXT NOT NULL,
        bank TEXT,
        initial_balance REAL NOT NULL DEFAULT 0,
        balance_limit REAL,
        credit_limit REAL,
        status TEXT NOT NULL DEFAULT 'Activo',
        currency TEXT NOT NULL DEFAULT 'MXN',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        type TEXT NOT NULL DEFAULT 'Ambos',
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

      CREATE TABLE IF NOT EXISTS transaction_splits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        amount REAL NOT NULL,
        note TEXT
      );
    `);
  });

  beforeEach(() => {
    const db = getDb();
    // Clean all tables before each test
    db.delete(transactionSplits).run();
    db.delete(transactions).run();
    db.delete(accounts).run();
    db.delete(categories).run();
    db.delete(users).run();

    const now = new Date().toISOString();

    // Create test user
    const user = db.insert(users).values({
      email: 'test@example.com',
      passwordHash: 'hashed',
      name: 'Test User',
      role: 'user',
      createdAt: now,
      updatedAt: now,
    }).returning().get();
    testUserId = user.id;

    // Create test account with balance of 10000
    const account = db.insert(accounts).values({
      userId: testUserId,
      name: 'Santander',
      type: 'D�bito',
      initialBalance: 10000,
      status: 'Activo',
      currency: 'MXN',
      createdAt: now,
      updatedAt: now,
    }).returning().get();
    testAccountId = account.id;

    // Create test categories
    const cat1 = db.insert(categories).values({
      userId: testUserId,
      name: 'Comida',
      isSystem: true,
      createdAt: now,
    }).returning().get();
    testCategoryId = cat1.id;

    const cat2 = db.insert(categories).values({
      userId: testUserId,
      name: 'Transporte',
      isSystem: true,
      createdAt: now,
    }).returning().get();
    testCategory2Id = cat2.id;
  });

  afterAll(() => {
    closeDatabase();
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.resolve('./data/test-transaction/smart-finance.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    const dir = path.resolve('./data/test-transaction');
    if (fs.existsSync(dir)) fs.rmdirSync(dir);
  });

  // =========================================
  // create()
  // =========================================

  describe('create()', () => {
    it('debe crear una transacci�n de tipo Gasto y restar el monto del balance', () => {
      const db = getDb();

      const result = TransactionService.create(testUserId, {
        name: 'Almuerzo',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 150.50,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Almuerzo');
      expect(result.amount).toBe(150.50);
      expect(result.type).toBe('Gasto');

      // Verify balance was subtracted
      const account = db.select().from(accounts).where(require('drizzle-orm').eq(accounts.id, testAccountId)).get();
      expect(account!.initialBalance).toBeCloseTo(10000 - 150.50, 2);
    });

    it('debe crear una transacci�n de tipo Ingreso y sumar el monto al balance', () => {
      const db = getDb();

      const result = TransactionService.create(testUserId, {
        name: 'N�mina',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 25000.00,
        type: TransactionType.Ingreso,
        date: '2024-01-15T12:00:00',
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('Ingreso');

      // Verify balance was added
      const account = db.select().from(accounts).where(require('drizzle-orm').eq(accounts.id, testAccountId)).get();
      expect(account!.initialBalance).toBeCloseTo(10000 + 25000, 2);
    });

    it('debe lanzar error si la cuenta no existe', () => {
      expect(() => TransactionService.create(testUserId, {
        name: 'Test',
        accountId: 99999,
        categoryId: testCategoryId,
        amount: 100.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      })).toThrow(TransactionError);
    });

    it('debe lanzar error si la categor�a no existe', () => {
      expect(() => TransactionService.create(testUserId, {
        name: 'Test',
        accountId: testAccountId,
        categoryId: 99999,
        amount: 100.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      })).toThrow(TransactionError);
    });
  });

  // =========================================
  // update()
  // =========================================

  describe('update()', () => {
    it('debe revertir el efecto anterior y aplicar el nuevo al cambiar monto', () => {
      const db = getDb();

      // Create initial transaction (Gasto 200)
      const tx = TransactionService.create(testUserId, {
        name: 'Uber',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 200.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      });
      // Balance should be 10000 - 200 = 9800

      // Update amount to 300
      const updated = TransactionService.update(tx.id, testUserId, {
        amount: 300.00,
      });

      expect(updated!.amount).toBe(300.00);

      // Balance should be: 9800 + 200 (revert) - 300 (new effect) = 9700
      const account = db.select().from(accounts).where(require('drizzle-orm').eq(accounts.id, testAccountId)).get();
      expect(account!.initialBalance).toBeCloseTo(10000 - 300, 2);
    });

    it('debe manejar cambio de tipo de Gasto a Ingreso', () => {
      const db = getDb();

      const tx = TransactionService.create(testUserId, {
        name: 'Reembolso',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 500.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      });
      // Balance: 10000 - 500 = 9500

      // Change to Ingreso
      TransactionService.update(tx.id, testUserId, {
        type: TransactionType.Ingreso,
      });

      // Balance: 9500 + 500 (revert Gasto) + 500 (apply Ingreso) = 10500
      const account = db.select().from(accounts).where(require('drizzle-orm').eq(accounts.id, testAccountId)).get();
      expect(account!.initialBalance).toBeCloseTo(10000 + 500, 2);
    });

    it('debe manejar cambio de cuenta asociada', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Create second account
      const account2 = db.insert(accounts).values({
        userId: testUserId,
        name: 'Nu',
        type: 'D�bito',
        initialBalance: 5000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      // Create transaction on first account (Gasto 300)
      const tx = TransactionService.create(testUserId, {
        name: 'Compras',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 300.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      });
      // Account 1 balance: 10000 - 300 = 9700

      // Move to second account
      TransactionService.update(tx.id, testUserId, {
        accountId: account2.id,
      });

      // Account 1: 9700 + 300 (revert) = 10000
      const acc1 = db.select().from(accounts).where(require('drizzle-orm').eq(accounts.id, testAccountId)).get();
      expect(acc1!.initialBalance).toBeCloseTo(10000, 2);

      // Account 2: 5000 - 300 (apply Gasto to new) = 4700
      const acc2 = db.select().from(accounts).where(require('drizzle-orm').eq(accounts.id, account2.id)).get();
      expect(acc2!.initialBalance).toBeCloseTo(4700, 2);
    });

    it('debe lanzar error si la transacci�n no existe', () => {
      expect(() => TransactionService.update(99999, testUserId, {
        amount: 100.00,
      })).toThrow(TransactionError);
    });
  });

  // =========================================
  // delete()
  // =========================================

  describe('delete()', () => {
    it('debe revertir el efecto de un Gasto al eliminar', () => {
      const db = getDb();

      const tx = TransactionService.create(testUserId, {
        name: 'Caf�',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 85.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      });
      // Balance: 10000 - 85 = 9915

      TransactionService.delete(tx.id, testUserId);

      // Balance should be restored: 9915 + 85 = 10000
      const account = db.select().from(accounts).where(require('drizzle-orm').eq(accounts.id, testAccountId)).get();
      expect(account!.initialBalance).toBeCloseTo(10000, 2);
    });

    it('debe revertir el efecto de un Ingreso al eliminar', () => {
      const db = getDb();

      const tx = TransactionService.create(testUserId, {
        name: 'Dividendo',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 1500.00,
        type: TransactionType.Ingreso,
        date: '2024-01-15T12:00:00',
      });
      // Balance: 10000 + 1500 = 11500

      TransactionService.delete(tx.id, testUserId);

      // Balance should be restored: 11500 - 1500 = 10000
      const account = db.select().from(accounts).where(require('drizzle-orm').eq(accounts.id, testAccountId)).get();
      expect(account!.initialBalance).toBeCloseTo(10000, 2);
    });

    it('debe lanzar error si la transacci�n no existe', () => {
      expect(() => TransactionService.delete(99999, testUserId)).toThrow(TransactionError);
    });
  });

  // =========================================
  // list()
  // =========================================

  describe('list()', () => {
    it('debe retornar transacciones paginadas ordenadas por fecha desc', () => {
      // Create multiple transactions
      TransactionService.create(testUserId, {
        name: 'Tx1',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 100.00,
        type: TransactionType.Gasto,
        date: '2024-01-10T10:00:00',
      });
      TransactionService.create(testUserId, {
        name: 'Tx2',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 200.00,
        type: TransactionType.Ingreso,
        date: '2024-01-15T10:00:00',
      });
      TransactionService.create(testUserId, {
        name: 'Tx3',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 300.00,
        type: TransactionType.Gasto,
        date: '2024-01-20T10:00:00',
      });

      const result = TransactionService.list(testUserId, { page: 1, pageSize: 10 });

      expect(result.total).toBe(3);
      expect(result.items.length).toBe(3);
      // Ordered by date desc
      expect(result.items[0]!.name).toBe('Tx3');
      expect(result.items[1]!.name).toBe('Tx2');
      expect(result.items[2]!.name).toBe('Tx1');
    });

    it('debe filtrar por tipo de transacci�n', () => {
      TransactionService.create(testUserId, {
        name: 'Gasto1',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 50.00,
        type: TransactionType.Gasto,
        date: '2024-01-10T10:00:00',
      });
      TransactionService.create(testUserId, {
        name: 'Ingreso1',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 100.00,
        type: TransactionType.Ingreso,
        date: '2024-01-11T10:00:00',
      });

      const result = TransactionService.list(testUserId, {
        type: TransactionType.Gasto,
      });

      expect(result.total).toBe(1);
      expect(result.items[0]!.name).toBe('Gasto1');
    });

    it('debe filtrar por rango de fechas', () => {
      TransactionService.create(testUserId, {
        name: 'Enero',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 50.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T10:00:00',
      });
      TransactionService.create(testUserId, {
        name: 'Febrero',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 50.00,
        type: TransactionType.Gasto,
        date: '2024-02-15T10:00:00',
      });

      const result = TransactionService.list(testUserId, {
        startDate: '2024-02-01',
        endDate: '2024-02-28',
      });

      expect(result.total).toBe(1);
      expect(result.items[0]!.name).toBe('Febrero');
    });

    it('debe respetar la paginaci�n', () => {
      for (let i = 1; i <= 5; i++) {
        TransactionService.create(testUserId, {
          name: `Tx${i}`,
          accountId: testAccountId,
          categoryId: testCategoryId,
          amount: 10.00,
          type: TransactionType.Gasto,
          date: `2024-01-${String(i).padStart(2, '0')}T10:00:00`,
        });
      }

      const page1 = TransactionService.list(testUserId, { page: 1, pageSize: 2 });
      expect(page1.items.length).toBe(2);
      expect(page1.total).toBe(5);
      expect(page1.totalPages).toBe(3);
      expect(page1.hasNext).toBe(true);
      expect(page1.hasPrevious).toBe(false);

      const page2 = TransactionService.list(testUserId, { page: 2, pageSize: 2 });
      expect(page2.items.length).toBe(2);
      expect(page2.hasPrevious).toBe(true);
    });
  });

  // =========================================
  // quickCreate()
  // =========================================

  describe('quickCreate()', () => {
    it('debe usar el nombre de la categor�a como nombre de la transacci�n', () => {
      const result = TransactionService.quickCreate(testUserId, {
        amount: 250.00,
        accountId: testAccountId,
        categoryId: testCategoryId,
        type: TransactionType.Gasto,
      });

      expect(result.name).toBe('Comida');
    });

    it('debe auto-completar la fecha con zona horaria CST', () => {
      const result = TransactionService.quickCreate(testUserId, {
        amount: 100.00,
        accountId: testAccountId,
        categoryId: testCategoryId,
        type: TransactionType.Gasto,
      });

      // Date should be populated (not empty)
      expect(result.date).toBeTruthy();
      // Should be in a date-time format
      expect(result.date).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('debe usar Gasto como tipo por defecto', () => {
      const result = TransactionService.quickCreate(testUserId, {
        amount: 50.00,
        accountId: testAccountId,
        categoryId: testCategoryId,
      });

      expect(result.type).toBe('Gasto');
    });

    it('debe actualizar el balance de la cuenta', () => {
      const db = getDb();

      TransactionService.quickCreate(testUserId, {
        amount: 200.00,
        accountId: testAccountId,
        categoryId: testCategoryId,
        type: TransactionType.Gasto,
      });

      const account = db.select().from(accounts).where(require('drizzle-orm').eq(accounts.id, testAccountId)).get();
      expect(account!.initialBalance).toBeCloseTo(10000 - 200, 2);
    });
  });

  // =========================================
  // split()
  // =========================================

  describe('split()', () => {
    it('debe dividir una transacci�n en splits correctamente', () => {
      const tx = TransactionService.create(testUserId, {
        name: 'Supermercado',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 500.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      });

      const splits = TransactionService.split(tx.id, testUserId, [
        { categoryId: testCategoryId, amount: 300.00, note: 'Comida' },
        { categoryId: testCategory2Id, amount: 200.00, note: 'Transporte' },
      ]);

      expect(splits).toHaveLength(2);
      expect(splits[0]!.amount).toBe(300.00);
      expect(splits[1]!.amount).toBe(200.00);
    });

    it('debe lanzar error si la suma de splits no es igual al monto', () => {
      const tx = TransactionService.create(testUserId, {
        name: 'Compras',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 1000.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      });

      expect(() => TransactionService.split(tx.id, testUserId, [
        { categoryId: testCategoryId, amount: 600.00 },
        { categoryId: testCategory2Id, amount: 300.00 },
      ])).toThrow(TransactionError);
    });

    it('debe lanzar error si no hay splits', () => {
      const tx = TransactionService.create(testUserId, {
        name: 'Compras',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 100.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      });

      expect(() => TransactionService.split(tx.id, testUserId, []))
        .toThrow(TransactionError);
    });

    it('debe reemplazar splits existentes al dividir de nuevo', () => {
      const tx = TransactionService.create(testUserId, {
        name: 'Mixto',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 400.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      });

      // First split
      TransactionService.split(tx.id, testUserId, [
        { categoryId: testCategoryId, amount: 200.00 },
        { categoryId: testCategory2Id, amount: 200.00 },
      ]);

      // Re-split with different distribution
      const newSplits = TransactionService.split(tx.id, testUserId, [
        { categoryId: testCategoryId, amount: 100.00 },
        { categoryId: testCategory2Id, amount: 300.00 },
      ]);

      expect(newSplits).toHaveLength(2);
      expect(newSplits[0]!.amount).toBe(100.00);
      expect(newSplits[1]!.amount).toBe(300.00);
    });
  });

  // =========================================
  // getById()
  // =========================================

  describe('getById()', () => {
    it('debe retornar la transacci�n con sus splits', () => {
      const tx = TransactionService.create(testUserId, {
        name: 'Con Splits',
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: 600.00,
        type: TransactionType.Gasto,
        date: '2024-01-15T12:00:00',
      });

      TransactionService.split(tx.id, testUserId, [
        { categoryId: testCategoryId, amount: 400.00 },
        { categoryId: testCategory2Id, amount: 200.00 },
      ]);

      const result = TransactionService.getById(tx.id, testUserId);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Con Splits');
      expect(result!.splits).toHaveLength(2);
    });

    it('debe retornar null si la transacci�n no existe', () => {
      const result = TransactionService.getById(99999, testUserId);
      expect(result).toBeNull();
    });
  });
});
