import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SearchService } from './search.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, accounts, categories, transactions, subscriptions, tags, transactionTags } from '../db/schema.js';
import fs from 'node:fs';

process.env['DATA_DIR'] = './data/test-search';
process.env['JWT_SECRET'] = 'test-secret';

describe('SearchService', () => {
  let userId: number;
  let otherUserId: number;
  let accountId: number;
  let otherAccountId: number;
  let categoryId: number;

  beforeAll(() => {
    const sqlite = getSqlite();
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password_hash TEXT, name TEXT, role TEXT DEFAULT 'user', disabled INTEGER DEFAULT 0, totp_secret TEXT, totp_enabled INTEGER NOT NULL DEFAULT 0, totp_backup_codes TEXT, created_at TEXT, updated_at TEXT);
      CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, type TEXT, bank TEXT, initial_balance REAL DEFAULT 0, balance_limit REAL, credit_limit REAL, statement_day INTEGER, payment_due_day INTEGER, apr REAL, minimum_payment REAL, status TEXT DEFAULT 'Activo', currency TEXT DEFAULT 'MXN', exchange_rate REAL NOT NULL DEFAULT 1, created_at TEXT, updated_at TEXT);
      CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, key TEXT, name TEXT, icon TEXT, color TEXT, type TEXT DEFAULT 'Ambos', is_system INTEGER DEFAULT 0, created_at TEXT);
      CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, account_id INTEGER, category_id INTEGER, subcategory_id INTEGER, name TEXT, amount REAL, type TEXT, date TEXT, notes TEXT, merchant TEXT, subtype TEXT, reconciled INTEGER DEFAULT 0, status TEXT DEFAULT 'posted', external_id TEXT, attachment_id INTEGER, import_id INTEGER, created_at TEXT, updated_at TEXT);
      CREATE TABLE IF NOT EXISTS subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, account_id INTEGER, category_id INTEGER, name TEXT, amount REAL, cycle TEXT, start_date TEXT, next_payment_date TEXT, auto_charge INTEGER DEFAULT 0, status TEXT DEFAULT 'Activa', created_at TEXT, updated_at TEXT);
      CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, color TEXT, created_at TEXT);
      CREATE TABLE IF NOT EXISTS transaction_tags (transaction_id INTEGER, tag_id INTEGER, PRIMARY KEY (transaction_id, tag_id));
      CREATE TABLE IF NOT EXISTS receipt_analyses (id INTEGER PRIMARY KEY AUTOINCREMENT, attachment_id INTEGER, user_id INTEGER, transaction_id INTEGER, merchant TEXT, receipt_date TEXT, subtotal REAL, tax REAL, total REAL, currency TEXT DEFAULT 'MXN', document_type TEXT DEFAULT 'unknown', source_type TEXT DEFAULT 'unknown', status TEXT DEFAULT 'pending', confidence REAL DEFAULT 0, raw_text TEXT, uuid TEXT, issuer_rfc TEXT, issuer_name TEXT, error TEXT, created_at TEXT, updated_at TEXT);
    `);
  });

  beforeEach(() => {
    const sqlite = getSqlite();
    for (const t of ['transaction_tags', 'tags', 'receipt_analyses', 'subscriptions', 'transactions', 'categories', 'accounts', 'users']) {
      sqlite.exec(`DELETE FROM ${t}`);
    }
    const db = getDb();
    const now = new Date().toISOString();
    userId = db.insert(users).values({ email: 'a@b.c', passwordHash: 'x', name: 'T', role: 'user', createdAt: now, updatedAt: now }).returning().get().id;
    otherUserId = db.insert(users).values({ email: 'z@b.c', passwordHash: 'x', name: 'Z', role: 'user', createdAt: now, updatedAt: now }).returning().get().id;
    accountId = db.insert(accounts).values({ userId, name: 'BBVA Débito', type: 'Débito', initialBalance: 0, status: 'Activo', currency: 'MXN', createdAt: now, updatedAt: now }).returning().get().id;
    otherAccountId = db.insert(accounts).values({ userId, name: 'Nu Crédito', type: 'Crédito', initialBalance: 0, status: 'Activo', currency: 'MXN', createdAt: now, updatedAt: now }).returning().get().id;
    categoryId = db.insert(categories).values({ userId, name: 'Comida', isSystem: false, createdAt: now }).returning().get().id;
  });

  afterAll(() => {
    closeDatabase();
    try { fs.rmSync('./data/test-search', { recursive: true, force: true }); } catch { /* ignore */ }
  });

  function tx(over: Partial<{ name: string; merchant: string; amount: number; type: string; date: string; accountId: number; notes: string }> = {}) {
    const db = getDb();
    const now = new Date().toISOString();
    return db.insert(transactions).values({
      userId, accountId: over.accountId ?? accountId, categoryId,
      name: over.name ?? 'Compra', amount: over.amount ?? 100, type: over.type ?? 'Gasto',
      date: over.date ?? '2026-02-10T12:00:00.000Z', merchant: over.merchant ?? null, notes: over.notes ?? null,
      createdAt: now, updatedAt: now,
    }).returning().get();
  }

  it('matches transactions by name, merchant, and notes', () => {
    tx({ name: 'Uber Eats', merchant: 'Uber' });
    tx({ name: 'Pago', merchant: 'Starbucks Reforma' });
    tx({ name: 'Otro', notes: 'nota con Starbucks dentro' });

    const byName = SearchService.search(userId, { q: 'uber' });
    expect(byName.transactions).toHaveLength(1);
    const byMerchantOrNotes = SearchService.search(userId, { q: 'starbucks' });
    expect(byMerchantOrNotes.transactions).toHaveLength(2);
  });

  it('scopes results to the user', () => {
    tx({ name: 'Netflix' });
    const res = SearchService.search(otherUserId, { q: 'netflix' });
    expect(res.transactions).toHaveLength(0);
  });

  it('applies txType, account, and amount-range filters', () => {
    tx({ name: 'Compra A', amount: 50, type: 'Gasto', accountId });
    tx({ name: 'Compra B', amount: 500, type: 'Gasto', accountId: otherAccountId });
    tx({ name: 'Ingreso C', amount: 500, type: 'Ingreso', accountId });

    expect(SearchService.search(userId, { txType: 'Ingreso' }).transactions).toHaveLength(1);
    expect(SearchService.search(userId, { accountId: otherAccountId }).transactions).toHaveLength(1);
    expect(SearchService.search(userId, { minAmount: 100 }).transactions).toHaveLength(2);
    expect(SearchService.search(userId, { minAmount: 100, maxAmount: 400 }).transactions).toHaveLength(0);
  });

  it('filters transactions by tag', () => {
    const db = getDb();
    const t1 = tx({ name: 'Con tag' });
    tx({ name: 'Sin tag' });
    const tag = db.insert(tags).values({ userId, name: 'viaje', createdAt: new Date().toISOString() }).returning().get();
    db.insert(transactionTags).values({ transactionId: t1.id, tagId: tag.id }).run();

    const res = SearchService.search(userId, { tagId: tag.id });
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0]!.name).toBe('Con tag');
  });

  it('matches receipts by merchant / RFC / uuid', () => {
    const sqlite = getSqlite();
    const now = new Date().toISOString();
    sqlite.prepare("INSERT INTO receipt_analyses (user_id, merchant, issuer_rfc, uuid, total, receipt_date, status, created_at, updated_at) VALUES (?, 'OXXO', 'AAA010101AAA', 'UUID-XYZ', 116, '2026-02-01', 'completed', ?, ?)").run(userId, now, now);

    expect(SearchService.search(userId, { q: 'oxxo' }).receipts).toHaveLength(1);
    expect(SearchService.search(userId, { q: 'AAA0101' }).receipts).toHaveLength(1);
    expect(SearchService.search(userId, { q: 'uuid-xyz' }).receipts).toHaveLength(1);
  });

  it('matches subscriptions by name and respects the type filter', () => {
    const db = getDb();
    const now = new Date().toISOString();
    db.insert(subscriptions).values({ userId, accountId, categoryId, name: 'Netflix', amount: 299, cycle: 'Mensual', startDate: '2026-01-01', nextPaymentDate: '2026-02-01', autoCharge: false, status: 'Activa', createdAt: now, updatedAt: now }).run();
    tx({ name: 'Netflix cargo' });

    const all = SearchService.search(userId, { q: 'netflix' });
    expect(all.subscriptions).toHaveLength(1);
    expect(all.transactions).toHaveLength(1);
    expect(all.totalCount).toBe(2);

    const onlySubs = SearchService.search(userId, { q: 'netflix', type: 'subscription' });
    expect(onlySubs.subscriptions).toHaveLength(1);
    expect(onlySubs.transactions).toHaveLength(0);
  });
});
