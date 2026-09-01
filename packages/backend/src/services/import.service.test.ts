import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { ImportService, ImportError } from './import.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, accounts, categories, transactions, imports, rules } from '../db/schema.js';
import fs from 'node:fs';

// Set test environment variables
process.env['DATA_DIR'] = './data/test-import';
process.env['JWT_SECRET'] = 'test-secret';

describe('ImportService', () => {
  let testUserId: number;
  let testAccountId: number;
  let testCategoryId: number;

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

      CREATE TABLE IF NOT EXISTS imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        parser TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        record_count INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        conditions TEXT NOT NULL DEFAULT '[]',
        actions TEXT NOT NULL DEFAULT '[]',
        enabled INTEGER NOT NULL DEFAULT 1,
        match_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  });

  beforeEach(() => {
    const db = getDb();
    // Clean all tables before each test
    db.delete(transactions).run();
    db.delete(imports).run();
    db.delete(rules).run();
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

    // Create test account
    const account = db.insert(accounts).values({
      userId: testUserId,
      name: 'Santander',
      type: 'D�bito',
      initialBalance: 5000,
      currency: 'MXN',
      status: 'Activo',
      createdAt: now,
      updatedAt: now,
    }).returning().get();
    testAccountId = account.id;

    // Create test category (Correcci�n as default)
    const category = db.insert(categories).values({
      userId: testUserId,
      name: 'Correcci�n',
      isSystem: true,
      createdAt: now,
    }).returning().get();
    testCategoryId = category.id;
  });

  afterAll(() => {
    closeDatabase();
    // Clean up test database file
    try {
      fs.rmSync('./data/test-import', { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  // Helper to build a valid BBVA CSV file
  function buildBBVACSV(rows: string[]): Buffer {
    const header = 'Fecha,Concepto,Cargo,Abono,Saldo';
    const content = [header, ...rows].join('\n');
    return Buffer.from(content, 'utf-8');
  }

  describe('upload()', () => {
    it('debe crear una sesi�n de importaci�n con parser auto-detectado', () => {
      const fileContent = buildBBVACSV([
        '01/01/2024,COMPRA OXXO,150.00,,4850.00',
      ]);

      const session = ImportService.upload(testUserId, fileContent, 'bbva_movimientos.csv', {
        accountId: testAccountId,
      });

      expect(session).toBeDefined();
      expect(session.id).toBeGreaterThan(0);
      expect(session.userId).toBe(testUserId);
      expect(session.filename).toBe('bbva_movimientos.csv');
      expect(session.parser).toBe('bbva_mx');
      expect(session.status).toBe('pending');
    });

    it('debe crear sesi�n con parser espec�fico', () => {
      const fileContent = buildBBVACSV([
        '01/01/2024,COMPRA OXXO,150.00,,4850.00',
      ]);

      const session = ImportService.upload(testUserId, fileContent, 'archivo.csv', {
        parser: 'bbva_mx',
        accountId: testAccountId,
      });

      expect(session.parser).toBe('bbva_mx');
    });

    it('debe rechazar archivo vac�o', () => {
      expect(() => {
        ImportService.upload(testUserId, Buffer.alloc(0), 'empty.csv', {
          accountId: testAccountId,
        });
      }).toThrow(ImportError);
    });

    it('debe rechazar formato no soportado', () => {
      const fileContent = Buffer.from('binary garbage data that is not csv', 'utf-8');

      expect(() => {
        ImportService.upload(testUserId, fileContent, 'file.xyz', {
          accountId: testAccountId,
        });
      }).toThrow(ImportError);
    });

    it('debe rechazar parser inexistente', () => {
      const fileContent = buildBBVACSV(['01/01/2024,COMPRA,100,,4900']);

      expect(() => {
        ImportService.upload(testUserId, fileContent, 'bbva.csv', {
          parser: 'nonexistent_parser',
          accountId: testAccountId,
        });
      }).toThrow(ImportError);
    });

    it('debe rechazar cuenta inexistente', () => {
      const fileContent = buildBBVACSV(['01/01/2024,COMPRA,100,,4900']);

      expect(() => {
        ImportService.upload(testUserId, fileContent, 'bbva.csv', {
          accountId: 99999,
        });
      }).toThrow(ImportError);
    });
  });

  describe('preview()', () => {
    it('debe retornar preview con transacciones parseadas', () => {
      const fileContent = buildBBVACSV([
        '01/01/2024,COMPRA OXXO,150.00,,4850.00',
        '02/01/2024,NOMINA,,5000.00,9850.00',
      ]);

      const session = ImportService.upload(testUserId, fileContent, 'bbva_movimientos.csv', {
        accountId: testAccountId,
      });

      const preview = ImportService.preview(session.id, testUserId);

      expect(preview.sessionId).toBe(session.id);
      expect(preview.transactions.length).toBe(2);
      expect(preview.totalCount).toBe(2);
      expect(preview.parser).toContain('BBVA');
      expect(preview.format).toBe('csv');
    });

    it('debe rechazar sesi�n inexistente', () => {
      expect(() => {
        ImportService.preview(99999, testUserId);
      }).toThrow(ImportError);
    });

    it('debe rechazar sesi�n de otro usuario', () => {
      const fileContent = buildBBVACSV(['01/01/2024,COMPRA,100,,4900']);
      const session = ImportService.upload(testUserId, fileContent, 'bbva.csv', {
        accountId: testAccountId,
      });

      expect(() => {
        ImportService.preview(session.id, 99999);
      }).toThrow(ImportError);
    });
  });

  describe('confirm()', () => {
    it('debe importar transacciones exitosamente', () => {
      const fileContent = buildBBVACSV([
        '01/01/2024,COMPRA OXXO,150.00,,4850.00',
        '02/01/2024,COMPRA WALMART,300.50,,4549.50',
      ]);

      const session = ImportService.upload(testUserId, fileContent, 'bbva_movimientos.csv', {
        accountId: testAccountId,
      });

      const result = ImportService.confirm(session.id, testUserId, {
        accountId: testAccountId,
        defaultCategoryId: testCategoryId,
      });

      expect(result.importedCount).toBe(2);
      expect(result.duplicateCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.transactions).toHaveLength(2);
    });

    it('debe detectar y omitir duplicados', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Insert existing transaction that matches the import
      db.insert(transactions).values({
        userId: testUserId,
        accountId: testAccountId,
        categoryId: testCategoryId,
        name: 'COMPRA OXXO',
        amount: 150.00,
        type: 'Gasto',
        date: '2024-01-01T12:00:00.000Z',
        createdAt: now,
        updatedAt: now,
      }).run();

      const fileContent = buildBBVACSV([
        '01/01/2024,COMPRA OXXO,150.00,,4850.00',
        '02/01/2024,COMPRA NUEVA,200.00,,4650.00',
      ]);

      const session = ImportService.upload(testUserId, fileContent, 'bbva_movimientos.csv', {
        accountId: testAccountId,
      });

      const result = ImportService.confirm(session.id, testUserId, {
        accountId: testAccountId,
        defaultCategoryId: testCategoryId,
      });

      expect(result.duplicateCount).toBe(1);
      expect(result.importedCount).toBe(1);
    });

    it('debe permitir seleccionar transacciones espec�ficas', () => {
      const fileContent = buildBBVACSV([
        '01/01/2024,COMPRA UNO,100.00,,4900.00',
        '02/01/2024,COMPRA DOS,200.00,,4700.00',
        '03/01/2024,COMPRA TRES,300.00,,4400.00',
      ]);

      const session = ImportService.upload(testUserId, fileContent, 'bbva_movimientos.csv', {
        accountId: testAccountId,
      });

      const result = ImportService.confirm(session.id, testUserId, {
        accountId: testAccountId,
        defaultCategoryId: testCategoryId,
        selectedTransactionIds: [0, 2], // Only first and third
      });

      expect(result.importedCount).toBe(2);
    });

    it('debe aplicar el motor de reglas para auto-categorizaci�n', () => {
      const db = getDb();
      const now = new Date().toISOString();

      // Create a "Comida" category
      const comidaCat = db.insert(categories).values({
        userId: testUserId,
        name: 'Comida',
        isSystem: false,
        createdAt: now,
      }).returning().get();

      // Create a rule: if name contains "OXXO" ? set category to Comida
      db.insert(rules).values({
        userId: testUserId,
        name: 'OXXO ? Comida',
        priority: 1,
        conditions: [
          { field: 'name', operator: 'contains', value: 'OXXO' },
        ] as any,
        actions: [
          { type: 'setCategory', value: comidaCat.id },
        ] as any,
        enabled: true,
        matchCount: 0,
        createdAt: now,
        updatedAt: now,
      }).run();

      const fileContent = buildBBVACSV([
        '05/01/2024,COMPRA OXXO REFORMA,85.50,,4914.50',
      ]);

      const session = ImportService.upload(testUserId, fileContent, 'bbva_movimientos.csv', {
        accountId: testAccountId,
      });

      const result = ImportService.confirm(session.id, testUserId, {
        accountId: testAccountId,
        defaultCategoryId: testCategoryId,
      });

      expect(result.importedCount).toBe(1);

      // Check that the transaction was categorized by the rules engine
      const importedTx = db.select().from(transactions)
        .where(
          and(
            eq(transactions.userId, testUserId),
            eq(transactions.name, 'COMPRA OXXO REFORMA'),
          ),
        )
        .get();

      expect(importedTx?.categoryId).toBe(comidaCat.id);
    });

    it('debe rechazar sesi�n ya confirmada', () => {
      const fileContent = buildBBVACSV(['01/01/2024,COMPRA,100,,4900']);
      const session = ImportService.upload(testUserId, fileContent, 'bbva_movimientos.csv', {
        accountId: testAccountId,
      });

      // First confirm
      ImportService.confirm(session.id, testUserId, {
        accountId: testAccountId,
        defaultCategoryId: testCategoryId,
      });

      // Second confirm should fail
      expect(() => {
        ImportService.confirm(session.id, testUserId, {
          accountId: testAccountId,
          defaultCategoryId: testCategoryId,
        });
      }).toThrow(ImportError);
    });

    it('debe rechazar si no hay cuenta destino', () => {
      const fileContent = buildBBVACSV(['01/01/2024,COMPRA,100,,4900']);
      const session = ImportService.upload(testUserId, fileContent, 'bbva_movimientos.csv');

      expect(() => {
        ImportService.confirm(session.id, testUserId, {
          defaultCategoryId: testCategoryId,
          // No accountId provided
        });
      }).toThrow(ImportError);
    });

    it('debe marcar la sesi�n como completada despu�s de confirmar', () => {
      const db = getDb();
      const fileContent = buildBBVACSV(['01/01/2024,COMPRA,100.00,,4900.00']);
      const session = ImportService.upload(testUserId, fileContent, 'bbva_movimientos.csv', {
        accountId: testAccountId,
      });

      ImportService.confirm(session.id, testUserId, {
        accountId: testAccountId,
        defaultCategoryId: testCategoryId,
      });

      const updated = db.select().from(imports)
        .where(eq(imports.id, session.id))
        .get();

      expect(updated?.status).toBe('completed');
      expect(updated?.recordCount).toBe(1);
    });
  });

  describe('getHistory()', () => {
    it('debe retornar el historial de importaciones del usuario', () => {
      const fileContent = buildBBVACSV(['01/01/2024,COMPRA,100,,4900']);

      ImportService.upload(testUserId, fileContent, 'file1.csv', {
        accountId: testAccountId,
      });
      ImportService.upload(testUserId, fileContent, 'file2.csv', {
        accountId: testAccountId,
      });

      const history = ImportService.getHistory(testUserId);
      expect(history.length).toBe(2);
    });

    it('no debe retornar importaciones de otro usuario', () => {
      const fileContent = buildBBVACSV(['01/01/2024,COMPRA,100,,4900']);
      ImportService.upload(testUserId, fileContent, 'file.csv', {
        accountId: testAccountId,
      });

      const history = ImportService.getHistory(99999);
      expect(history.length).toBe(0);
    });
  });

  describe('getAvailableParsers()', () => {
    it('debe retornar la lista de parsers disponibles', () => {
      const parsers = ImportService.getAvailableParsers();
      expect(parsers.length).toBeGreaterThan(0);
      expect(parsers[0]).toHaveProperty('bankId');
      expect(parsers[0]).toHaveProperty('bankName');
      expect(parsers[0]).toHaveProperty('supportedFormats');
    });
  });
});
