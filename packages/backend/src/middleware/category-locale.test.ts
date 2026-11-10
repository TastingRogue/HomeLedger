import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as connection from '../db/connection.js';
import { seedCategoriesForUser } from '../db/seed.js';
import { registerCategoryLocale } from './category-locale.js';

let sqlite: Database.Database;
beforeEach(() => {
  sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: fileURLToPath(new URL('../db/migrations', import.meta.url)) });
  vi.spyOn(connection, 'getDb').mockReturnValue(db);
  const now = new Date().toISOString();
  db.insert(schema.users).values({id:1,email:'locale@example.test',passwordHash:'test',name:'Locale',role:'user',createdAt:now,updatedAt:now}).run();
  seedCategoriesForUser(1, 'es');
});
afterEach(() => { vi.restoreAllMocks(); sqlite.close(); });

it('localizes nested category displays without overwriting custom names, writes or backups', async () => {
  const db = connection.getDb();
  db.update(schema.categories).set({name:'My custom housing'}).where(eq(schema.categories.key,'housing')).run();
  const original = db.select().from(schema.categories).all();
  const income = original.find(c => c.key === 'income')!;
  const app = Fastify();
  app.addHook('onRequest', async request => { Object.assign(request,{user:{userId:1,role:'user'}}); });
  registerCategoryLocale(app);
  app.get('/api/v1/categories', async () => ({data:original}));
  app.get('/api/v1/reports/test', async () => ({data:[{categoryId:income.id,categoryName:income.name}]}));
  app.get('/api/v1/backup', async () => ({data:original}));
  app.post('/api/v1/categories', async () => ({data:original}));
  try {
    const headers = {'accept-language':'pt-BR'};
    const result = (await app.inject({url:'/api/v1/categories',headers})).json().data;
    expect(result.find((c: {key:string}) => c.key === 'income')).toMatchObject({name:'Receitas',originalName:'Ingresos'});
    expect(result.find((c: {key:string}) => c.key === 'housing')).toMatchObject({name:'My custom housing'});
    expect((await app.inject({url:'/api/v1/reports/test',headers})).json().data[0].categoryName).toBe('Receitas');
    expect((await app.inject({url:'/api/v1/categories'})).json().data).toEqual(original);
    expect((await app.inject({url:'/api/v1/backup',headers})).json().data).toEqual(original);
    expect((await app.inject({method:'POST',url:'/api/v1/categories',headers})).json().data).toEqual(original);
    expect(db.select().from(schema.categories).all()).toEqual(original);
  } finally { await app.close(); }
});
