import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ReportService } from './report.service.js';
import { CustomReportService, CustomReportError } from './custom-report.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, accounts, categories, transactions } from '../db/schema.js';
import fs from 'node:fs';

process.env['DATA_DIR'] = './data/test-report-depth';
process.env['JWT_SECRET'] = 'test-secret';

describe('ReportService — P4.10 depth', () => {
  let userId: number;
  let accountId: number;
  let categoryId: number;

  beforeAll(() => {
    const sqlite = getSqlite();
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password_hash TEXT, name TEXT, role TEXT DEFAULT 'user', disabled INTEGER DEFAULT 0, totp_secret TEXT, totp_enabled INTEGER NOT NULL DEFAULT 0, totp_backup_codes TEXT, created_at TEXT, updated_at TEXT);
      CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, type TEXT, bank TEXT, initial_balance REAL DEFAULT 0, balance_limit REAL, credit_limit REAL, statement_day INTEGER, payment_due_day INTEGER, apr REAL, minimum_payment REAL, status TEXT DEFAULT 'Activo', currency TEXT DEFAULT 'MXN', exchange_rate REAL NOT NULL DEFAULT 1, created_at TEXT, updated_at TEXT);
      CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, key TEXT, name TEXT, icon TEXT, color TEXT, type TEXT DEFAULT 'Ambos', is_system INTEGER DEFAULT 0, created_at TEXT);
      CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, account_id INTEGER, category_id INTEGER, subcategory_id INTEGER, name TEXT, amount REAL, type TEXT, date TEXT, notes TEXT, merchant TEXT, subtype TEXT, reconciled INTEGER DEFAULT 0, status TEXT DEFAULT 'posted', external_id TEXT, attachment_id INTEGER, import_id INTEGER, created_at TEXT, updated_at TEXT);
    `);
  });

  beforeEach(() => {
    const sqlite = getSqlite();
    for (const t of ['custom_reports', 'transactions', 'categories', 'accounts', 'users']) {
      try { sqlite.exec(`DELETE FROM ${t}`); } catch { /* may not exist yet */ }
    }
    const db = getDb();
    const now = new Date().toISOString();
    userId = db.insert(users).values({ email: 'a@b.c', passwordHash: 'x', name: 'T', role: 'user', createdAt: now, updatedAt: now }).returning().get().id;
    accountId = db.insert(accounts).values({ userId, name: 'Débito', type: 'Débito', initialBalance: 0, status: 'Activo', currency: 'MXN', createdAt: now, updatedAt: now }).returning().get().id;
    categoryId = db.insert(categories).values({ userId, name: 'Gastos', isSystem: false, createdAt: now }).returning().get().id;
  });

  afterAll(() => {
    closeDatabase();
    try { fs.rmSync('./data/test-report-depth', { recursive: true, force: true }); } catch { /* ignore */ }
  });

  function tx(over: Partial<{ name: string; merchant: string; amount: number; type: string; date: string }> = {}) {
    const db = getDb();
    const now = new Date().toISOString();
    db.insert(transactions).values({
      userId, accountId, categoryId,
      name: over.name ?? 'Compra', amount: over.amount ?? 100, type: over.type ?? 'Gasto',
      date: over.date ?? '2026-02-10', merchant: over.merchant ?? null, createdAt: now, updatedAt: now,
    }).run();
  }

  describe('getSavingsRate()', () => {
    it('computes savings and savings rate for the period', () => {
      tx({ type: 'Ingreso', amount: 1000, date: '2026-02-01' });
      tx({ type: 'Gasto', amount: 400, date: '2026-02-05' });

      const r = ReportService.getSavingsRate(userId, { startDate: '2026-02-01', endDate: '2026-02-28' });
      expect(r.totalIncome).toBe(1000);
      expect(r.totalExpenses).toBe(400);
      expect(r.totalSavings).toBe(600);
      expect(r.savingsRate).toBe(60); // 600/1000
      expect(r.entries).toHaveLength(1);
      expect(r.entries[0]!.savingsRate).toBe(60);
    });

    it('reports a 0 rate when there is no income', () => {
      tx({ type: 'Gasto', amount: 200, date: '2026-02-05' });
      const r = ReportService.getSavingsRate(userId, { startDate: '2026-02-01', endDate: '2026-02-28' });
      expect(r.savingsRate).toBe(0);
    });
  });

  describe('getMerchantReport()', () => {
    it('groups expenses by merchant (falling back to name) and orders by total', () => {
      tx({ merchant: 'Oxxo', amount: 50, type: 'Gasto', date: '2026-02-01' });
      tx({ merchant: 'Oxxo', amount: 70, type: 'Gasto', date: '2026-02-02' });
      tx({ merchant: 'Amazon', amount: 300, type: 'Gasto', date: '2026-02-03' });
      tx({ name: 'Sin comercio', amount: 25, type: 'Gasto', date: '2026-02-04' });
      tx({ merchant: 'Ignorar', amount: 999, type: 'Ingreso', date: '2026-02-05' }); // income excluded

      const r = ReportService.getMerchantReport(userId, { startDate: '2026-02-01', endDate: '2026-02-28' });
      expect(r.merchants[0]!.merchant).toBe('Amazon');
      expect(r.merchants[0]!.total).toBe(300);
      const oxxo = r.merchants.find((m) => m.merchant === 'Oxxo')!;
      expect(oxxo.total).toBe(120);
      expect(oxxo.count).toBe(2);
      expect(r.merchants.find((m) => m.merchant === 'Sin comercio')).toBeDefined();
      expect(r.merchants.find((m) => m.merchant === 'Ignorar')).toBeUndefined();
    });
  });

  describe('CustomReportService', () => {
    it('creates, lists, and deletes a custom report', () => {
      const created = CustomReportService.create(userId, { name: 'Mis gastos', type: 'merchant', config: { limit: 10 } });
      expect(created.id).toBeGreaterThan(0);
      expect(created.type).toBe('merchant');
      expect(created.config).toEqual({ limit: 10 });

      const list = CustomReportService.list(userId);
      expect(list).toHaveLength(1);

      CustomReportService.delete(created.id, userId);
      expect(CustomReportService.list(userId)).toHaveLength(0);
    });

    it('rejects an invalid report type', () => {
      expect(() => CustomReportService.create(userId, { name: 'X', type: 'bogus' })).toThrow(CustomReportError);
    });

    it('rejects an empty name', () => {
      expect(() => CustomReportService.create(userId, { name: '  ', type: 'debt' })).toThrow(CustomReportError);
    });

    it('throws when deleting a non-existent report', () => {
      expect(() => CustomReportService.delete(99999, userId)).toThrow(CustomReportError);
    });
  });

  // ── P4.11: multi-currency conversion in aggregations ──
  describe('multi-currency conversion', () => {
    it('converts foreign-currency amounts to base in reports', () => {
      const db = getDb();
      const now = new Date().toISOString();
      // Base-currency (MXN, rate 1) expense of 100 + a USD (rate 20) expense of 10 = 200 base.
      const usdAcc = db.insert(accounts).values({
        userId, name: 'USD', type: 'Débito', initialBalance: 0, status: 'Activo',
        currency: 'USD', exchangeRate: 20, createdAt: now, updatedAt: now,
      }).returning().get().id;

      tx({ merchant: 'Base Store', amount: 100, type: 'Gasto', date: '2026-02-01' });
      db.insert(transactions).values({
        userId, accountId: usdAcc, categoryId, name: 'USD buy', merchant: 'USD Store',
        amount: 10, type: 'Gasto', date: '2026-02-02', createdAt: now, updatedAt: now,
      }).run();

      // Savings rate report: total expenses in base = 100 + 10*20 = 300.
      const sr = ReportService.getSavingsRate(userId, { startDate: '2026-02-01', endDate: '2026-02-28' });
      expect(sr.totalExpenses).toBe(300);

      // Merchant report: the USD merchant's total is converted (10*20 = 200).
      const m = ReportService.getMerchantReport(userId, { startDate: '2026-02-01', endDate: '2026-02-28' });
      const usdMerchant = m.merchants.find((x) => x.merchant === 'USD Store')!;
      expect(usdMerchant.total).toBe(200);
      expect(m.totalSpend).toBe(300);
    });
  });
});
