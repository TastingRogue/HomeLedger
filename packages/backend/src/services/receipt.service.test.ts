import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ReceiptService } from './receipt.service.js';
import { getSqlite, closeDatabase } from '../db/connection.js';
import fs from 'node:fs';

process.env['DATA_DIR'] = './data/test-receipt-service';
process.env['JWT_SECRET'] = 'test-secret';

/**
 * Covers the P4.6 CFDI flow: createTransaction (single + split from categorized
 * items) and setItemCategory. ReceiptService uses raw sqlite; TransactionService
 * (used by createTransaction) needs accounts/categories/transactions/audit tables.
 */
describe('ReceiptService — P4.6 CFDI flow', () => {
  let userId: number;
  let accountId: number;
  let categoryId: number;
  let category2Id: number;

  beforeAll(() => {
    const sqlite = getSqlite();
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password_hash TEXT, name TEXT, role TEXT DEFAULT 'user', disabled INTEGER DEFAULT 0, totp_secret TEXT, totp_enabled INTEGER NOT NULL DEFAULT 0, totp_backup_codes TEXT, created_at TEXT, updated_at TEXT);
      CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, type TEXT, bank TEXT, initial_balance REAL DEFAULT 0, balance_limit REAL, credit_limit REAL, statement_day INTEGER, payment_due_day INTEGER, apr REAL, minimum_payment REAL, status TEXT DEFAULT 'Activo', currency TEXT DEFAULT 'MXN', exchange_rate REAL NOT NULL DEFAULT 1, created_at TEXT, updated_at TEXT);
      CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, key TEXT, name TEXT, icon TEXT, color TEXT, type TEXT DEFAULT 'Ambos', is_system INTEGER DEFAULT 0, created_at TEXT);
      CREATE TABLE IF NOT EXISTS subcategories (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER, name TEXT, created_at TEXT);
      CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, account_id INTEGER, category_id INTEGER, subcategory_id INTEGER, name TEXT, amount REAL, type TEXT, date TEXT, notes TEXT, merchant TEXT, subtype TEXT, reconciled INTEGER DEFAULT 0, status TEXT DEFAULT 'posted', external_id TEXT, attachment_id INTEGER, import_id INTEGER, created_at TEXT, updated_at TEXT);
      CREATE TABLE IF NOT EXISTS transaction_splits (id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_id INTEGER, category_id INTEGER, amount REAL, note TEXT);
      CREATE TABLE IF NOT EXISTS transaction_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_id INTEGER, user_id INTEGER, action TEXT, changes TEXT, created_at TEXT);
      CREATE TABLE IF NOT EXISTS attachments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, transaction_id INTEGER, transfer_id INTEGER, filename TEXT, original_name TEXT, mime_type TEXT, size INTEGER, path TEXT, created_at TEXT);
    `);
  });

  beforeEach(() => {
    const sqlite = getSqlite();
    for (const t of ['receipt_items', 'receipt_analyses', 'transaction_splits', 'transaction_audit', 'transactions', 'attachments', 'categories', 'accounts', 'users']) {
      try { sqlite.exec(`DELETE FROM ${t}`); } catch { /* table may not exist yet */ }
    }
    const now = new Date().toISOString();
    userId = Number(sqlite.prepare("INSERT INTO users (email, password_hash, name, role, created_at, updated_at) VALUES ('a@b.c','x','T','user',?,?)").run(now, now).lastInsertRowid);
    accountId = Number(sqlite.prepare("INSERT INTO accounts (user_id, name, type, initial_balance, status, currency, created_at, updated_at) VALUES (?, 'Cuenta','Débito',10000,'Activo','MXN',?,?)").run(userId, now, now).lastInsertRowid);
    categoryId = Number(sqlite.prepare("INSERT INTO categories (user_id, name, is_system, created_at) VALUES (?, 'Gastos', 0, ?)").run(userId, now).lastInsertRowid);
    category2Id = Number(sqlite.prepare("INSERT INTO categories (user_id, name, is_system, created_at) VALUES (?, 'Otros', 0, ?)").run(userId, now).lastInsertRowid);
  });

  afterAll(() => {
    closeDatabase();
    try { fs.rmSync('./data/test-receipt-service', { recursive: true, force: true }); } catch { /* ignore */ }
  });

  /** Insert an attachment + a completed receipt analysis (+ optional items). */
  function seedReceipt(total: number, items: { description: string; total: number }[] = []): number {
    const sqlite = getSqlite();
    const now = new Date().toISOString();
    const attId = Number(sqlite.prepare("INSERT INTO attachments (user_id, filename, original_name, mime_type, size, path, created_at) VALUES (?, 'f.xml','f.xml','text/xml',10,'/tmp/f.xml',?)").run(userId, now).lastInsertRowid);
    // analyze() would create this; we insert directly to isolate createTransaction.
    ReceiptService.list(userId); // triggers ensureTables()
    const rId = Number(sqlite.prepare("INSERT INTO receipt_analyses (attachment_id, user_id, merchant, total, currency, document_type, source_type, status, confidence, uuid, created_at, updated_at) VALUES (?, ?, 'OXXO', ?, 'MXN', 'cfdi', 'cfdi_xml', 'completed', 1, 'UUID-1', ?, ?)").run(attId, userId, total, now, now).lastInsertRowid);
    const insItem = sqlite.prepare('INSERT INTO receipt_items (analysis_id, description, quantity, unit_price, total, category_id) VALUES (?, ?, 1, ?, ?, NULL)');
    for (const it of items) insItem.run(rId, it.description, it.total, it.total);
    return rId;
  }

  it('createTransaction creates a linked expense with the receipt total', () => {
    const rId = seedReceipt(116.0);
    const updated = ReceiptService.createTransaction(rId, userId, { accountId, categoryId });
    expect(updated.transactionId).not.toBeNull();
    const tx = getSqlite().prepare('SELECT * FROM transactions WHERE id = ?').get(updated.transactionId) as { amount: number; type: string; external_id: string };
    expect(tx.amount).toBe(116);
    expect(tx.type).toBe('Gasto');
    expect(tx.external_id).toBe('UUID-1'); // UUID → externalId for dedupe
  });

  it('createTransaction refuses when already linked', () => {
    const rId = seedReceipt(50);
    ReceiptService.createTransaction(rId, userId, { accountId, categoryId });
    expect(() => ReceiptService.createTransaction(rId, userId, { accountId, categoryId })).toThrow();
  });

  it('createTransaction splits by categorized items when they sum to the total', () => {
    const rId = seedReceipt(100, [
      { description: 'Item A', total: 60 },
      { description: 'Item B', total: 40 },
    ]);
    // categorize the two items
    const receipt = ReceiptService.get(rId, userId)!;
    ReceiptService.setItemCategory(rId, receipt.items[0]!.id, userId, categoryId);
    ReceiptService.setItemCategory(rId, receipt.items[1]!.id, userId, category2Id);

    const updated = ReceiptService.createTransaction(rId, userId, { accountId, categoryId });
    const splits = getSqlite().prepare('SELECT * FROM transaction_splits WHERE transaction_id = ?').all(updated.transactionId) as unknown[];
    expect(splits).toHaveLength(2);
  });

  it('setItemCategory assigns a category to a line item', () => {
    const rId = seedReceipt(100, [{ description: 'Item A', total: 100 }]);
    const receipt = ReceiptService.get(rId, userId)!;
    const updated = ReceiptService.setItemCategory(rId, receipt.items[0]!.id, userId, categoryId);
    expect(updated!.items[0]!.categoryId).toBe(categoryId);
  });
});
