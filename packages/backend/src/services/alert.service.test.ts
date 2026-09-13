import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AlertService } from './alert.service.js';
import * as schema from '../db/schema.js';
import * as connectionModule from '../db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let testDb: ReturnType<typeof drizzle<typeof schema>>;
let sqlite: Database.Database;

function setupTestDb() {
  sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  testDb = drizzle(sqlite, { schema });

  const migrationsFolder = path.resolve(__dirname, '../db/migrations');
  migrate(testDb, { migrationsFolder });
}

function teardownTestDb() {
  sqlite.close();
}

function seedTestUser(userId = 1): number {
  const now = new Date().toISOString();
  testDb.insert(schema.users).values({
    id: userId,
    email: `user${userId}@test.com`,
    passwordHash: 'hashed',
    name: `User ${userId}`,
    role: 'user',
    createdAt: now,
    updatedAt: now,
  }).run();
  return userId;
}

function seedCategory(userId: number, name = 'General'): number {
  const now = new Date().toISOString();
  const result = testDb.insert(schema.categories).values({
    userId,
    name,
    isSystem: false,
    createdAt: now,
  }).returning().get();
  return result.id;
}

function seedAccount(userId: number, overrides: Partial<typeof schema.accounts.$inferInsert> = {}) {
  const now = new Date().toISOString();
  return testDb.insert(schema.accounts).values({
    userId,
    name: overrides.name ?? 'Cuenta Test',
    type: overrides.type ?? 'Débito',
    initialBalance: overrides.initialBalance ?? 5000,
    balanceLimit: overrides.balanceLimit ?? null,
    creditLimit: overrides.creditLimit ?? null,
    status: overrides.status ?? 'Activo',
    currency: 'MXN',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }).returning().get();
}

function seedSubscription(userId: number, accountId: number, categoryId: number, overrides: Partial<typeof schema.subscriptions.$inferInsert> = {}) {
  const now = new Date().toISOString();
  return testDb.insert(schema.subscriptions).values({
    userId,
    accountId,
    categoryId,
    name: overrides.name ?? 'Netflix',
    amount: overrides.amount ?? 199,
    cycle: overrides.cycle ?? 'Mensual',
    startDate: overrides.startDate ?? '2024-01-01',
    nextPaymentDate: overrides.nextPaymentDate ?? '2024-02-01',
    autoCharge: overrides.autoCharge ?? false,
    status: overrides.status ?? 'Activa',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }).returning().get();
}

function seedGoal(userId: number, overrides: Partial<typeof schema.goals.$inferInsert> = {}) {
  const now = new Date().toISOString();
  return testDb.insert(schema.goals).values({
    userId,
    name: overrides.name ?? 'Meta Test',
    targetAmount: overrides.targetAmount ?? 10000,
    savedAmount: overrides.savedAmount ?? 0,
    type: overrides.type ?? 'ListaDeseos',
    status: overrides.status ?? 'Activa',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }).returning().get();
}

/**
 * Helper to get a date string N days from today.
 */
