import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AccountService } from './account.service.js';
import { AccountType } from '@smart-finance/shared';
import * as schema from '../db/schema.js';
import * as connectionModule from '../db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We'll mock the getDb function to return our in-memory database
let testDb: ReturnType<typeof drizzle<typeof schema>>;
let sqlite: Database.Database;

function setupTestDb() {
  sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  testDb = drizzle(sqlite, { schema });

  // Run migrations
  const migrationsFolder = path.resolve(__dirname, '../db/migrations');
  migrate(testDb, { migrationsFolder });
}

function teardownTestDb() {
  sqlite.close();
}

// Seed a test user and return its ID
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

// Seed a category for transactions
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

describe('AccountService', () => {
  beforeEach(() => {
    setupTestDb();
    // Mock getDb to return our test database
    vi.spyOn(connectionModule, 'getDb').mockReturnValue(testDb as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    teardownTestDb();
  });

  describe('create()', () => {
    it('debe crear una cuenta con todos los campos obligatorios', async () => {
      const userId = seedTestUser();

      const result = await AccountService.create(userId, {
        name: 'Cuenta Ahorros',
        initialBalance: 1000,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Cuenta Ahorros');
      expect(result.initialBalance).toBe(1000);
      expect(result.type).toBe('Débito');
      expect(result.status).toBe('Activo');
      expect(result.currency).toBe('MXN');
    });

    it('debe rechazar nombre duplicado entre cuentas activas del mismo usuario', async () => {
      const userId = seedTestUser();

      await AccountService.create(userId, {
        name: 'Mi Cuenta',
        initialBalance: 500,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      await expect(
        AccountService.create(userId, {
          name: 'Mi Cuenta',
          initialBalance: 200,
          type: AccountType.Efectivo,
          currency: 'MXN',
        })
      ).rejects.toThrow('Ya existe una cuenta activa con ese nombre');
    });

    it('debe permitir nombre duplicado entre usuarios diferentes', async () => {
      const user1 = seedTestUser(1);
      const user2 = seedTestUser(2);

      await AccountService.create(user1, {
        name: 'Débito',
        initialBalance: 100,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      const result = await AccountService.create(user2, {
        name: 'Débito',
        initialBalance: 200,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      expect(result.name).toBe('Débito');
    });

    it('debe permitir nombre duplicado si la cuenta existente está inactiva', async () => {
      const userId = seedTestUser();

      const account = await AccountService.create(userId, {
        name: 'Vieja Cuenta',
        initialBalance: 100,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      await AccountService.deactivate(account.id);

      const result = await AccountService.create(userId, {
        name: 'Vieja Cuenta',
        initialBalance: 300,
        type: AccountType.Efectivo,
        currency: 'MXN',
      });

      expect(result.name).toBe('Vieja Cuenta');
      expect(result.status).toBe('Activo');
    });

    it('debe crear cuenta con campos opcionales', async () => {
      const userId = seedTestUser();

      const result = await AccountService.create(userId, {
        name: 'Crédito BBVA',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        bank: 'BBVA',
        balanceLimit: -5000,
        creditLimit: 20000,
      });

      expect(result.bank).toBe('BBVA');
      expect(result.balanceLimit).toBe(-5000);
      expect(result.creditLimit).toBe(20000);
    });
  });

  describe('update()', () => {
    it('debe actualizar los campos de una cuenta existente', async () => {
      const userId = seedTestUser();
      const account = await AccountService.create(userId, {
        name: 'Original',
        initialBalance: 1000,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      const updated = await AccountService.update(account.id, {
        name: 'Actualizada',
        initialBalance: 2000,
      });

      expect(updated!.name).toBe('Actualizada');
      expect(updated!.initialBalance).toBe(2000);
    });

    it('debe rechazar cambio de nombre si ya existe otra cuenta activa con ese nombre', async () => {
      const userId = seedTestUser();

      await AccountService.create(userId, {
        name: 'Cuenta A',
        initialBalance: 100,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      const cuentaB = await AccountService.create(userId, {
        name: 'Cuenta B',
        initialBalance: 200,
        type: AccountType.Efectivo,
        currency: 'MXN',
      });

      await expect(
        AccountService.update(cuentaB.id, { name: 'Cuenta A' })
      ).rejects.toThrow('Ya existe una cuenta activa con ese nombre');
    });

    it('debe permitir actualizar sin cambiar el nombre', async () => {
      const userId = seedTestUser();
      const account = await AccountService.create(userId, {
        name: 'Mi Cuenta',
        initialBalance: 100,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      const updated = await AccountService.update(account.id, {
        name: 'Mi Cuenta',
        initialBalance: 500,
      });

      expect(updated!.initialBalance).toBe(500);
    });

    it('debe lanzar error si la cuenta no existe', async () => {
      await expect(
        AccountService.update(999, { name: 'Test' })
      ).rejects.toThrow('Cuenta no encontrada');
    });
  });

  describe('deactivate()', () => {
    it('debe cambiar el estado a Inactivo', async () => {
      const userId = seedTestUser();
      const account = await AccountService.create(userId, {
        name: 'Para Desactivar',
        initialBalance: 100,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      await AccountService.deactivate(account.id);

      const result = await AccountService.getById(account.id);
      expect(result!.status).toBe('Inactivo');
    });

    it('debe lanzar error si la cuenta no existe', async () => {
      await expect(
        AccountService.deactivate(999)
      ).rejects.toThrow('Cuenta no encontrada');
    });
  });

  describe('getActive()', () => {
    it('debe retornar solo cuentas activas del usuario', async () => {
      const userId = seedTestUser();

      await AccountService.create(userId, {
        name: 'Activa 1',
        initialBalance: 100,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      const toDeactivate = await AccountService.create(userId, {
        name: 'Inactiva',
        initialBalance: 200,
        type: AccountType.Efectivo,
        currency: 'MXN',
      });

      await AccountService.create(userId, {
        name: 'Activa 2',
        initialBalance: 300,
        type: AccountType.Vales,
        currency: 'MXN',
      });

      await AccountService.deactivate(toDeactivate.id);

      const result = await AccountService.getActive(userId);
      expect(result).toHaveLength(2);
      expect(result.map(a => a.name).sort()).toEqual(['Activa 1', 'Activa 2']);
    });

    it('debe retornar lista vacía si no hay cuentas activas', async () => {
      const userId = seedTestUser();
      const result = await AccountService.getActive(userId);
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateBalance()', () => {
    it('debe retornar el balance inicial cuando no hay transacciones ni transferencias', async () => {
      const userId = seedTestUser();
      const account = await AccountService.create(userId, {
        name: 'Test',
        initialBalance: 5000,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      const balance = await AccountService.calculateBalance(account.id);
      expect(balance).toBe(5000);
    });

    it('debe sumar ingresos y restar gastos correctamente', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'Test',
        initialBalance: 1000,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      const now = new Date().toISOString();

      // Registrar un ingreso de 500
      testDb.insert(schema.transactions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Nómina',
        amount: 500,
        type: 'Ingreso',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      // Registrar un gasto de 200
      testDb.insert(schema.transactions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Comida',
        amount: 200,
        type: 'Gasto',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      const balance = await AccountService.calculateBalance(account.id);
      // 1000 + 500 - 200 = 1300
      expect(balance).toBe(1300);
    });

    it('debe incluir transferencias en el cálculo', async () => {
      const userId = seedTestUser();
      const account1 = await AccountService.create(userId, {
        name: 'Origen',
        initialBalance: 3000,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      const account2 = await AccountService.create(userId, {
        name: 'Destino',
        initialBalance: 1000,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      const now = new Date().toISOString();

      // Transferencia de 500 de account1 a account2
      testDb.insert(schema.transfers).values({
        userId,
        sourceAccountId: account1.id,
        destinationAccountId: account2.id,
        name: 'Transferencia',
        amount: 500,
        date: now,
        createdAt: now,
      }).run();

      const balance1 = await AccountService.calculateBalance(account1.id);
      const balance2 = await AccountService.calculateBalance(account2.id);

      // account1: 3000 - 500 = 2500
      expect(balance1).toBe(2500);
      // account2: 1000 + 500 = 1500
      expect(balance2).toBe(1500);
    });

    it('debe lanzar error si la cuenta no existe', async () => {
      await expect(
        AccountService.calculateBalance(999)
      ).rejects.toThrow('Cuenta no encontrada');
    });
  });

  describe('validateUniqueName()', () => {
    it('debe retornar true si no existe cuenta activa con ese nombre', async () => {
      const userId = seedTestUser();

      const isUnique = await AccountService.validateUniqueName(userId, 'Nueva Cuenta');
      expect(isUnique).toBe(true);
    });

    it('debe retornar false si ya existe cuenta activa con ese nombre', async () => {
      const userId = seedTestUser();
      await AccountService.create(userId, {
        name: 'Existente',
        initialBalance: 0,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      const isUnique = await AccountService.validateUniqueName(userId, 'Existente');
      expect(isUnique).toBe(false);
    });

    it('debe excluir una cuenta específica al validar (para edición)', async () => {
      const userId = seedTestUser();
      const account = await AccountService.create(userId, {
        name: 'Mi Cuenta',
        initialBalance: 0,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      // Debería ser válido excluir la propia cuenta
      const isUnique = await AccountService.validateUniqueName(userId, 'Mi Cuenta', account.id);
      expect(isUnique).toBe(true);
    });
  });

  describe('calculateCreditUtilization()', () => {
    it('debe calcular utilización como |balance| / creditLimit * 100', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'Tarjeta Crédito',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 10000,
      });

      const now = new Date().toISOString();

      // Registrar un gasto de 3000 (balance será -3000)
      testDb.insert(schema.transactions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Compra',
        amount: 3000,
        type: 'Gasto',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      const utilization = await AccountService.calculateCreditUtilization(account.id);
      // |0 - 3000| / 10000 * 100 = 30%
      expect(utilization).toBe(30);
    });

    it('debe retornar 0% cuando no hay gastos', async () => {
      const userId = seedTestUser();
      const account = await AccountService.create(userId, {
        name: 'TC Limpia',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 20000,
      });

      const utilization = await AccountService.calculateCreditUtilization(account.id);
      expect(utilization).toBe(0);
    });

    it('debe manejar utilización mayor a 100%', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'TC Sobrepasada',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 5000,
      });

      const now = new Date().toISOString();

      // Gastar más del límite
      testDb.insert(schema.transactions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Compra grande',
        amount: 7500,
        type: 'Gasto',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      const utilization = await AccountService.calculateCreditUtilization(account.id);
      // |0 - 7500| / 5000 * 100 = 150%
      expect(utilization).toBe(150);
    });

    it('debe lanzar error si la cuenta no es de tipo Crédito', async () => {
      const userId = seedTestUser();
      const account = await AccountService.create(userId, {
        name: 'Ahorros Test',
        initialBalance: 1000,
        type: AccountType.Debito,
        currency: 'MXN',
      });

      await expect(
        AccountService.calculateCreditUtilization(account.id)
      ).rejects.toThrow('La cuenta no es de tipo Crédito');
    });

    it('debe lanzar error si no tiene límite de Crédito configurado', async () => {
      const userId = seedTestUser();
      const account = await AccountService.create(userId, {
        name: 'TC Sin límite',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
      });

      await expect(
        AccountService.calculateCreditUtilization(account.id)
      ).rejects.toThrow('La cuenta de crédito no tiene un límite de crédito válido configurado');
    });

    it('debe lanzar error si la cuenta no existe', async () => {
      await expect(
        AccountService.calculateCreditUtilization(999)
      ).rejects.toThrow('Cuenta no encontrada');
    });

    it('debe redondear a 2 decimales', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'TC Decimales',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 3000,
      });

      const now = new Date().toISOString();

      // Gasto que produce utilización con muchos decimales: 1000/3000 = 33.333...%
      testDb.insert(schema.transactions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Compra',
        amount: 1000,
        type: 'Gasto',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      const utilization = await AccountService.calculateCreditUtilization(account.id);
      expect(utilization).toBe(33.33);
    });
  });

  describe('getCreditHealthStatus()', () => {
    it('debe retornar "saludable" para utilización 0-30%', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'TC Saludable',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 10000,
      });

      const now = new Date().toISOString();

      // 20% utilización
      testDb.insert(schema.transactions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Gasto pequeño',
        amount: 2000,
        type: 'Gasto',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      const result = await AccountService.getCreditHealthStatus(account.id);
      expect(result.status).toBe('saludable');
      expect(result.utilization).toBe(20);
    });

    it('debe retornar "saludable" en el límite de 30%', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'TC 30',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 10000,
      });

      const now = new Date().toISOString();

      testDb.insert(schema.transactions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Gasto',
        amount: 3000,
        type: 'Gasto',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      const result = await AccountService.getCreditHealthStatus(account.id);
      expect(result.status).toBe('saludable');
      expect(result.utilization).toBe(30);
    });

    it('debe retornar "moderado" para utilización 31-70%', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'TC Moderada',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 10000,
      });

      const now = new Date().toISOString();

      // 50% utilización
      testDb.insert(schema.transactions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Gasto medio',
        amount: 5000,
        type: 'Gasto',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      const result = await AccountService.getCreditHealthStatus(account.id);
      expect(result.status).toBe('moderado');
      expect(result.utilization).toBe(50);
    });

    it('debe retornar "crítico" para utilización 71-100%+', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'TC Crítica',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 10000,
      });

      const now = new Date().toISOString();

      // 85% utilización
      testDb.insert(schema.transactions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Gasto grande',
        amount: 8500,
        type: 'Gasto',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      const result = await AccountService.getCreditHealthStatus(account.id);
      expect(result.status).toBe('crítico');
      expect(result.utilization).toBe(85);
    });

    it('debe retornar "crítico" para utilización mayor a 100%', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'TC Excedida',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 5000,
      });

      const now = new Date().toISOString();

      testDb.insert(schema.transactions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Gasto enorme',
        amount: 6000,
        type: 'Gasto',
        date: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      const result = await AccountService.getCreditHealthStatus(account.id);
      expect(result.status).toBe('crítico');
      expect(result.utilization).toBe(120);
    });

    it('debe retornar "saludable" con 0% cuando no hay gastos', async () => {
      const userId = seedTestUser();
      const account = await AccountService.create(userId, {
        name: 'TC Nueva',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 10000,
      });

      const result = await AccountService.getCreditHealthStatus(account.id);
      expect(result.status).toBe('saludable');
      expect(result.utilization).toBe(0);
    });
  });

  describe('getLinkedSubscriptions()', () => {
    it('debe retornar suscripciones vinculadas a una cuenta de Crédito', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'TC con Subs',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 10000,
      });

      const now = new Date().toISOString();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      // Format as local date string to avoid UTC conversion issues
      const futureDateStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

      // Crear suscripción
      const sub = testDb.insert(schema.subscriptions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Netflix',
        amount: 199,
        cycle: 'Mensual',
        startDate: now,
        nextPaymentDate: futureDateStr,
        autoCharge: true,
        status: 'Activa',
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      // Vincular suscripción a la cuenta de Crédito
      testDb.insert(schema.creditSubscriptions).values({
        accountId: account.id,
        subscriptionId: sub.id,
      }).run();

      const linked = await AccountService.getLinkedSubscriptions(account.id);

      expect(linked).toHaveLength(1);
      expect(linked[0]!.name).toBe('Netflix');
      expect(linked[0]!.amount).toBe(199);
      expect(linked[0]!.cycle).toBe('Mensual');
      expect(linked[0]!.daysRemaining).toBe(15);
    });

    it('debe retornar lista vacía si no hay suscripciones vinculadas', async () => {
      const userId = seedTestUser();
      const account = await AccountService.create(userId, {
        name: 'TC Sin Subs',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 10000,
      });

      const linked = await AccountService.getLinkedSubscriptions(account.id);
      expect(linked).toHaveLength(0);
    });

    it('debe incluir días restantes correctos para cada suscripción', async () => {
      const userId = seedTestUser();
      const categoryId = seedCategory(userId);
      const account = await AccountService.create(userId, {
        name: 'TC Multi Subs',
        initialBalance: 0,
        type: AccountType.Credito,
        currency: 'MXN',
        creditLimit: 20000,
      });

      const now = new Date().toISOString();

      // suscripción con 5 días restantes
      const fivedays = new Date();
      fivedays.setDate(fivedays.getDate() + 5);
      const fivedaysStr = `${fivedays.getFullYear()}-${String(fivedays.getMonth() + 1).padStart(2, '0')}-${String(fivedays.getDate()).padStart(2, '0')}`;

      const sub1 = testDb.insert(schema.subscriptions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'Spotify',
        amount: 99,
        cycle: 'Mensual',
        startDate: now,
        nextPaymentDate: fivedaysStr,
        autoCharge: false,
        status: 'Activa',
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      // suscripción con 20 días restantes
      const twentydays = new Date();
      twentydays.setDate(twentydays.getDate() + 20);
      const twentydaysStr = `${twentydays.getFullYear()}-${String(twentydays.getMonth() + 1).padStart(2, '0')}-${String(twentydays.getDate()).padStart(2, '0')}`;

      const sub2 = testDb.insert(schema.subscriptions).values({
        userId,
        accountId: account.id,
        categoryId,
        name: 'HBO Max',
        amount: 149,
        cycle: 'Mensual',
        startDate: now,
        nextPaymentDate: twentydaysStr,
        autoCharge: true,
        status: 'Activa',
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      // Vincular ambas suscripciones
      testDb.insert(schema.creditSubscriptions).values([
        { accountId: account.id, subscriptionId: sub1.id },
        { accountId: account.id, subscriptionId: sub2.id },
      ]).run();

      const linked = await AccountService.getLinkedSubscriptions(account.id);

      expect(linked).toHaveLength(2);
      const spotify = linked.find(s => s.name === 'Spotify');
      const hbo = linked.find(s => s.name === 'HBO Max');
      expect(spotify!.daysRemaining).toBe(5);
      expect(hbo!.daysRemaining).toBe(20);
    });

    it('debe lanzar error si la cuenta no existe', async () => {
      await expect(
        AccountService.getLinkedSubscriptions(999)
      ).rejects.toThrow('Cuenta no encontrada');
    });
  });
});
