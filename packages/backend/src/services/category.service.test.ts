import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CategoryService } from './category.service.js';
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

function seedSystemCategories(): void {
  const now = new Date().toISOString();
  const systemCats = ['Comida', 'Compras', 'Renta', 'Transporte', 'Salud'];
  testDb.insert(schema.categories).values(
    systemCats.map((name) => ({
      name,
      userId: null,
      isSystem: true,
      createdAt: now,
    }))
  ).run();
}

function seedAccount(userId: number, name = 'Cuenta Test'): number {
  const now = new Date().toISOString();
  const result = testDb.insert(schema.accounts).values({
    userId,
    name,
    type: 'D�bito',
    initialBalance: 10000,
    status: 'Activo',
    currency: 'MXN',
    createdAt: now,
    updatedAt: now,
  }).returning().get();
  return result.id;
}

function seedUserCategory(userId: number, name: string): number {
  const now = new Date().toISOString();
  const result = testDb.insert(schema.categories).values({
    userId,
    name,
    isSystem: false,
    createdAt: now,
  }).returning().get();
  return result.id;
}

function seedTransaction(
  userId: number,
  accountId: number,
  categoryId: number,
  amount: number,
  type: 'Ingreso' | 'Gasto',
  date: string
): number {
  const now = new Date().toISOString();
  const result = testDb.insert(schema.transactions).values({
    userId,
    accountId,
    categoryId,
    name: `Transacci�n ${type}`,
    amount,
    type,
    date,
    createdAt: now,
    updatedAt: now,
  }).returning().get();
  return result.id;
}

