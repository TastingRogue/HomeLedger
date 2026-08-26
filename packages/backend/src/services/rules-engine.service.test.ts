import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { RulesEngineService, RulesEngineError } from './rules-engine.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, rules, transactions, accounts, categories } from '../db/schema.js';
import fs from 'node:fs';
import path from 'node:path';

process.env['DATA_DIR'] = './data/test-rules-engine';

describe('RulesEngineService', () => {
  let userId: number;
  let categoryId: number;
  let defaultCategoryId: number;
  let accountId: number;

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
      CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id);

      CREATE TABLE IF NOT EXISTS subcategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

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
      CREATE INDEX IF NOT EXISTS rules_user_id_priority_idx ON rules(user_id, priority);
    `);
  });

  beforeEach(() => {
    const db = getDb();
    db.delete(transactions).run();
    db.delete(rules).run();
    db.delete(accounts).run();
    db.delete(categories).run();
    db.delete(users).run();

    const now = new Date().toISOString();

    // Create test user
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

    // Create a category
    const cat = db
      .insert(categories)
      .values({ name: 'Comida', userId: null, isSystem: true, createdAt: now })
      .returning()
      .get();
    categoryId = cat.id;

    // Create default "Correcci�n" category
    const defaultCat = db
      .insert(categories)
      .values({ name: 'Correcci�n', userId: null, isSystem: true, createdAt: now })
      .returning()
      .get();
    defaultCategoryId = defaultCat.id;

    // Create a test account
    const acc = db
      .insert(accounts)
      .values({
        userId,
        name: 'Santander',
        type: 'D�bito',
        initialBalance: 10000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    accountId = acc.id;
  });

  afterAll(() => {
    closeDatabase();
    const dbPath = path.resolve('./data/test-rules-engine/smart-finance.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    const dir = path.resolve('./data/test-rules-engine');
    if (fs.existsSync(dir)) fs.rmdirSync(dir);
  });

  describe('create()', () => {
    it('should create a rule with all fields', () => {
      const result = RulesEngineService.create(userId, {
        name: 'Uber ? Transporte',
        priority: 1,
        conditions: [
          { field: 'name', operator: 'contains', value: 'Uber' },
        ],
        actions: [
          { type: 'setCategory', value: categoryId },
        ],
        enabled: true,
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Uber ? Transporte');
      expect(result.priority).toBe(1);
      expect(result.enabled).toBe(true);
      expect(result.matchCount).toBe(0);
    });

    it('should default enabled to true', () => {
      const result = RulesEngineService.create(userId, {
        name: 'Test Rule',
        priority: 5,
        conditions: [{ field: 'name', operator: 'equals', value: 'Test' }],
        actions: [{ type: 'setCategory', value: 1 }],
      });

      expect(result.enabled).toBe(true);
    });
  });

  describe('update()', () => {
    it('should update rule fields', () => {
      const rule = RulesEngineService.create(userId, {
        name: 'Original',
        priority: 1,
        conditions: [{ field: 'name', operator: 'contains', value: 'Test' }],
        actions: [{ type: 'setCategory', value: 1 }],
      });

      const result = RulesEngineService.update(rule.id, userId, {
        name: 'Actualizada',
        priority: 10,
      });

      expect(result!.name).toBe('Actualizada');
      expect(result!.priority).toBe(10);
    });

    it('should throw error for non-existent rule', () => {
      expect(() =>
        RulesEngineService.update(99999, userId, { name: 'No Existe' })
      ).toThrow(RulesEngineError);
    });
  });

  describe('delete()', () => {
    it('should delete a rule', () => {
      const rule = RulesEngineService.create(userId, {
        name: 'A Eliminar',
        priority: 1,
        conditions: [{ field: 'name', operator: 'contains', value: 'X' }],
        actions: [{ type: 'setCategory', value: 1 }],
      });

      RulesEngineService.delete(rule.id, userId);

      const allRules = RulesEngineService.list(userId);
      expect(allRules).toHaveLength(0);
    });

    it('should throw error for non-existent rule', () => {
      expect(() => RulesEngineService.delete(99999, userId)).toThrow(RulesEngineError);
    });
  });

  describe('list()', () => {
    it('should return all rules for a user ordered by priority', () => {
      RulesEngineService.create(userId, {
        name: 'Baja Prioridad',
        priority: 10,
        conditions: [{ field: 'name', operator: 'contains', value: 'X' }],
        actions: [{ type: 'setCategory', value: 1 }],
      });
      RulesEngineService.create(userId, {
        name: 'Alta Prioridad',
        priority: 1,
        conditions: [{ field: 'name', operator: 'contains', value: 'Y' }],
        actions: [{ type: 'setCategory', value: 1 }],
      });

      const result = RulesEngineService.list(userId);
      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('Alta Prioridad');
      expect(result[1]!.name).toBe('Baja Prioridad');
    });

    it('should return empty array when no rules exist', () => {
      const result = RulesEngineService.list(userId);
      expect(result).toHaveLength(0);
    });
  });

  describe('evaluate()', () => {
    it('should match first rule by priority (first match wins)', () => {
      RulesEngineService.create(userId, {
        name: 'Low Priority',
        priority: 10,
        conditions: [{ field: 'name', operator: 'contains', value: 'Uber' }],
        actions: [{ type: 'setCategory', value: 99 }],
      });
      RulesEngineService.create(userId, {
        name: 'High Priority',
        priority: 1,
        conditions: [{ field: 'name', operator: 'contains', value: 'Uber' }],
        actions: [{ type: 'setCategory', value: categoryId }],
      });

      const match = RulesEngineService.evaluate(userId, {
        id: 1,
        name: 'Uber Eats',
        amount: 150,
        accountName: 'Santander',
      });

      expect(match).not.toBeNull();
      expect(match!.ruleName).toBe('High Priority');
      expect(match!.actions[0]!.value).toBe(categoryId);
    });

    it('should return null when no rule matches', () => {
      RulesEngineService.create(userId, {
        name: 'No Match',
        priority: 1,
        conditions: [{ field: 'name', operator: 'contains', value: 'Netflix' }],
        actions: [{ type: 'setCategory', value: 1 }],
      });

      const match = RulesEngineService.evaluate(userId, {
        id: 1,
        name: 'Uber Eats',
        amount: 150,
        accountName: 'Santander',
      });

      expect(match).toBeNull();
    });

    it('should skip disabled rules', () => {
      RulesEngineService.create(userId, {
        name: 'Disabled Rule',
        priority: 1,
        conditions: [{ field: 'name', operator: 'contains', value: 'Uber' }],
        actions: [{ type: 'setCategory', value: 1 }],
        enabled: false,
      });

      const match = RulesEngineService.evaluate(userId, {
        id: 1,
        name: 'Uber Eats',
        amount: 150,
        accountName: 'Santander',
      });

      expect(match).toBeNull();
    });

    it('should require all conditions to match (AND logic)', () => {
      RulesEngineService.create(userId, {
        name: 'Multi-condition',
        priority: 1,
        conditions: [
          { field: 'name', operator: 'contains', value: 'Uber' },
          { field: 'amount', operator: 'greaterThan', value: 200 },
        ],
        actions: [{ type: 'setCategory', value: categoryId }],
      });

      // Only one condition matches
      const noMatch = RulesEngineService.evaluate(userId, {
        id: 1,
        name: 'Uber Eats',
        amount: 100, // < 200
        accountName: 'Santander',
      });
      expect(noMatch).toBeNull();

      // Both conditions match
      const match = RulesEngineService.evaluate(userId, {
        id: 2,
        name: 'Uber Premium',
        amount: 350, // > 200
        accountName: 'Santander',
      });
      expect(match).not.toBeNull();
    });

    it('should increment matchCount when a rule matches', () => {
      const rule = RulesEngineService.create(userId, {
        name: 'Counter Test',
        priority: 1,
        conditions: [{ field: 'name', operator: 'equals', value: 'Test' }],
        actions: [{ type: 'setCategory', value: 1 }],
      });

      RulesEngineService.evaluate(userId, {
        id: 1,
        name: 'Test',
        amount: 50,
      });

      const db = getDb();
      const updated = db
        .select()
        .from(rules)
        .where(eq(rules.id, rule.id))
        .get();
      expect(updated!.matchCount).toBe(1);
    });
  });

  describe('evaluateCondition()', () => {
    const txn = { id: 1, name: 'Uber Eats Delivery', amount: 185.50, notes: 'Pedido nocturno', accountName: 'Nu' };

    it('contains: case-insensitive by default', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'contains', value: 'uber' })
      ).toBe(true);
    });

    it('contains: case-sensitive when specified', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'contains', value: 'uber', caseSensitive: true })
      ).toBe(false);
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'contains', value: 'Uber', caseSensitive: true })
      ).toBe(true);
    });

    it('equals: exact match', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'equals', value: 'uber eats delivery' })
      ).toBe(true); // case-insensitive
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'equals', value: 'Uber Eats', caseSensitive: true })
      ).toBe(false);
    });

    it('equals: numeric comparison', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'amount', operator: 'equals', value: 185.50 })
      ).toBe(true);
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'amount', operator: 'equals', value: 200 })
      ).toBe(false);
    });

    it('startsWith: works correctly', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'startsWith', value: 'Uber' })
      ).toBe(true);
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'startsWith', value: 'Eats' })
      ).toBe(false);
    });

    it('endsWith: works correctly', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'endsWith', value: 'Delivery' })
      ).toBe(true);
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'endsWith', value: 'Uber' })
      ).toBe(false);
    });

    it('greaterThan: numeric comparison', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'amount', operator: 'greaterThan', value: 100 })
      ).toBe(true);
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'amount', operator: 'greaterThan', value: 200 })
      ).toBe(false);
    });

    it('lessThan: numeric comparison', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'amount', operator: 'lessThan', value: 200 })
      ).toBe(true);
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'amount', operator: 'lessThan', value: 100 })
      ).toBe(false);
    });

    it('between: inclusive range', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'amount', operator: 'between', value: [100, 200] })
      ).toBe(true);
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'amount', operator: 'between', value: [185.50, 185.50] })
      ).toBe(true); // exact boundary
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'amount', operator: 'between', value: [200, 300] })
      ).toBe(false);
    });

    it('regex: basic pattern matching', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'regex', value: '^Uber.*Delivery$' })
      ).toBe(true);
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'regex', value: '^Netflix' })
      ).toBe(false);
    });

    it('regex: throws on invalid pattern', () => {
      expect(() =>
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'regex', value: '[invalid' })
      ).toThrow(RulesEngineError);
    });

    it('regex: throws on dangerous pattern', () => {
      expect(() =>
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'regex', value: '(a+)+$' })
      ).toThrow('repeticiones anidadas');
    });

    it('regex: throws on pattern exceeding max length', () => {
      const longPattern = 'a'.repeat(201);
      expect(() =>
        RulesEngineService.evaluateCondition(txn, { field: 'name', operator: 'regex', value: longPattern })
      ).toThrow('excede el m�ximo');
    });

    it('account field: matches account name', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'account', operator: 'equals', value: 'Nu' })
      ).toBe(true);
    });

    it('description field: matches notes', () => {
      expect(
        RulesEngineService.evaluateCondition(txn, { field: 'description', operator: 'contains', value: 'nocturno' })
      ).toBe(true);
    });

    it('returns false for null/undefined field values', () => {
      const txnNoNotes = { id: 1, name: 'Test', amount: 100, notes: null, accountName: undefined };
      expect(
        RulesEngineService.evaluateCondition(txnNoNotes, { field: 'description', operator: 'contains', value: 'test' })
      ).toBe(false);
      expect(
        RulesEngineService.evaluateCondition(txnNoNotes, { field: 'account', operator: 'equals', value: 'Nu' })
      ).toBe(false);
    });
  });

  describe('applyToUncategorized()', () => {
    it('should apply rules to transactions with default category', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Create a transaction with the default "Correcci�n" category
      db.insert(transactions)
        .values({
          userId,
          accountId,
          categoryId: defaultCategoryId,
          name: 'Uber Eats',
          amount: 150,
          type: 'Gasto',
          date: now,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // Create a rule that matches
      RulesEngineService.create(userId, {
        name: 'Uber ? Comida',
        priority: 1,
        conditions: [{ field: 'name', operator: 'contains', value: 'Uber' }],
        actions: [{ type: 'setCategory', value: categoryId }],
      });

      const result = RulesEngineService.applyToUncategorized(userId);

      expect(result.processed).toBe(1);
      expect(result.matched).toBe(1);
      expect(result.applied).toHaveLength(1);
      expect(result.applied[0]!.transactionName).toBe('Uber Eats');
      expect(result.applied[0]!.ruleName).toBe('Uber ? Comida');
    });

    it('should return zeros when no uncategorized transactions exist', () => {
      const result = RulesEngineService.applyToUncategorized(userId);

      expect(result.processed).toBe(0);
      expect(result.matched).toBe(0);
      expect(result.applied).toHaveLength(0);
    });

    it('should not match transactions that do not satisfy rules', () => {
      const db = getDb();
      const now = new Date().toISOString();

      db.insert(transactions)
        .values({
          userId,
          accountId,
          categoryId: defaultCategoryId,
          name: 'Random Purchase',
          amount: 50,
          type: 'Gasto',
          date: now,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      RulesEngineService.create(userId, {
        name: 'Netflix Rule',
        priority: 1,
        conditions: [{ field: 'name', operator: 'contains', value: 'Netflix' }],
        actions: [{ type: 'setCategory', value: categoryId }],
      });

      const result = RulesEngineService.applyToUncategorized(userId);

      expect(result.processed).toBe(1);
      expect(result.matched).toBe(0);
    });
  });

  describe('test()', () => {
    it('should dry-run a rule against transactions without persisting', () => {
      const db = getDb();
      const now = new Date().toISOString();

      const txn = db
        .insert(transactions)
        .values({
          userId,
          accountId,
          categoryId: defaultCategoryId,
          name: 'Spotify Premium',
          amount: 115,
          type: 'Gasto',
          date: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      const result = RulesEngineService.test(
        userId,
        {
          name: 'Spotify Test',
          priority: 1,
          conditions: [{ field: 'name', operator: 'contains', value: 'Spotify' }],
          actions: [{ type: 'setCategory', value: categoryId }],
        },
        [txn.id]
      );

      expect(result.totalTested).toBe(1);
      expect(result.totalMatched).toBe(1);
      expect(result.matches[0]!.matched).toBe(true);
      expect(result.matches[0]!.actions).toHaveLength(1);

      // Verify no changes were persisted
      const unchanged = db
        .select()
        .from(transactions)
        .where(eq(transactions.id, txn.id))
        .get();
      expect(unchanged!.categoryId).toBe(defaultCategoryId);
    });

    it('should report non-matching transactions', () => {
      const db = getDb();
      const now = new Date().toISOString();

      const txn = db
        .insert(transactions)
        .values({
          userId,
          accountId,
          categoryId: defaultCategoryId,
          name: 'Amazon',
          amount: 500,
          type: 'Gasto',
          date: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      const result = RulesEngineService.test(
        userId,
        {
          name: 'Spotify Test',
          priority: 1,
          conditions: [{ field: 'name', operator: 'contains', value: 'Spotify' }],
          actions: [{ type: 'setCategory', value: categoryId }],
        },
        [txn.id]
      );

      expect(result.totalTested).toBe(1);
      expect(result.totalMatched).toBe(0);
      expect(result.matches[0]!.matched).toBe(false);
      expect(result.matches[0]!.actions).toBeNull();
    });

    it('should test against last 50 transactions when no IDs specified', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Create a few transactions
      for (let i = 0; i < 3; i++) {
        db.insert(transactions)
          .values({
            userId,
            accountId,
            categoryId: defaultCategoryId,
            name: `Uber Trip ${i}`,
            amount: 100 + i * 10,
            type: 'Gasto',
            date: now,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      const result = RulesEngineService.test(userId, {
        name: 'Uber Rule',
        priority: 1,
        conditions: [{ field: 'name', operator: 'startsWith', value: 'Uber' }],
        actions: [{ type: 'setCategory', value: categoryId }],
      });

      expect(result.totalTested).toBe(3);
      expect(result.totalMatched).toBe(3);
    });
  });
});
