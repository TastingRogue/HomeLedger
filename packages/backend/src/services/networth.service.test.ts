import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NetWorthService, NetWorthError } from './networth.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, accounts, transactions, transfers, assets, liabilities, networthSnapshots } from '../db/schema.js';
import fs from 'node:fs';
import path from 'node:path';

process.env['DATA_DIR'] = './data/test-networth';

describe('NetWorthService', () => {
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

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        category_id INTEGER,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        invoice_path TEXT,
        parent_id INTEGER,
        is_reimbursed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON transactions(account_id);

      CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        source_account_id INTEGER NOT NULL REFERENCES accounts(id),
        destination_account_id INTEGER NOT NULL REFERENCES accounts(id),
        date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS transfers_source_idx ON transfers(source_account_id);
      CREATE INDEX IF NOT EXISTS transfers_dest_idx ON transfers(destination_account_id);

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
      CREATE INDEX IF NOT EXISTS networth_snapshots_user_id_date_idx ON networth_snapshots(user_id, date);
    `);
  });

  beforeEach(() => {
    const db = getDb();
    db.delete(networthSnapshots).run();
    db.delete(transfers).run();
    db.delete(transactions).run();
    db.delete(assets).run();
    db.delete(liabilities).run();
    db.delete(accounts).run();
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
    const dbPath = path.resolve('./data/test-networth/smart-finance.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    const dir = path.resolve('./data/test-networth');
    if (fs.existsSync(dir)) fs.rmdirSync(dir);
  });

  describe('getCurrent()', () => {
    it('should return zero net worth when user has no accounts, assets, or liabilities', async () => {
      const result = await NetWorthService.getCurrent(userId);

      expect(result.totalAssets).toBe(0);
      expect(result.totalLiabilities).toBe(0);
      expect(result.netWorth).toBe(0);
      expect(result.accountBalances).toBe(0);
      expect(result.assetValues).toBe(0);
      expect(result.assets).toHaveLength(0);
      expect(result.liabilities).toHaveLength(0);
    });

    it('should include active account balances in totalAssets', async () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Create an active account with initial balance
      db.insert(accounts).values({
        userId,
        name: 'Santander',
        type: 'D�bito',
        initialBalance: 10000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).run();

      const result = await NetWorthService.getCurrent(userId);

      expect(result.accountBalances).toBe(10000);
      expect(result.totalAssets).toBe(10000);
      expect(result.netWorth).toBe(10000);
    });

    it('should exclude inactive accounts from calculation', async () => {
      const db = getDb();
      const now = new Date().toISOString();

      db.insert(accounts).values({
        userId,
        name: 'Inactiva',
        type: 'D�bito',
        initialBalance: 5000,
        status: 'Inactivo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).run();

      const result = await NetWorthService.getCurrent(userId);

      expect(result.accountBalances).toBe(0);
      expect(result.netWorth).toBe(0);
    });

    it('should add asset values to totalAssets', async () => {
      NetWorthService.createAsset(userId, {
        name: 'Casa',
        value: 500000,
        type: 'Propiedad',
      });

      const result = await NetWorthService.getCurrent(userId);

      expect(result.assetValues).toBe(500000);
      expect(result.totalAssets).toBe(500000);
      expect(result.netWorth).toBe(500000);
    });

    it('should subtract liability balances from net worth', async () => {
      NetWorthService.createLiability(userId, {
        name: 'Hipoteca',
        balance: 200000,
        type: 'Hipoteca',
      });

      const result = await NetWorthService.getCurrent(userId);

      expect(result.totalLiabilities).toBe(200000);
      expect(result.netWorth).toBe(-200000);
    });

    it('should calculate combined net worth correctly', async () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Active account with 10000
      db.insert(accounts).values({
        userId,
        name: 'Banco',
        type: 'D�bito',
        initialBalance: 10000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).run();

      // Asset worth 50000
      NetWorthService.createAsset(userId, {
        name: 'Auto',
        value: 50000,
        type: 'Veh�culo',
      });

      // Liability of 20000
      NetWorthService.createLiability(userId, {
        name: 'Pr�stamo auto',
        balance: 20000,
        type: 'Pr�stamo',
      });

      const result = await NetWorthService.getCurrent(userId);

      // totalAssets = 10000 (account) + 50000 (asset) = 60000
      // netWorth = 60000 - 20000 = 40000
      expect(result.accountBalances).toBe(10000);
      expect(result.assetValues).toBe(50000);
      expect(result.totalAssets).toBe(60000);
      expect(result.totalLiabilities).toBe(20000);
      expect(result.netWorth).toBe(40000);
    });
  });

  describe('getHistory()', () => {
    it('should return empty array when no snapshots exist', () => {
      const result = NetWorthService.getHistory(userId, {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(result).toHaveLength(0);
    });

    it('should return snapshots within date range ordered by date', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Insert snapshots
      db.insert(networthSnapshots).values([
        { userId, totalAssets: 100000, totalLiabilities: 20000, netWorth: 80000, date: '2024-01-15', createdAt: now },
        { userId, totalAssets: 110000, totalLiabilities: 18000, netWorth: 92000, date: '2024-02-15', createdAt: now },
        { userId, totalAssets: 120000, totalLiabilities: 16000, netWorth: 104000, date: '2024-03-15', createdAt: now },
        { userId, totalAssets: 130000, totalLiabilities: 14000, netWorth: 116000, date: '2024-04-15', createdAt: now },
      ]).run();

      const result = NetWorthService.getHistory(userId, {
        startDate: '2024-02-01',
        endDate: '2024-03-31',
      });

      expect(result).toHaveLength(2);
      expect(result[0]!.date).toBe('2024-02-15');
      expect(result[1]!.date).toBe('2024-03-15');
      expect(result[0]!.netWorth).toBe(92000);
      expect(result[1]!.netWorth).toBe(104000);
    });
  });

  describe('Asset CRUD', () => {
    it('should create an asset', () => {
      const result = NetWorthService.createAsset(userId, {
        name: 'Casa',
        value: 1000000,
        type: 'Propiedad',
        notes: 'Casa en CDMX',
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Casa');
      expect(result.value).toBe(1000000);
      expect(result.type).toBe('Propiedad');
      expect(result.notes).toBe('Casa en CDMX');
    });

    it('should throw error when creating asset with empty name', () => {
      expect(() =>
        NetWorthService.createAsset(userId, {
          name: '',
          value: 1000,
          type: 'Otro',
        })
      ).toThrow(NetWorthError);
    });

    it('should update an asset', () => {
      const asset = NetWorthService.createAsset(userId, {
        name: 'Auto',
        value: 200000,
        type: 'Veh�culo',
      });

      const updated = NetWorthService.updateAsset(asset.id, userId, {
        value: 180000,
      });

      expect(updated!.value).toBe(180000);
      expect(updated!.name).toBe('Auto');
    });

    it('should throw error when updating non-existent asset', () => {
      expect(() =>
        NetWorthService.updateAsset(999, userId, { value: 100 })
      ).toThrow(NetWorthError);
    });

    it('should delete an asset', () => {
      const asset = NetWorthService.createAsset(userId, {
        name: 'Laptop',
        value: 25000,
        type: 'Electr�nica',
      });

      const result = NetWorthService.deleteAsset(asset.id, userId);
      expect(result.deleted).toBe(true);

      const found = NetWorthService.getAssetById(asset.id, userId);
      expect(found).toBeNull();
    });

    it('should throw error when deleting non-existent asset', () => {
      expect(() =>
        NetWorthService.deleteAsset(999, userId)
      ).toThrow(NetWorthError);
    });

    it('should list all assets for a user', () => {
      NetWorthService.createAsset(userId, { name: 'Casa', value: 500000, type: 'Propiedad' });
      NetWorthService.createAsset(userId, { name: 'Auto', value: 200000, type: 'Veh�culo' });

      const list = NetWorthService.listAssets(userId);
      expect(list).toHaveLength(2);
    });
  });

  describe('Liability CRUD', () => {
    it('should create a liability', () => {
      const result = NetWorthService.createLiability(userId, {
        name: 'Hipoteca',
        balance: 800000,
        type: 'Hipoteca',
        notes: 'BBVA hipoteca',
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Hipoteca');
      expect(result.balance).toBe(800000);
      expect(result.type).toBe('Hipoteca');
      expect(result.notes).toBe('BBVA hipoteca');
    });

    it('should throw error when creating liability with empty name', () => {
      expect(() =>
        NetWorthService.createLiability(userId, {
          name: '',
          balance: 1000,
          type: 'Otro',
        })
      ).toThrow(NetWorthError);
    });

    it('should update a liability', () => {
      const liability = NetWorthService.createLiability(userId, {
        name: 'Pr�stamo auto',
        balance: 150000,
        type: 'Pr�stamo',
      });

      const updated = NetWorthService.updateLiability(liability.id, userId, {
        balance: 140000,
      });

      expect(updated!.balance).toBe(140000);
      expect(updated!.name).toBe('Pr�stamo auto');
    });

    it('should throw error when updating non-existent liability', () => {
      expect(() =>
        NetWorthService.updateLiability(999, userId, { balance: 100 })
      ).toThrow(NetWorthError);
    });

    it('should delete a liability', () => {
      const liability = NetWorthService.createLiability(userId, {
        name: 'Tarjeta',
        balance: 5000,
        type: 'Tarjeta de Cr�dito',
      });

      const result = NetWorthService.deleteLiability(liability.id, userId);
      expect(result.deleted).toBe(true);

      const found = NetWorthService.getLiabilityById(liability.id, userId);
      expect(found).toBeNull();
    });

    it('should throw error when deleting non-existent liability', () => {
      expect(() =>
        NetWorthService.deleteLiability(999, userId)
      ).toThrow(NetWorthError);
    });

    it('should list all liabilities for a user', () => {
      NetWorthService.createLiability(userId, { name: 'Hipoteca', balance: 800000, type: 'Hipoteca' });
      NetWorthService.createLiability(userId, { name: 'Pr�stamo', balance: 50000, type: 'Pr�stamo' });

      const list = NetWorthService.listLiabilities(userId);
      expect(list).toHaveLength(2);
    });
  });

  describe('createSnapshot()', () => {
    it('should create a snapshot of current net worth', async () => {
      const db = getDb();
      const now = new Date().toISOString();

      db.insert(accounts).values({
        userId,
        name: 'Banco',
        type: 'D�bito',
        initialBalance: 25000,
        status: 'Activo',
        currency: 'MXN',
        createdAt: now,
        updatedAt: now,
      }).run();

      NetWorthService.createAsset(userId, { name: 'Auto', value: 100000, type: 'Veh�culo' });
      NetWorthService.createLiability(userId, { name: 'Pr�stamo', balance: 30000, type: 'Pr�stamo' });

      const snapshot = await NetWorthService.createSnapshot(userId);

      expect(snapshot.totalAssets).toBe(125000); // 25000 + 100000
      expect(snapshot.totalLiabilities).toBe(30000);
      expect(snapshot.netWorth).toBe(95000); // 125000 - 30000
      expect(snapshot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
