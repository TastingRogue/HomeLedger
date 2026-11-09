import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import * as connection from './connection.js';
import * as schema from './schema.js';
import { seedCategoriesForUser } from './seed.js';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: fileURLToPath(new URL('./migrations', import.meta.url)) });
  vi.spyOn(connection, 'getDb').mockReturnValue(db);
  const now = new Date().toISOString();
  db.insert(schema.users)
    .values({
      id: 1,
      email: 'locale@example.test',
      name: 'Locale test',
      passwordHash: 'hash',
      createdAt: now,
      updatedAt: now,
    })
    .run();
});

afterEach(() => {
  vi.restoreAllMocks();
  sqlite.close();
});

describe('Portuguese default categories', () => {
  it('seeds translated names while preserving stable keys, stored types, and user edits', () => {
    seedCategoriesForUser(1, 'pt-BR');
    const categories = db.select().from(schema.categories).all();
    expect(categories).toHaveLength(16);
    expect(categories.find((category) => category.key === 'income')).toMatchObject({
      name: 'Receitas',
      type: 'Ingreso',
      userId: 1,
    });
    expect(categories.find((category) => category.key === 'uncategorized')).toMatchObject({
      name: 'Sem categoria',
      type: 'Ambos',
    });
    seedCategoriesForUser(1, 'en');
    expect(db.select().from(schema.categories).all()).toEqual(categories);
  });
});
