import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { BackupService, BackupError } from './backup.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, accounts, transactions, categories, goals } from '../db/schema.js';
import fs from 'node:fs';
import path from 'node:path';

process.env['DATA_DIR'] = './data/test-backup';

describe('BackupService', () => {
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
      CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);
      CREATE INDEX IF NOT EXISTS accounts_user_id_status_idx ON accounts(user_id, status);

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id);

      CREATE TABLE IF NOT EXISTS subcategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS subcategories_category_id_idx ON subcategories(category_id);

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        attachment_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS transactions_category_id_idx ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date);

      CREATE TABLE IF NOT EXISTS transaction_splits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        amount REAL NOT NULL,
        note TEXT
      );
      CREATE INDEX IF NOT EXISTS transaction_splits_transaction_id_idx ON transaction_splits(transaction_id);

      CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        destination_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS transfers_user_id_idx ON transfers(user_id);

      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        period TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS budgets_user_id_idx ON budgets(user_id);

      CREATE TABLE IF NOT EXISTS budget_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        allocated REAL NOT NULL,
        rollover REAL NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS budget_categories_budget_id_idx ON budget_categories(budget_id);

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

      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        frequency TEXT NOT NULL,
        next_date TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS recurring_transactions_user_id_idx ON recurring_transactions(user_id);

      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        saved_amount REAL NOT NULL DEFAULT 0,
        type TEXT NOT NULL,
        deadline TEXT,
        status TEXT NOT NULL DEFAULT 'Activa',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals(user_id);

      CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        conditions TEXT NOT NULL,
        actions TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        match_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS rules_user_id_idx ON rules(user_id);

      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL,
        data TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS alerts_hash_unique ON alerts(hash);
      CREATE INDEX IF NOT EXISTS alerts_user_id_idx ON alerts(user_id);

      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        type TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS assets_user_id_idx ON assets(user_id);

      CREATE TABLE IF NOT EXISTS liabilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        balance REAL NOT NULL,
        type TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS liabilities_user_id_idx ON liabilities(user_id);

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

      CREATE TABLE IF NOT EXISTS networth_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_assets REAL NOT NULL,
        total_liabilities REAL NOT NULL,
        net_worth REAL NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS networth_snapshots_user_id_idx ON networth_snapshots(user_id);

      CREATE TABLE IF NOT EXISTS credit_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS credit_subscriptions_account_id_idx ON credit_subscriptions(account_id);
    `);
  });

  beforeEach(() => {
    const db = getDb();
    const sqlite = getSqlite();
    // Clean all tables
    sqlite.exec(`
      DELETE FROM credit_subscriptions;
      DELETE FROM loan_payments;
      DELETE FROM networth_snapshots;
      DELETE FROM transaction_splits;
      DELETE FROM budget_categories;
      DELETE FROM subcategories;
      DELETE FROM transactions;
      DELETE FROM transfers;
      DELETE FROM subscriptions;
      DELETE FROM recurring_transactions;
      DELETE FROM budgets;
      DELETE FROM goals;
      DELETE FROM rules;
      DELETE FROM alerts;
      DELETE FROM assets;
      DELETE FROM liabilities;
      DELETE FROM loans;
      DELETE FROM accounts;
      DELETE FROM categories;
      DELETE FROM users;
    `);

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
    const dbPath = path.resolve('./data/test-backup/smart-finance.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    const dir = path.resolve('./data/test-backup');
    if (fs.existsSync(dir)) fs.rmdirSync(dir);
  });

  describe('export()', () => {
    it('should export an empty backup with metadata for a user with no data', () => {
      const result = BackupService.export(userId);

      expect(result.version).toBe('0.1.0');
      expect(result.userId).toBe(userId);
      expect(result.exportedAt).toBeTruthy();
      // Verify ISO 8601 format
      expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt);
      expect(result.data.accounts).toEqual([]);
      expect(result.data.transactions).toEqual([]);
      expect(result.data.transfers).toEqual([]);
      expect(result.data.goals).toEqual([]);
    });

    it('should include all user accounts and transactions in export', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Create a category
      const cat = db.insert(categories).values({
        userId,
        name: 'Comida',
        isSystem: false,
        createdAt: now,
      }).returning().get();

      // Create an account
      const acc = db.insert(accounts).values({
        userId,
        name: 'Santander',
        type: 'D�bito',
        initialBalance: 10000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      // Create a transaction
      db.insert(transactions).values({
        userId,
        accountId: acc.id,
        categoryId: cat.id,
        name: 'Almuerzo',
        amount: 150.50,
        type: 'Gasto',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      const result = BackupService.export(userId);

      expect(result.data.accounts).toHaveLength(1);
      expect(result.data.categories).toHaveLength(1);
      expect(result.data.transactions).toHaveLength(1);
      expect((result.data.accounts[0] as Record<string, unknown>)['name']).toBe('Santander');
      expect((result.data.transactions[0] as Record<string, unknown>)['name']).toBe('Almuerzo');
    });

    it('should not include data from other users', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Create another user
      const otherUser = db.insert(users).values({
        email: 'other@test.com',
        passwordHash: 'hashed',
        name: 'Other User',
        role: 'user',
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      // Create data for the other user
      db.insert(accounts).values({
        userId: otherUser.id,
        name: 'Other Account',
        type: 'D�bito',
        initialBalance: 5000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).run();

      const result = BackupService.export(userId);

      expect(result.data.accounts).toHaveLength(0);
    });
  });

  describe('import()', () => {
    it('should throw if not confirmed', () => {
      const backup = {
        version: '0.1.0',
        exportedAt: new Date().toISOString(),
        userId: 1,
        data: {},
      };

      expect(() => BackupService.import(userId, backup, false)).toThrow(BackupError);
      expect(() => BackupService.import(userId, backup, false)).toThrow('Debe confirmar la operaci�n');
    });

    it('should import data and replace existing user data atomically', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Create existing data to be replaced
      db.insert(categories).values({
        id: 100,
        userId,
        name: 'OldCategory',
        isSystem: false,
        createdAt: now,
      }).run();

      db.insert(accounts).values({
        id: 100,
        userId,
        name: 'OldAccount',
        type: 'D�bito',
        initialBalance: 1000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).run();

      // Create a backup with new data
      const backup = {
        version: '0.1.0',
        exportedAt: new Date().toISOString(),
        userId,
        data: {
          categories: [
            { id: 200, userId, name: 'NewCategory', isSystem: false, createdAt: now, icon: null, color: null },
          ],
          accounts: [
            { id: 200, userId, name: 'NewAccount', type: 'D�bito', initialBalance: 5000, status: 'Activo', currency: 'MXN', bank: null, balanceLimit: null, creditLimit: null, createdAt: now, updatedAt: now },
          ],
          transactions: [],
          transactionSplits: [],
          transfers: [],
          subscriptions: [],
          recurringTransactions: [],
          goals: [],
          budgets: [],
          budgetCategories: [],
          subcategories: [],
          rules: [],
          alerts: [],
          assets: [],
          liabilities: [],
          loans: [],
          loanPayments: [],
          networthSnapshots: [],
          creditSubscriptions: [],
        },
      };

      BackupService.import(userId, backup, true);

      // Verify old data was removed and new data exists
      const allAccounts = db.select().from(accounts).all();
      expect(allAccounts).toHaveLength(1);
      expect(allAccounts[0]!.name).toBe('NewAccount');

      const allCategories = db.select().from(categories).all();
      expect(allCategories).toHaveLength(1);
      expect(allCategories[0]!.name).toBe('NewCategory');
    });

    it('should perform export/import round-trip correctly', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Set up data
      db.insert(categories).values({
        id: 300,
        userId,
        name: 'Renta',
        isSystem: false,
        createdAt: now,
      }).run();

      db.insert(accounts).values({
        id: 300,
        userId,
        name: 'Nu',
        type: 'D�bito',
        initialBalance: 20000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).run();

      db.insert(goals).values({
        userId,
        name: 'Moto',
        targetAmount: 50000,
        savedAmount: 10000,
        type: 'ListaDeseos',
        status: 'Activa',
        createdAt: now,
        updatedAt: now,
      }).run();

      // Export
      const exported = BackupService.export(userId);

      // Clear all data
      db.delete(goals).run();
      db.delete(accounts).run();
      db.delete(categories).run();

      // Import back
      BackupService.import(userId, exported, true);

      // Verify restored
      const restoredAccounts = db.select().from(accounts).all();
      expect(restoredAccounts).toHaveLength(1);
      expect(restoredAccounts[0]!.name).toBe('Nu');

      const restoredGoals = db.select().from(goals).all();
      expect(restoredGoals).toHaveLength(1);
      expect(restoredGoals[0]!.name).toBe('Moto');
      expect(restoredGoals[0]!.savedAmount).toBe(10000);
    });
  });

  describe('validateBackup()', () => {
    it('should reject null/undefined input', () => {
      expect(() => BackupService.validateBackup(null)).toThrow(BackupError);
      expect(() => BackupService.validateBackup(undefined)).toThrow(BackupError);
    });

    it('should reject non-object input', () => {
      expect(() => BackupService.validateBackup('string')).toThrow(BackupError);
      expect(() => BackupService.validateBackup(42)).toThrow(BackupError);
    });

    it('should reject backup without version', () => {
      const backup = { exportedAt: new Date().toISOString(), data: {} };
      expect(() => BackupService.validateBackup(backup)).toThrow('version');
    });

    it('should reject backup without exportedAt', () => {
      const backup = { version: '0.1.0', data: {} };
      expect(() => BackupService.validateBackup(backup)).toThrow('exportedAt');
    });

    it('should reject backup with invalid date format', () => {
      const backup = { version: '0.1.0', exportedAt: 'not-a-date', data: {} };
      expect(() => BackupService.validateBackup(backup)).toThrow('ISO 8601');
    });

    it('should reject backup without data field', () => {
      const backup = { version: '0.1.0', exportedAt: new Date().toISOString() };
      expect(() => BackupService.validateBackup(backup)).toThrow('data');
    });

    it('should reject backup with incompatible major version', () => {
      const backup = { version: '2.0.0', exportedAt: new Date().toISOString(), data: {} };
      expect(() => BackupService.validateBackup(backup)).toThrow('incompatible');
    });

    it('should accept backup with same major version but different minor/patch', () => {
      const backup = { version: '0.2.5', exportedAt: new Date().toISOString(), data: {} };
      const result = BackupService.validateBackup(backup);
      expect(result.version).toBe('0.2.5');
    });

    it('should reject backup with invalid version format', () => {
      const backup = { version: 'abc', exportedAt: new Date().toISOString(), data: {} };
      expect(() => BackupService.validateBackup(backup)).toThrow('formato v�lido');
    });

    it('should reject data fields that are not arrays', () => {
      const backup = {
        version: '0.1.0',
        exportedAt: new Date().toISOString(),
        data: { accounts: 'not-an-array' },
      };
      expect(() => BackupService.validateBackup(backup)).toThrow('arreglo');
    });

    it('should accept valid backup with empty data', () => {
      const backup = {
        version: '0.1.0',
        exportedAt: new Date().toISOString(),
        data: {},
      };
      const result = BackupService.validateBackup(backup);
      expect(result.version).toBe('0.1.0');
      expect(result.data.accounts).toEqual([]);
    });
  });

  describe('parseMajorVersion()', () => {
    it('should parse major version from valid semver', () => {
      expect(BackupService.parseMajorVersion('0.1.0')).toBe(0);
      expect(BackupService.parseMajorVersion('1.2.3')).toBe(1);
      expect(BackupService.parseMajorVersion('10.0.0')).toBe(10);
    });

    it('should return null for invalid semver', () => {
      expect(BackupService.parseMajorVersion('abc')).toBeNull();
      expect(BackupService.parseMajorVersion('')).toBeNull();
      expect(BackupService.parseMajorVersion('1.2')).toBeNull();
    });
  });
});
