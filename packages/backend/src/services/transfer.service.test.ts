import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TransferService, TransferError } from './transfer.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, accounts, transactions, transfers } from '../db/schema.js';
import fs from 'node:fs';
import path from 'node:path';

process.env['DATA_DIR'] = './data/test-transfer';

describe('TransferService', () => {
  let userId: number;
  let sourceAccountId: number;
  let destAccountId: number;

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
      CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON transactions(account_id);

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
      CREATE INDEX IF NOT EXISTS transfers_source_account_id_idx ON transfers(source_account_id);
      CREATE INDEX IF NOT EXISTS transfers_destination_account_id_idx ON transfers(destination_account_id);
      CREATE INDEX IF NOT EXISTS transfers_date_idx ON transfers(date);
    `);
  });

  beforeEach(() => {
    const db = getDb();
    // Clean tables in correct order
    db.delete(transfers).run();
    db.delete(transactions).run();
    db.delete(accounts).run();
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

    // Create source account with initial balance of 10000
    const source = db
      .insert(accounts)
      .values({
        userId,
        name: 'Cuenta Origen',
        type: 'D�bito',
        initialBalance: 10000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    sourceAccountId = source.id;

    // Create destination account with initial balance of 5000
    const dest = db
      .insert(accounts)
      .values({
        userId,
        name: 'Cuenta Destino',
        type: 'D�bito',
        initialBalance: 5000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    destAccountId = dest.id;
  });

  afterAll(() => {
    closeDatabase();
    // Clean up test database
    const dbPath = path.resolve('./data/test-transfer/smart-finance.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    const dir = path.resolve('./data/test-transfer');
    if (fs.existsSync(dir)) fs.rmdirSync(dir);
  });

  describe('create()', () => {
    it('should create a transfer between two accounts', () => {
      const result = TransferService.create(userId, {
        name: 'Transferencia Test',
        date: '2024-01-15T10:00:00.000Z',
        amount: 1000,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Transferencia Test');
      expect(result.amount).toBe(1000);
      expect(result.sourceAccountId).toBe(sourceAccountId);
      expect(result.destinationAccountId).toBe(destAccountId);
      expect(result.userId).toBe(userId);
    });

    it('should reject transfer when source equals destination', () => {
      expect(() =>
        TransferService.create(userId, {
          name: 'Self Transfer',
          date: '2024-01-15T10:00:00.000Z',
          amount: 500,
          sourceAccountId,
          destinationAccountId: sourceAccountId,
        })
      ).toThrow(TransferError);

      expect(() =>
        TransferService.create(userId, {
          name: 'Self Transfer',
          date: '2024-01-15T10:00:00.000Z',
          amount: 500,
          sourceAccountId,
          destinationAccountId: sourceAccountId,
        })
      ).toThrow('La cuenta origen y la cuenta destino deben ser diferentes');
    });

    it('should reject transfer when source has insufficient funds', () => {
      expect(() =>
        TransferService.create(userId, {
          name: 'Exceso',
          date: '2024-01-15T10:00:00.000Z',
          amount: 20000, // Source only has 10000
          sourceAccountId,
          destinationAccountId: destAccountId,
        })
      ).toThrow(TransferError);

      expect(() =>
        TransferService.create(userId, {
          name: 'Exceso',
          date: '2024-01-15T10:00:00.000Z',
          amount: 20000,
          sourceAccountId,
          destinationAccountId: destAccountId,
        })
      ).toThrow('Fondos insuficientes en la cuenta origen');
    });

    it('should allow transfer when amount equals source balance exactly', () => {
      const result = TransferService.create(userId, {
        name: 'All Funds',
        date: '2024-01-15T10:00:00.000Z',
        amount: 10000,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      expect(result.amount).toBe(10000);
    });

    it('should reject transfer to non-existent destination account', () => {
      expect(() =>
        TransferService.create(userId, {
          name: 'Bad Dest',
          date: '2024-01-15T10:00:00.000Z',
          amount: 100,
          sourceAccountId,
          destinationAccountId: 99999,
        })
      ).toThrow(TransferError);
    });

    it('should reject transfer from non-existent source account', () => {
      expect(() =>
        TransferService.create(userId, {
          name: 'Bad Source',
          date: '2024-01-15T10:00:00.000Z',
          amount: 100,
          sourceAccountId: 99999,
          destinationAccountId: destAccountId,
        })
      ).toThrow(TransferError);
    });

    it('should account for previous transfers when checking balance', () => {
      // First transfer: move 8000 out of source
      TransferService.create(userId, {
        name: 'First',
        date: '2024-01-15T10:00:00.000Z',
        amount: 8000,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      // Second transfer: source now has 2000, try to transfer 3000
      expect(() =>
        TransferService.create(userId, {
          name: 'Second',
          date: '2024-01-15T11:00:00.000Z',
          amount: 3000,
          sourceAccountId,
          destinationAccountId: destAccountId,
        })
      ).toThrow('Fondos insuficientes en la cuenta origen');

      // But 2000 should work
      const result = TransferService.create(userId, {
        name: 'Second OK',
        date: '2024-01-15T11:00:00.000Z',
        amount: 2000,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });
      expect(result.amount).toBe(2000);
    });
  });

  describe('delete()', () => {
    it('should delete an existing transfer', () => {
      const transfer = TransferService.create(userId, {
        name: 'To Delete',
        date: '2024-01-15T10:00:00.000Z',
        amount: 500,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      TransferService.delete(transfer.id, userId);

      const found = TransferService.getById(transfer.id, userId);
      expect(found).toBeNull();
    });

    it('should throw when deleting non-existent transfer', () => {
      expect(() => TransferService.delete(99999, userId)).toThrow(TransferError);
      expect(() => TransferService.delete(99999, userId)).toThrow('Transferencia no encontrada');
    });

    it('should not delete transfer belonging to another user', () => {
      const transfer = TransferService.create(userId, {
        name: 'Other User',
        date: '2024-01-15T10:00:00.000Z',
        amount: 100,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      // Try to delete with different userId
      expect(() => TransferService.delete(transfer.id, userId + 999)).toThrow(TransferError);
    });

    it('should restore balance after deletion (allow re-transfer of same amount)', () => {
      // Transfer 10000 (all funds)
      const transfer = TransferService.create(userId, {
        name: 'All',
        date: '2024-01-15T10:00:00.000Z',
        amount: 10000,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      // Source now has 0, so can't transfer more
      expect(() =>
        TransferService.create(userId, {
          name: 'Extra',
          date: '2024-01-15T11:00:00.000Z',
          amount: 1,
          sourceAccountId,
          destinationAccountId: destAccountId,
        })
      ).toThrow('Fondos insuficientes');

      // Delete the transfer
      TransferService.delete(transfer.id, userId);

      // Now source has 10000 again, so we can transfer
      const newTransfer = TransferService.create(userId, {
        name: 'After Delete',
        date: '2024-01-15T12:00:00.000Z',
        amount: 10000,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });
      expect(newTransfer.amount).toBe(10000);
    });
  });

  describe('list()', () => {
    it('should return transfers ordered by date descending', () => {
      TransferService.create(userId, {
        name: 'First',
        date: '2024-01-10T10:00:00.000Z',
        amount: 100,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      TransferService.create(userId, {
        name: 'Second',
        date: '2024-01-15T10:00:00.000Z',
        amount: 200,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      TransferService.create(userId, {
        name: 'Third',
        date: '2024-01-12T10:00:00.000Z',
        amount: 300,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      const results = TransferService.list(userId);

      expect(results).toHaveLength(3);
      expect(results[0]!.name).toBe('Second');  // Jan 15
      expect(results[1]!.name).toBe('Third');   // Jan 12
      expect(results[2]!.name).toBe('First');   // Jan 10
    });

    it('should return empty array when user has no transfers', () => {
      const results = TransferService.list(userId);
      expect(results).toHaveLength(0);
    });

    it('should only return transfers for the specified user', () => {
      // Create another user
      const db = getDb();
      const now = new Date().toISOString();
      const otherUser = db
        .insert(users)
        .values({
          email: 'other@test.com',
          passwordHash: 'hashed',
          name: 'Other',
          role: 'user',
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      // Create transfer for first user
      TransferService.create(userId, {
        name: 'My Transfer',
        date: '2024-01-15T10:00:00.000Z',
        amount: 100,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      // List for other user should be empty
      const otherResults = TransferService.list(otherUser.id);
      expect(otherResults).toHaveLength(0);

      // List for first user should have 1
      const myResults = TransferService.list(userId);
      expect(myResults).toHaveLength(1);
    });
  });

  describe('getById()', () => {
    it('should return a transfer by id', () => {
      const created = TransferService.create(userId, {
        name: 'Find Me',
        date: '2024-01-15T10:00:00.000Z',
        amount: 750,
        sourceAccountId,
        destinationAccountId: destAccountId,
      });

      const found = TransferService.getById(created.id, userId);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Find Me');
      expect(found!.amount).toBe(750);
    });

    it('should return null for non-existent transfer', () => {
      const found = TransferService.getById(99999, userId);
      expect(found).toBeNull();
    });
  });
});