describe('CategoryService', () => {
  beforeEach(() => {
    setupTestDb();
    vi.spyOn(connectionModule, 'getDb').mockReturnValue(testDb as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    teardownTestDb();
  });

  describe('list()', () => {
    it('debe retornar categor�as del sistema y del usuario', async () => {
      const userId = seedTestUser();
      seedSystemCategories();
      seedUserCategory(userId, 'Mi Categor�a');

      const result = await CategoryService.list(userId);

      expect(result.length).toBe(6); // 5 sistema + 1 usuario
      const names = result.map((c) => c.name);
      expect(names).toContain('Comida');
      expect(names).toContain('Mi Categor�a');
    });

    it('debe incluir subcategor�as en el resultado', async () => {
      const userId = seedTestUser();
      const categoryId = seedUserCategory(userId, 'Comida');

      const now = new Date().toISOString();
      testDb.insert(schema.subcategories).values([
        { categoryId, name: 'Restaurantes', createdAt: now },
        { categoryId, name: 'Supermercado', createdAt: now },
      ]).run();

      const result = await CategoryService.list(userId);
      const comida = result.find((c) => c.name === 'Comida');

      expect(comida).toBeDefined();
      expect(comida!.subcategories).toHaveLength(2);
      expect(comida!.subcategories.map((s) => s.name).sort()).toEqual(['Restaurantes', 'Supermercado']);
    });

    it('debe retornar lista vac�a si no hay categor�as', async () => {
      const userId = seedTestUser();
      const result = await CategoryService.list(userId);
      expect(result).toHaveLength(0);
    });

    it('no debe retornar categor�as de otros usuarios', async () => {
      const user1 = seedTestUser(1);
      const user2 = seedTestUser(2);
      seedUserCategory(user1, 'Categor�a de User1');
      seedUserCategory(user2, 'Categor�a de User2');

      const result = await CategoryService.list(user1);
      const names = result.map((c) => c.name);
      expect(names).toContain('Categor�a de User1');
      expect(names).not.toContain('Categor�a de User2');
    });
  });

  describe('create()', () => {
    it('debe crear una categor�a para el usuario', async () => {
      const userId = seedTestUser();

      const result = await CategoryService.create(userId, { name: 'Nueva Categor�a' });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Nueva Categor�a');
      expect(result.userId).toBe(userId);
      expect(result.isSystem).toBe(false);
    });

    it('debe rechazar nombre vac�o', async () => {
      const userId = seedTestUser();

      await expect(
        CategoryService.create(userId, { name: '   ' })
      ).rejects.toThrow('El nombre de la categor�a no puede estar vac�o');
    });

    it('debe rechazar nombre mayor a 50 caracteres', async () => {
      const userId = seedTestUser();
      const longName = 'A'.repeat(51);

      await expect(
        CategoryService.create(userId, { name: longName })
      ).rejects.toThrow('El nombre de la categor�a no puede exceder 50 caracteres');
    });

    it('debe rechazar nombre duplicado con categor�a del sistema', async () => {
      const userId = seedTestUser();
      seedSystemCategories();

      await expect(
        CategoryService.create(userId, { name: 'Comida' })
      ).rejects.toThrow('Ya existe una categor�a con ese nombre');
    });

    it('debe rechazar nombre duplicado con categor�a propia del usuario', async () => {
      const userId = seedTestUser();
      await CategoryService.create(userId, { name: 'Mi Categor�a' });

      await expect(
        CategoryService.create(userId, { name: 'Mi Categor�a' })
      ).rejects.toThrow('Ya existe una categor�a con ese nombre');
    });

    it('debe permitir nombre que existe en otro usuario', async () => {
      const user1 = seedTestUser(1);
      const user2 = seedTestUser(2);

      await CategoryService.create(user1, { name: 'Personal' });
      const result = await CategoryService.create(user2, { name: 'Personal' });

      expect(result.name).toBe('Personal');
    });

    it('debe aceptar nombre exactamente de 50 caracteres', async () => {
      const userId = seedTestUser();
      const name50 = 'A'.repeat(50);

      const result = await CategoryService.create(userId, { name: name50 });
      expect(result.name).toBe(name50);
    });
  });

  describe('delete()', () => {
    it('debe eliminar una categor�a sin transacciones', async () => {
      const userId = seedTestUser();
      const categoryId = seedUserCategory(userId, 'Para Eliminar');

      await CategoryService.delete(categoryId);

      const result = await CategoryService.list(userId);
      expect(result.find((c) => c.name === 'Para Eliminar')).toBeUndefined();
    });

    it('debe rechazar eliminaci�n si tiene transacciones asociadas', async () => {
      const userId = seedTestUser();
      const categoryId = seedUserCategory(userId, 'Con Transacciones');
      const accountId = seedAccount(userId);

      seedTransaction(userId, accountId, categoryId, 100, 'Gasto', '2024-01-15');

      await expect(
        CategoryService.delete(categoryId)
      ).rejects.toThrow('No se puede eliminar la categor�a porque tiene transacciones asociadas');
    });

    it('debe rechazar eliminaci�n de categor�a del sistema', async () => {
      seedTestUser();
      seedSystemCategories();

      // Obtener una categor�a del sistema
      const systemCat = testDb.select().from(schema.categories)
        .where(schema.categories.isSystem ? undefined : undefined)
        .all()
        .find((c) => c.isSystem);

      await expect(
        CategoryService.delete(systemCat!.id)
      ).rejects.toThrow('No se puede eliminar una categor�a del sistema');
    });

    it('debe lanzar error si la categor�a no existe', async () => {
      await expect(
        CategoryService.delete(999)
      ).rejects.toThrow('Categor�a no encontrada');
    });

    it('debe eliminar subcategor�as en cascada', async () => {
      const userId = seedTestUser();
      const categoryId = seedUserCategory(userId, 'Con Subs');

      const now = new Date().toISOString();
      testDb.insert(schema.subcategories).values([
        { categoryId, name: 'Sub1', createdAt: now },
        { categoryId, name: 'Sub2', createdAt: now },
      ]).run();

      await CategoryService.delete(categoryId);

      const subs = testDb.select().from(schema.subcategories).all();
      expect(subs).toHaveLength(0);
    });
  });

  describe('getAnalysis()', () => {
    it('debe calcular totales por categor�a para gastos', async () => {
      const userId = seedTestUser();
      const cat1Id = seedUserCategory(userId, 'Comida');
      const cat2Id = seedUserCategory(userId, 'Transporte');
      const accountId = seedAccount(userId);

      seedTransaction(userId, accountId, cat1Id, 200, 'Gasto', '2024-01-10');
      seedTransaction(userId, accountId, cat1Id, 300, 'Gasto', '2024-01-20');
      seedTransaction(userId, accountId, cat2Id, 150, 'Gasto', '2024-01-15');

      const result = await CategoryService.getAnalysis(userId, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toHaveLength(2);
      // Ordenado por total desc
      expect(result[0]!.categoryName).toBe('Comida');
      expect(result[0]!.total).toBe(500);
      expect(result[1]!.categoryName).toBe('Transporte');
      expect(result[1]!.total).toBe(150);
    });

    it('debe excluir categor�as con total cero', async () => {
      const userId = seedTestUser();
      const cat1Id = seedUserCategory(userId, 'Con Gastos');
      seedUserCategory(userId, 'Sin Gastos');
      const accountId = seedAccount(userId);

      seedTransaction(userId, accountId, cat1Id, 100, 'Gasto', '2024-01-10');

      const result = await CategoryService.getAnalysis(userId, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.categoryName).toBe('Con Gastos');
    });

    it('debe calcular porcentajes correctamente', async () => {
      const userId = seedTestUser();
      const cat1Id = seedUserCategory(userId, 'Renta');
      const cat2Id = seedUserCategory(userId, 'Comida');
      const accountId = seedAccount(userId);

      seedTransaction(userId, accountId, cat1Id, 750, 'Gasto', '2024-01-05');
      seedTransaction(userId, accountId, cat2Id, 250, 'Gasto', '2024-01-10');

      const result = await CategoryService.getAnalysis(userId, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toHaveLength(2);
      // Total = 1000, Renta = 75%, Comida = 25%
      expect(result[0]!.percentage).toBeCloseTo(75, 1);
      expect(result[1]!.percentage).toBeCloseTo(25, 1);
    });

    it('debe usar el mes actual como rango por defecto', async () => {
      const userId = seedTestUser();
      const catId = seedUserCategory(userId, 'Test');
      const accountId = seedAccount(userId);

      const now = new Date();
      const currentMonthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
      seedTransaction(userId, accountId, catId, 100, 'Gasto', currentMonthDate);

      // Transacci�n fuera del mes actual (mes pasado)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const lastMonthDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-15`;
      seedTransaction(userId, accountId, catId, 500, 'Gasto', lastMonthDate);

      const result = await CategoryService.getAnalysis(userId);

      expect(result).toHaveLength(1);
      expect(result[0]!.total).toBe(100);
    });

    it('debe ignorar transacciones de tipo Ingreso', async () => {
      const userId = seedTestUser();
      const catId = seedUserCategory(userId, 'N�mina');
      const accountId = seedAccount(userId);

      seedTransaction(userId, accountId, catId, 1000, 'Ingreso', '2024-01-15');
      seedTransaction(userId, accountId, catId, 50, 'Gasto', '2024-01-15');

      const result = await CategoryService.getAnalysis(userId, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.total).toBe(50);
    });

    it('debe retornar lista vac�a si no hay gastos en el rango', async () => {
      const userId = seedTestUser();
      seedUserCategory(userId, 'Vac�a');
      seedAccount(userId);

      const result = await CategoryService.getAnalysis(userId, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toHaveLength(0);
    });

    it('debe ordenar por total descendente', async () => {
      const userId = seedTestUser();
      const cat1Id = seedUserCategory(userId, 'Menor');
      const cat2Id = seedUserCategory(userId, 'Mayor');
      const cat3Id = seedUserCategory(userId, 'Medio');
      const accountId = seedAccount(userId);

      seedTransaction(userId, accountId, cat1Id, 100, 'Gasto', '2024-01-10');
      seedTransaction(userId, accountId, cat2Id, 500, 'Gasto', '2024-01-10');
      seedTransaction(userId, accountId, cat3Id, 250, 'Gasto', '2024-01-10');

      const result = await CategoryService.getAnalysis(userId, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result[0]!.categoryName).toBe('Mayor');
      expect(result[1]!.categoryName).toBe('Medio');
      expect(result[2]!.categoryName).toBe('Menor');
    });
  });
});