function daysFromToday(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('AlertService', () => {
  beforeEach(() => {
    setupTestDb();
    vi.spyOn(connectionModule, 'getDb').mockReturnValue(testDb as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    teardownTestDb();
  });

  describe('generateHash()', () => {
    it('debe generar un hash SHA-256 determinista', () => {
      const hash1 = AlertService.generateHash('balance_low_1');
      const hash2 = AlertService.generateHash('balance_low_1');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('debe generar hashes diferentes para claves diferentes', () => {
      const hash1 = AlertService.generateHash('balance_low_1');
      const hash2 = AlertService.generateHash('balance_low_2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createAlert() - deduplication', () => {
    it('debe crear una alerta si el hash no existe', () => {
      const userId = seedTestUser();
      const hash = AlertService.generateHash('test_key');

      const result = AlertService.createAlert(
        userId,
        'balance_low',
        'Test Title',
        'Test Message',
        'warning',
        hash
      );

      expect(result).not.toBeNull();
      expect(result!.type).toBe('balance_low');
      expect(result!.title).toBe('Test Title');
    });

    it('debe retornar null si el hash ya existe (deduplicaci�n)', () => {
      const userId = seedTestUser();
      const hash = AlertService.generateHash('test_key');

      AlertService.createAlert(userId, 'balance_low', 'First', 'Message', 'warning', hash);
      const second = AlertService.createAlert(userId, 'balance_low', 'Second', 'Message', 'warning', hash);

      expect(second).toBeNull();
    });
  });

  describe('evaluateBalanceLow()', () => {
    it('debe generar alerta cuando balance cae bajo el l�mite', async () => {
      const userId = seedTestUser();
      seedAccount(userId, {
        name: 'D�bito',
        initialBalance: 500,
        balanceLimit: 1000,
      });

      const result = await AlertService.evaluateBalanceLow(userId);

      expect(result).toHaveLength(1);
    });

    it('no debe generar alerta si balance est� por encima del l�mite', async () => {
      const userId = seedTestUser();
      seedAccount(userId, {
        name: 'D�bito',
        initialBalance: 5000,
        balanceLimit: 1000,
      });

      const result = await AlertService.evaluateBalanceLow(userId);

      expect(result).toHaveLength(0);
    });

    it('debe omitir cuentas sin balanceLimit configurado (Req 9.6)', async () => {
      const userId = seedTestUser();
      seedAccount(userId, {
        name: 'Sin L�mite',
        initialBalance: 100,
        balanceLimit: null,
      });

      const result = await AlertService.evaluateBalanceLow(userId);

      expect(result).toHaveLength(0);
    });

    it('no debe duplicar alerta para la misma cuenta', async () => {
      const userId = seedTestUser();
      seedAccount(userId, {
        name: 'D�bito',
        initialBalance: 500,
        balanceLimit: 1000,
      });

      const first = await AlertService.evaluateBalanceLow(userId);
      const second = await AlertService.evaluateBalanceLow(userId);

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(0);
    });

    it('debe eliminar alerta cuando balance se recupera', async () => {
      const userId = seedTestUser();
      const account = seedAccount(userId, {
        name: 'D�bito',
        initialBalance: 500,
        balanceLimit: 1000,
      });

      // Generar alerta
      await AlertService.evaluateBalanceLow(userId);

      // Actualizar balance por encima del l�mite
      testDb.update(schema.accounts)
        .set({ initialBalance: 2000 })
        .where(eq(schema.accounts.id, account.id))
        .run();

      // Re-evaluar: deber�a eliminar la alerta existente
      await AlertService.evaluateBalanceLow(userId);

      const allAlerts = AlertService.list(userId);
      expect(allAlerts).toHaveLength(0);
    });
  });

  describe('evaluateCreditHigh()', () => {
    it('debe generar alerta cuando utilizaci�n = 80%', async () => {
      const userId = seedTestUser();
      // Balance negativo de -8000 con l�mite de 10000 = 80% utilizaci�n
      seedAccount(userId, {
        name: 'Tarjeta',
        type: 'Crédito',
        initialBalance: -8000,
        creditLimit: 10000,
      });

      const result = await AlertService.evaluateCreditHigh(userId);

      expect(result).toHaveLength(1);
    });

    it('no debe generar alerta cuando utilizaci�n < 80%', async () => {
      const userId = seedTestUser();
      seedAccount(userId, {
        name: 'Tarjeta',
        type: 'Crédito',
        initialBalance: -5000,
        creditLimit: 10000,
      });

      const result = await AlertService.evaluateCreditHigh(userId);

      expect(result).toHaveLength(0);
    });

    it('no debe duplicar alerta (non-repetitive)', async () => {
      const userId = seedTestUser();
      seedAccount(userId, {
        name: 'Tarjeta',
        type: 'Crédito',
        initialBalance: -9000,
        creditLimit: 10000,
      });

      const first = await AlertService.evaluateCreditHigh(userId);
      const second = await AlertService.evaluateCreditHigh(userId);

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(0);
    });

    it('debe eliminar alerta cuando utilizaci�n baja de 80%', async () => {
      const userId = seedTestUser();
      const account = seedAccount(userId, {
        name: 'Tarjeta',
        type: 'Crédito',
        initialBalance: -9000,
        creditLimit: 10000,
      });

      await AlertService.evaluateCreditHigh(userId);

      // Reducir balance (simular pago)
      testDb.update(schema.accounts)
        .set({ initialBalance: -3000 })
        .where(eq(schema.accounts.id, account.id))
        .run();

      await AlertService.evaluateCreditHigh(userId);

      const allAlerts = AlertService.list(userId);
      const creditAlerts = allAlerts.filter(a => a.type === 'credit_high');
      expect(creditAlerts).toHaveLength(0);
    });

    it('debe ignorar cuentas que no son de tipo Cr�dito', async () => {
      const userId = seedTestUser();
      seedAccount(userId, {
        name: 'Débito',
        type: 'Débito',
        initialBalance: -8000,
        creditLimit: 10000,
      });

      const result = await AlertService.evaluateCreditHigh(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('evaluatePaymentDue()', () => {
    it('debe generar alerta cuando suscripci�n tiene =3 d�as restantes', () => {
      const userId = seedTestUser();
      const account = seedAccount(userId);
      const catId = seedCategory(userId);

      seedSubscription(userId, account.id, catId, {
        name: 'Spotify',
        amount: 115,
        nextPaymentDate: daysFromToday(2),
      });

      const result = AlertService.evaluatePaymentDue(userId);

      expect(result).toHaveLength(1);
    });

    it('no debe generar alerta si faltan m�s de 3 d�as', () => {
      const userId = seedTestUser();
      const account = seedAccount(userId);
      const catId = seedCategory(userId);

      seedSubscription(userId, account.id, catId, {
        nextPaymentDate: daysFromToday(5),
      });

      const result = AlertService.evaluatePaymentDue(userId);

      expect(result).toHaveLength(0);
    });

    it('no debe generar alerta si daysRemaining = 0 (eso es overdue)', () => {
      const userId = seedTestUser();
      const account = seedAccount(userId);
      const catId = seedCategory(userId);

      seedSubscription(userId, account.id, catId, {
        nextPaymentDate: daysFromToday(0),
      });

      const result = AlertService.evaluatePaymentDue(userId);

      expect(result).toHaveLength(0);
    });

    it('debe deduplicar por subscriptionId + nextPaymentDate', () => {
      const userId = seedTestUser();
      const account = seedAccount(userId);
      const catId = seedCategory(userId);

      seedSubscription(userId, account.id, catId, {
        name: 'Netflix',
        nextPaymentDate: daysFromToday(1),
      });

      const first = AlertService.evaluatePaymentDue(userId);
      const second = AlertService.evaluatePaymentDue(userId);

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(0);
    });
  });

  describe('evaluatePaymentOverdue()', () => {
    it('debe generar alerta cuando daysRemaining = 0', () => {
      const userId = seedTestUser();
      const account = seedAccount(userId);
      const catId = seedCategory(userId);

      seedSubscription(userId, account.id, catId, {
        name: 'HBO',
        amount: 150,
        nextPaymentDate: daysFromToday(0),
      });

      const result = AlertService.evaluatePaymentOverdue(userId);

      expect(result).toHaveLength(1);
    });

    it('debe generar alerta cuando daysRemaining < 0 (vencido)', () => {
      const userId = seedTestUser();
      const account = seedAccount(userId);
      const catId = seedCategory(userId);

      seedSubscription(userId, account.id, catId, {
        name: 'HBO',
        nextPaymentDate: daysFromToday(-2),
      });

      const result = AlertService.evaluatePaymentOverdue(userId);

      expect(result).toHaveLength(1);
    });

    it('no debe generar alerta si faltan d�as', () => {
      const userId = seedTestUser();
      const account = seedAccount(userId);
      const catId = seedCategory(userId);

      seedSubscription(userId, account.id, catId, {
        nextPaymentDate: daysFromToday(5),
      });

      const result = AlertService.evaluatePaymentOverdue(userId);

      expect(result).toHaveLength(0);
    });

    it('debe deduplicar por subscriptionId + nextPaymentDate', () => {
      const userId = seedTestUser();
      const account = seedAccount(userId);
      const catId = seedCategory(userId);

      seedSubscription(userId, account.id, catId, {
        nextPaymentDate: daysFromToday(0),
      });

      const first = AlertService.evaluatePaymentOverdue(userId);
      const second = AlertService.evaluatePaymentOverdue(userId);

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(0);
    });
  });

  describe('evaluateGoalCompleted()', () => {
    it('debe generar alerta cuando meta est� completada', () => {
      const userId = seedTestUser();
      seedGoal(userId, {
        name: 'Moto Chopper',
        targetAmount: 50000,
        savedAmount: 50000,
        status: 'Completada',
      });

      const result = AlertService.evaluateGoalCompleted(userId);

      expect(result).toHaveLength(1);
    });

    it('no debe generar alerta para metas activas', () => {
      const userId = seedTestUser();
      seedGoal(userId, {
        name: 'Moto Chopper',
        targetAmount: 50000,
        savedAmount: 25000,
        status: 'Activa',
      });

      const result = AlertService.evaluateGoalCompleted(userId);

      expect(result).toHaveLength(0);
    });

    it('debe deduplicar por goalId', () => {
      const userId = seedTestUser();
      seedGoal(userId, {
        name: 'Meta Cumplida',
        targetAmount: 1000,
        savedAmount: 1000,
        status: 'Completada',
      });

      const first = AlertService.evaluateGoalCompleted(userId);
      const second = AlertService.evaluateGoalCompleted(userId);

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(0);
    });
  });

  describe('evaluateAll()', () => {
    it('debe ejecutar todas las evaluaciones', async () => {
      const userId = seedTestUser();
      const account = seedAccount(userId, {
        name: 'Cuenta',
        initialBalance: 500,
        balanceLimit: 1000,
      });
      const catId = seedCategory(userId);

      seedSubscription(userId, account.id, catId, {
        nextPaymentDate: daysFromToday(2),
      });
      seedGoal(userId, {
        targetAmount: 1000,
        savedAmount: 1000,
        status: 'Completada',
      });

      const result = await AlertService.evaluateAll(userId);

      expect(result.balanceLow).toHaveLength(1);
      expect(result.paymentDue).toHaveLength(1);
      expect(result.goalCompleted).toHaveLength(1);
    });
  });

  describe('removeAlertByHash()', () => {
    it('debe eliminar una alerta por su hash', () => {
      const userId = seedTestUser();
      const hash = AlertService.generateHash('test_remove');

      AlertService.createAlert(userId, 'balance_low', 'Test', 'Msg', 'warning', hash);
      expect(AlertService.hashExists(hash)).toBe(true);

      AlertService.removeAlertByHash(hash);
      expect(AlertService.hashExists(hash)).toBe(false);
    });
  });

  describe('markAsRead()', () => {
    it('debe marcar una alerta como le�da', () => {
      const userId = seedTestUser();
      const hash = AlertService.generateHash('mark_read_test');

      const alert = AlertService.createAlert(userId, 'balance_low', 'Test', 'Msg', 'warning', hash);
      expect(alert!.isRead).toBe(false);

      AlertService.markAsRead(alert!.id, userId);

      const allAlerts = AlertService.list(userId);
      expect(allAlerts[0]!.isRead).toBe(true);
    });
  });

  describe('markAllAsRead()', () => {
    it('debe marcar todas las alertas del usuario como le�das', () => {
      const userId = seedTestUser();

      AlertService.createAlert(userId, 'balance_low', 'A1', 'Msg', 'warning', AlertService.generateHash('a1'));
      AlertService.createAlert(userId, 'credit_high', 'A2', 'Msg', 'critical', AlertService.generateHash('a2'));

      AlertService.markAllAsRead(userId);

      const unread = AlertService.listUnread(userId);
      expect(unread).toHaveLength(0);
    });
  });
});
