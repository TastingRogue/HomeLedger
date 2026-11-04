import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import * as schema from '../../db/schema.js';
import * as connection from '../../db/connection.js';
import { accountRoutes } from './accounts.routes.js';
import { createAccountSchema } from '../../validators/account.schema.js';

describe('account creation with optional credit fields', () => {
  let sqlite: Database.Database;
  beforeEach(() => {
    sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: fileURLToPath(new URL('../../db/migrations', import.meta.url)) });
    vi.spyOn(connection, 'getDb').mockReturnValue(db);
    const now = new Date().toISOString();
    db.insert(schema.users).values({ id: 1, email: 'qa@example.test', passwordHash: 'test', name: 'QA', role: 'user', createdAt: now, updatedAt: now }).run();
  });
  afterEach(() => { vi.restoreAllMocks(); sqlite.close(); });

  it.each([
    { name: 'Debit example', type: 'Débito', initialBalance: 0 },
    { name: 'Credit with empty optional fields', type: 'Crédito', initialBalance: 0, creditLimit: 20000, statementDay: null, paymentDueDay: null, apr: null, minimumPayment: null },
    { name: 'Credit with statement details', type: 'Crédito', initialBalance: -100, creditLimit: 20000, statementDay: 10, paymentDueDay: 25, apr: 35.5, minimumPayment: 100 },
  ])('persists $name through the HTTP route', async payload => {
    const app = Fastify();
    app.addHook('onRequest', async request => { Object.assign(request, { user: { userId: 1, role: 'user' } }); });
    await app.register(accountRoutes, { prefix: '/accounts' });
    try {
      const response = await app.inject({ method: 'POST', url: '/accounts/', payload });
      expect(response.statusCode).toBe(201);
      const account = response.json().data;
      expect(account.name).toBe(payload.name);
      expect(account.statementDay).toBe(payload.statementDay ?? null);
      expect(account.apr).toBe(payload.apr ?? null);
      const list = await app.inject({ method: 'GET', url: '/accounts/' });
      expect(list.json().data).toEqual(expect.arrayContaining([expect.objectContaining({ id: account.id, name: payload.name })]));
    } finally { await app.close(); }
  });

  it('still rejects invalid statement details and missing credit limits', () => {
    const base = { name: 'Invalid', type: 'Crédito', initialBalance: 0, creditLimit: 20000 };
    for (const detail of [{statementDay: 0}, {paymentDueDay: 32}, {apr: -1}, {minimumPayment: -1}, {creditLimit: null}]) {
      expect(createAccountSchema.safeParse({...base, ...detail}).success).toBe(false);
    }
  });

  it('does not expose or update an account owned by another user', async () => {
    const db = connection.getDb();
    const now = new Date().toISOString();
    db.insert(schema.users).values({ id: 2, email: 'other@example.test', passwordHash: 'test', name: 'Other', role: 'user', createdAt: now, updatedAt: now }).run();
    const app = Fastify();
    app.addHook('onRequest', async request => { Object.assign(request, { user: { userId: request.headers['x-test-user'] === '2' ? 2 : 1, role: 'user' } }); });
    await app.register(accountRoutes, { prefix: '/accounts' });
    try {
      const created = await app.inject({ method: 'POST', url: '/accounts/', payload: { name: 'Private account', type: 'Débito', initialBalance: 100 } });
      const id = created.json().data.id;
      const list = await app.inject({ method: 'GET', url: '/accounts/', headers: { 'x-test-user': '2' } });
      expect(list.json().data).toEqual([]);
      const detail = await app.inject({ method: 'GET', url: `/accounts/${id}`, headers: { 'x-test-user': '2' } });
      expect(detail.statusCode).toBe(404);
      const update = await app.inject({ method: 'PUT', url: `/accounts/${id}`, headers: { 'x-test-user': '2' }, payload: { name: 'Changed' } });
      expect(update.statusCode).toBe(404);
    } finally { await app.close(); }
  });
});
