import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { BackupService, BackupError, APP_VERSION } from './backup.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, accounts, transactions, categories, goals } from '../db/schema.js';
import { eq } from 'drizzle-orm';
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
        disabled INTEGER NOT NULL DEFAULT 0,
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
        key TEXT,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        type TEXT NOT NULL DEFAULT 'Ambos',
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
        merchant TEXT,
        subtype TEXT,
        reconciled INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'posted',
        external_id TEXT,
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

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS tags_user_id_idx ON tags(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS tags_user_id_name_unique ON tags(user_id, name);

      CREATE TABLE IF NOT EXISTS transaction_tags (
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (transaction_id, tag_id)
      );
      CREATE INDEX IF NOT EXISTS transaction_tags_transaction_id_idx ON transaction_tags(transaction_id);

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

      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
        transfer_id INTEGER REFERENCES transfers(id) ON DELETE SET NULL,
        filename TEXT NOT NULL,
        original_name TEXT,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS attachments_user_id_idx ON attachments(user_id);

      CREATE TABLE IF NOT EXISTS receipt_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attachment_id INTEGER NOT NULL UNIQUE REFERENCES attachments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id INTEGER,
        merchant TEXT,
        receipt_date TEXT,
        subtotal REAL,
        tax REAL,
        total REAL,
        currency TEXT NOT NULL DEFAULT 'MXN',
        document_type TEXT NOT NULL DEFAULT 'unknown',
        source_type TEXT NOT NULL DEFAULT 'unknown',
        status TEXT NOT NULL DEFAULT 'pending',
        confidence REAL,
        raw_text TEXT,
        uuid TEXT,
        issuer_rfc TEXT,
        issuer_name TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS receipt_analyses_user_id_idx ON receipt_analyses(user_id);

      CREATE TABLE IF NOT EXISTS receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id INTEGER NOT NULL REFERENCES receipt_analyses(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        quantity REAL,
        unit_price REAL,
        total REAL
      );
      CREATE INDEX IF NOT EXISTS receipt_items_analysis_id_idx ON receipt_items(analysis_id);
    `);
  });

  beforeEach(() => {
    const db = getDb();
    const sqlite = getSqlite();
    // Clean all tables
    sqlite.exec(`
      DELETE FROM receipt_items;
      DELETE FROM receipt_analyses;
      DELETE FROM attachments;
      DELETE FROM credit_subscriptions;
      DELETE FROM loan_payments;
      DELETE FROM networth_snapshots;
      DELETE FROM transaction_splits;
      DELETE FROM budget_categories;
      DELETE FROM subcategories;
      DELETE FROM transactions;
      DELETE FROM transfers;
      DELETE FROM subscriptions;
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
    const dbPath = path.resolve('./data/test-backup/homeledger.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    const dir = path.resolve('./data/test-backup');
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('export()', () => {
    it('should export an empty backup with metadata for a user with no data', () => {
      const result = BackupService.export(userId);

      expect(result.version).toBe(APP_VERSION);
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
        type: 'Débito',
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
        type: 'Débito',
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
      expect(() => BackupService.import(userId, backup, false)).toThrow('Debe confirmar');
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
        type: 'Débito',
        initialBalance: 1000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).run();

      // Create a backup with new data
      const backup = {
        version: APP_VERSION,
        exportedAt: new Date().toISOString(),
        userId,
        data: {
          categories: [
            { id: 200, userId, name: 'NewCategory', isSystem: false, createdAt: now, icon: null, color: null },
          ],
          accounts: [
            { id: 200, userId, name: 'NewAccount', type: 'Débito', initialBalance: 5000, status: 'Activo', currency: 'MXN', bank: null, balanceLimit: null, creditLimit: null, createdAt: now, updatedAt: now },
          ],
          transactions: [],
          transactionSplits: [],
          transfers: [],
          subscriptions: [],
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
        type: 'Débito',
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

    it('round-trips attachments (incl. binary file on disk) and receipts with remapped FKs', () => {
      const db = getDb();
      const sqlite = getSqlite();
      const now = new Date().toISOString();

      // Base data: a category, account, and a transaction the attachment links to.
      const cat = db.insert(categories).values({ userId, name: 'Comida', isSystem: false, createdAt: now }).returning().get();
      const acc = db.insert(accounts).values({ userId, name: 'Nu', type: 'Débito', initialBalance: 100, status: 'Activo', currency: 'MXN', createdAt: now, updatedAt: now }).returning().get();
      const tx = db.insert(transactions).values({ userId, accountId: acc.id, categoryId: cat.id, name: 'Ticket', amount: 42, type: 'Gasto', date: now, createdAt: now, updatedAt: now }).returning().get();

      // Write a real binary file on disk + insert the attachment row pointing at it.
      const uploadDir = path.resolve('./data/test-backup/attachments');
      fs.mkdirSync(uploadDir, { recursive: true });
      const storedName = 'roundtrip-fixture.bin';
      const filePath = path.join(uploadDir, storedName);
      const fileBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03, 0xff]);
      fs.writeFileSync(filePath, fileBytes);
      const att = sqlite
        .prepare('INSERT INTO attachments (user_id, transaction_id, transfer_id, filename, original_name, mime_type, size, path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(userId, tx.id, null, storedName, 'recibo.png', 'image/png', fileBytes.length, filePath, now);
      const attId = Number(att.lastInsertRowid);

      // Receipt analysis + one line item for that attachment.
      const ra = sqlite
        .prepare("INSERT INTO receipt_analyses (attachment_id, user_id, transaction_id, merchant, total, currency, document_type, source_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'MXN', 'unknown', 'ocr', 'completed', ?, ?)")
        .run(attId, userId, tx.id, 'OXXO', 42, now, now);
      const analysisId = Number(ra.lastInsertRowid);
      sqlite.prepare('INSERT INTO receipt_items (analysis_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)').run(analysisId, 'Refresco', 2, 21, 42);

      // Export, then wipe everything (rows + the file on disk).
      const exported = BackupService.export(userId);
      // Sanity: the export captured the binary inline.
      const exportedAtt = exported.data.attachments[0] as Record<string, unknown>;
      expect(exported.data.attachments).toHaveLength(1);
      expect(typeof exportedAtt['fileBase64']).toBe('string');
      expect(Buffer.from(exportedAtt['fileBase64'] as string, 'base64').equals(fileBytes)).toBe(true);
      expect(exported.data.receiptAnalyses).toHaveLength(1);
      expect(exported.data.receiptItems).toHaveLength(1);

      fs.unlinkSync(filePath);
      sqlite.exec('DELETE FROM receipt_items; DELETE FROM receipt_analyses; DELETE FROM attachments;');
      db.delete(transactions).run();
      db.delete(accounts).run();
      db.delete(categories).run();

      // Import back.
      BackupService.import(userId, exported, true);

      // Attachment row restored with a remapped transaction_id and a written file.
      const restoredAtt = sqlite.prepare('SELECT * FROM attachments WHERE user_id = ?').all(userId) as Record<string, unknown>[];
      expect(restoredAtt).toHaveLength(1);
      const newTx = db.select().from(transactions).where(eq(transactions.userId, userId)).all();
      expect(newTx).toHaveLength(1);
      expect(restoredAtt[0]!['transaction_id']).toBe(newTx[0]!.id);
      // File was rewritten to disk under the new stored path with identical bytes.
      const restoredPath = restoredAtt[0]!['path'] as string;
      expect(fs.existsSync(restoredPath)).toBe(true);
      expect(fs.readFileSync(restoredPath).equals(fileBytes)).toBe(true);

      // Receipt analysis restored, pointing at the new attachment + transaction.
      const restoredRa = sqlite.prepare('SELECT * FROM receipt_analyses WHERE user_id = ?').all(userId) as Record<string, unknown>[];
      expect(restoredRa).toHaveLength(1);
      expect(restoredRa[0]!['attachment_id']).toBe(restoredAtt[0]!['id']);
      expect(restoredRa[0]!['transaction_id']).toBe(newTx[0]!.id);
      expect(restoredRa[0]!['merchant']).toBe('OXXO');

      // Receipt item restored, pointing at the new analysis id.
      const restoredItems = sqlite.prepare('SELECT * FROM receipt_items WHERE analysis_id = ?').all(restoredRa[0]!['id']) as Record<string, unknown>[];
      expect(restoredItems).toHaveLength(1);
      expect(restoredItems[0]!['description']).toBe('Refresco');

      // Clean up the rewritten file.
      if (fs.existsSync(restoredPath)) fs.unlinkSync(restoredPath);
    });

    it('should import without colliding with another user whose ids overlap the backup', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // A second user already owns rows with ids 500 (category + account) that
      // overlap the ids used in the backup below. The old id-preserving import
      // threw "UNIQUE constraint failed". The remapping import must succeed.
      const otherUser = db.insert(users).values({
        email: 'collision@test.com',
        passwordHash: 'hashed',
        name: 'Collision User',
        role: 'user',
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      db.insert(categories).values({
        id: 500,
        userId: otherUser.id,
        name: 'OtherUserCategory',
        isSystem: false,
        createdAt: now,
      }).run();

      db.insert(accounts).values({
        id: 500,
        userId: otherUser.id,
        name: 'OtherUserAccount',
        type: 'Débito',
        initialBalance: 999,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).run();

      // Backup for OUR user reuses ids 500 and cross-references them.
      const backup = {
        version: APP_VERSION,
        exportedAt: now,
        userId,
        data: {
          categories: [
            { id: 500, userId, name: 'MiCategoria', isSystem: false, createdAt: now, icon: null, color: null, type: 'Gasto' },
          ],
          accounts: [
            { id: 500, userId, name: 'MiCuenta', type: 'Débito', initialBalance: 5000, status: 'Activo', currency: 'MXN', bank: null, balanceLimit: null, creditLimit: null, createdAt: now, updatedAt: now },
          ],
          transactions: [
            { id: 500, userId, accountId: 500, categoryId: 500, subcategoryId: null, name: 'Compra', amount: 100, type: 'Gasto', date: now, notes: null, attachmentId: null, createdAt: now, updatedAt: now },
          ],
          transactionSplits: [],
          transfers: [],
          subscriptions: [],
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

      // Must not throw despite id 500 already existing for the other user.
      expect(() => BackupService.import(userId, backup, true)).not.toThrow();

      // Our data was restored under fresh ids...
      const myCats = db.select().from(categories).where(eq(categories.userId, userId)).all();
      expect(myCats).toHaveLength(1);
      expect(myCats[0]!.name).toBe('MiCategoria');

      const myAccounts = db.select().from(accounts).where(eq(accounts.userId, userId)).all();
      expect(myAccounts).toHaveLength(1);
      expect(myAccounts[0]!.name).toBe('MiCuenta');

      // ...and the transaction's FKs were remapped to those fresh ids.
      const myTxs = db.select().from(transactions).where(eq(transactions.userId, userId)).all();
      expect(myTxs).toHaveLength(1);
      expect(myTxs[0]!.accountId).toBe(myAccounts[0]!.id);
      expect(myTxs[0]!.categoryId).toBe(myCats[0]!.id);

      // The other user's colliding rows are untouched.
      const otherCat = db.select().from(categories).where(eq(categories.userId, otherUser.id)).all();
      expect(otherCat).toHaveLength(1);
      expect(otherCat[0]!.name).toBe('OtherUserCategory');
    });

    it('leaves a second user\'s data across multiple tables fully intact after another user imports', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // A second user with data spread across several tables (category, account,
      // transaction, goal). None of it should be touched when `userId` imports.
      const other = db.insert(users).values({
        email: 'bystander@test.com', passwordHash: 'hashed', name: 'Bystander',
        role: 'user', createdAt: now, updatedAt: now,
      }).returning().get();

      const otherCat = db.insert(categories).values({ userId: other.id, name: 'OtherCat', isSystem: false, createdAt: now }).returning().get();
      const otherAcc = db.insert(accounts).values({ userId: other.id, name: 'OtherAcc', type: 'Débito', initialBalance: 1234, status: 'Activo', currency: 'MXN', createdAt: now, updatedAt: now }).returning().get();
      db.insert(transactions).values({ userId: other.id, accountId: otherAcc.id, categoryId: otherCat.id, name: 'OtherTx', amount: 55, type: 'Gasto', date: now, createdAt: now, updatedAt: now }).run();
      db.insert(goals).values({ userId: other.id, name: 'OtherGoal', targetAmount: 9000, savedAmount: 300, type: 'ListaDeseos', status: 'Activa', createdAt: now, updatedAt: now }).run();

      // A fresh, unrelated backup for OUR user replaces our (empty) data.
      const backup = {
        version: APP_VERSION, exportedAt: now, userId,
        data: {
          categories: [{ id: 1, userId, name: 'MyCat', isSystem: false, createdAt: now, icon: null, color: null, type: 'Gasto' }],
          accounts: [{ id: 1, userId, name: 'MyAcc', type: 'Débito', initialBalance: 100, status: 'Activo', currency: 'MXN', bank: null, balanceLimit: null, creditLimit: null, createdAt: now, updatedAt: now }],
          transactions: [], transactionSplits: [], transfers: [], subscriptions: [], goals: [],
          budgets: [], budgetCategories: [], subcategories: [], rules: [], alerts: [],
          assets: [], liabilities: [], loans: [], loanPayments: [], networthSnapshots: [], creditSubscriptions: [],
        },
      };

      BackupService.import(userId, backup, true);

      // Every one of the other user's rows survives, unchanged.
      const oc = db.select().from(categories).where(eq(categories.userId, other.id)).all();
      expect(oc).toHaveLength(1);
      expect(oc[0]!.name).toBe('OtherCat');

      const oa = db.select().from(accounts).where(eq(accounts.userId, other.id)).all();
      expect(oa).toHaveLength(1);
      expect(oa[0]!.initialBalance).toBe(1234);

      const ot = db.select().from(transactions).where(eq(transactions.userId, other.id)).all();
      expect(ot).toHaveLength(1);
      expect(ot[0]!.name).toBe('OtherTx');

      const og = db.select().from(goals).where(eq(goals.userId, other.id)).all();
      expect(og).toHaveLength(1);
      expect(og[0]!.savedAmount).toBe(300);
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
      const backup = { version: '1.2.5', exportedAt: new Date().toISOString(), data: {} };
      const result = BackupService.validateBackup(backup);
      expect(result.version).toBe('1.2.5');
    });

    it('should reject backup with invalid version format', () => {
      const backup = { version: 'abc', exportedAt: new Date().toISOString(), data: {} };
      expect(() => BackupService.validateBackup(backup)).toThrow('formato v');
    });

    it('should reject data fields that are not arrays', () => {
      const backup = {
        version: APP_VERSION,
        exportedAt: new Date().toISOString(),
        data: { accounts: 'not-an-array' },
      };
      expect(() => BackupService.validateBackup(backup)).toThrow('arreglo');
    });

    it('should accept valid backup with empty data', () => {
      const backup = {
        version: APP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {},
      };
      const result = BackupService.validateBackup(backup);
      expect(result.version).toBe(APP_VERSION);
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

  describe('previewImport() (dry-run)', () => {
    it('validates the backup and reports it without touching data', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Existing data that a real import WOULD replace.
      db.insert(categories).values({ id: 100, userId, name: 'OldCat', isSystem: false, createdAt: now }).run();
      db.insert(accounts).values({ id: 100, userId, name: 'OldAcc', type: 'Débito', initialBalance: 1000, status: 'Activo', currency: 'MXN', createdAt: now, updatedAt: now }).run();

      const backup = {
        version: APP_VERSION,
        exportedAt: now,
        userId,
        data: {
          categories: [{ id: 200, userId, name: 'NewCat', isSystem: false, createdAt: now, icon: null, color: null }],
          accounts: [
            { id: 200, userId, name: 'A1', type: 'Débito', initialBalance: 0, status: 'Activo', currency: 'MXN', bank: null, balanceLimit: null, creditLimit: null, createdAt: now, updatedAt: now },
            { id: 201, userId, name: 'A2', type: 'Débito', initialBalance: 0, status: 'Activo', currency: 'MXN', bank: null, balanceLimit: null, creditLimit: null, createdAt: now, updatedAt: now },
          ],
          transactions: [
            { id: 300, userId, accountId: 200, categoryId: 200, name: 'T', amount: 10, type: 'Gasto', date: now, createdAt: now, updatedAt: now },
          ],
        },
      };

      const preview = BackupService.previewImport(userId, backup);

      // Reports backup counts…
      expect(preview.backupCounts['accounts']).toBe(2);
      expect(preview.backupCounts['categories']).toBe(1);
      expect(preview.backupCounts['transactions']).toBe(1);
      // …and current counts that would be replaced.
      expect(preview.currentCounts['accounts']).toBe(1);
      expect(preview.currentCounts['categories']).toBe(1);
      expect(preview.version).toBe(APP_VERSION);

      // Crucially: no writes happened — the existing data is untouched.
      expect(db.select().from(accounts).all()).toHaveLength(1);
      expect(db.select().from(accounts).all()[0]!.name).toBe('OldAcc');
    });

    it('warns about rows that reference entities absent from the backup', () => {
      const now = new Date().toISOString();
      const backup = {
        version: APP_VERSION,
        exportedAt: now,
        userId,
        data: {
          accounts: [{ id: 200, userId, name: 'A', type: 'Débito', initialBalance: 0, status: 'Activo', currency: 'MXN', bank: null, balanceLimit: null, creditLimit: null, createdAt: now, updatedAt: now }],
          categories: [], // no categories in the backup
          transactions: [
            // references categoryId 999 which is absent → should be flagged
            { id: 300, userId, accountId: 200, categoryId: 999, name: 'T', amount: 10, type: 'Gasto', date: now, createdAt: now, updatedAt: now },
          ],
        },
      };

      const preview = BackupService.previewImport(userId, backup);
      expect(preview.warnings.some((w) => w.includes('categoría'))).toBe(true);
    });

    it('throws on an invalid backup without writing', () => {
      expect(() => BackupService.previewImport(userId, { version: '2.0.0', exportedAt: new Date().toISOString(), data: {} }))
        .toThrow(BackupError);
    });
  });

  describe('import() atomicity', () => {
    it('rolls back cleanly on a mid-import failure (no partial restore)', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Seed original data we expect to survive a failed import.
      db.insert(categories).values({ id: 100, userId, name: 'KeepCat', isSystem: false, createdAt: now }).run();
      db.insert(accounts).values({ id: 100, userId, name: 'KeepAcc', type: 'Débito', initialBalance: 777, status: 'Activo', currency: 'MXN', createdAt: now, updatedAt: now }).run();

      // Backup that passes validation but fails mid-insert: a transaction with a
      // NOT NULL `amount` set to null violates the constraint during insert.
      const badBackup = {
        version: APP_VERSION,
        exportedAt: now,
        userId,
        data: {
          categories: [{ id: 200, userId, name: 'NewCat', isSystem: false, createdAt: now, icon: null, color: null }],
          accounts: [{ id: 200, userId, name: 'NewAcc', type: 'Débito', initialBalance: 5000, status: 'Activo', currency: 'MXN', bank: null, balanceLimit: null, creditLimit: null, createdAt: now, updatedAt: now }],
          transactions: [
            { id: 300, userId, accountId: 200, categoryId: 200, name: 'Bad', amount: null, type: 'Gasto', date: now, createdAt: now, updatedAt: now },
          ],
        },
      };

      expect(() => BackupService.import(userId, badBackup, true)).toThrow();

      // The transaction wrapped the delete+insert, so the original data must be intact.
      const accs = db.select().from(accounts).all();
      expect(accs).toHaveLength(1);
      expect(accs[0]!.name).toBe('KeepAcc');
      expect(accs[0]!.initialBalance).toBe(777);
      const cats = db.select().from(categories).all();
      expect(cats.map((c) => c.name)).toContain('KeepCat');
      // The half-inserted "NewAcc"/"NewCat" must NOT be present.
      expect(accs.map((a) => a.name)).not.toContain('NewAcc');
    });
  });
});
