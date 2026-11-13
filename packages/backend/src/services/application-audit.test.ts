import { afterAll, beforeEach, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'homeledger-http-audit-'));
process.env['DATA_DIR'] = directory;
process.env['JWT_SECRET'] = 'disposable-http-audit-secret-123456';
const connection = await import('../db/connection.js');
const { AuthService } = await import('./auth.service.js');
const { BackupService } = await import('./backup.service.js');
const { AttachmentService } = await import('./attachment.service.js');
const { CustomReportService } = await import('./custom-report.service.js');
const { setRegistrationMode } = await import('../config/registration.js');
const { registerAuthMiddleware } = await import('../middleware/auth.middleware.js');
const { registerErrorHandler } = await import('../middleware/index.js');
const { authRoutes } = await import('../routes/v1/auth.routes.js');
const { apiKeyRoutes } = await import('../routes/v1/api-keys.routes.js');
const { backupRoutes } = await import('../routes/v1/backup.routes.js');
const { haRoutes } = await import('../routes/v1/ha.routes.js');
const { MAX_BACKUP_JSON_BYTES } = await import('../config/backup.js');

beforeEach(() => {
  connection.closeDatabase();
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory);
  connection.initializeDatabase();
  setRegistrationMode('open');
});
afterAll(() => {
  connection.closeDatabase();
  fs.rmSync(directory, { recursive: true, force: true });
});

async function setup() {
  const session = await AuthService.register({
    name: 'Audit',
    email: 'audit@example.test',
    password: 'Original-password-123!',
  });
  const app = Fastify();
  registerAuthMiddleware(app);
  registerErrorHandler(app);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(apiKeyRoutes, { prefix: '/api/v1/api-keys' });
  await app.register(backupRoutes, { prefix: '/api/v1/backup' });
  await app.register(haRoutes, { prefix: '/api/v1/ha' });
  return { app, session, headers: { authorization: `Bearer ${session.accessToken}` } };
}

it('marks the cookie session current and revokes every session after a password change', async () => {
  const { app, session, headers } = await setup();
  try {
    const second = await AuthService.login({
      email: 'audit@example.test',
      password: 'Original-password-123!',
    });
    const browserHeaders = {
      ...headers,
      'x-homeledger-session': 'browser',
      cookie: `hl_refresh=${session.refreshToken}`,
    };
    const sessions = await app.inject({ url: '/api/v1/auth/sessions', headers: browserHeaders });
    expect(sessions.statusCode).toBe(200);
    expect(sessions.json().data.filter((s: { current: boolean }) => s.current)).toHaveLength(1);
    const changed = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: browserHeaders,
      payload: { currentPassword: 'Original-password-123!', newPassword: 'Changed-password-456!' },
    });
    expect(changed.statusCode).toBe(200);
    expect(changed.headers['set-cookie']).toContain('Max-Age=0');
    for (const token of [session.refreshToken, second.refreshToken]) {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/auth/refresh',
            payload: { refreshToken: token },
          })
        ).statusCode,
      ).toBe(401);
    }
    expect((await app.inject({ url: '/api/v1/auth/me', headers })).statusCode).toBe(401);
    await expect(
      AuthService.login({ email: 'audit@example.test', password: 'Changed-password-456!' }),
    ).resolves.toBeTruthy();
  } finally {
    await app.close();
  }
});

it('rejects invalid scopes and past expiry and enforces persisted expiration', async () => {
  const { app, session, headers } = await setup();
  try {
    for (const body of [
      { scopes: ['read:acounts'] },
      { scopes: ['read:accounts', 'invalid'] },
      { expiresAt: '2000-01-01T00:00:00Z' },
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/api-keys',
        headers,
        payload: { name: 'Invalid', ...body },
      });
      expect(response.statusCode).toBe(422);
    }
    expect(AuthService.listApiKeys(session.user.id)).toHaveLength(0);
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/api-keys',
      headers,
      payload: { name: 'Valid', scopes: ['read:accounts'], expiresAt },
    });
    expect(response.statusCode).toBe(201);
    const key = response.json().data;
    expect(key.expiresAt).toBe(expiresAt);
    expect(AuthService.listApiKeys(session.user.id)[0]?.expiresAt).toBe(expiresAt);
    expect((await AuthService.validateApiKey(key.key))?.scopes).toEqual(['read:accounts']);
    connection
      .getSqlite()
      .prepare('UPDATE api_keys SET expires_at = ? WHERE id = ?')
      .run('2000-01-01T00:00:00Z', key.id);
    expect(await AuthService.validateApiKey(key.key)).toBeNull();
    const legacy = await AuthService.generateApiKey(session.user.id, 'No expiry', null);
    expect(legacy.expiresAt).toBeNull();
    expect(await AuthService.validateApiKey(legacy.key)).not.toBeNull();
  } finally {
    await app.close();
  }
});

it('restores multi-attachment backups over HTTP and saved reports across users', async () => {
  const { app, session, headers } = await setup();
  try {
    const now = new Date().toISOString();
    const sql = connection.getSqlite();
    const account = Number(
      sql
        .prepare(
          "INSERT INTO accounts(user_id,name,type,initial_balance,created_at,updated_at) VALUES (?,'Savings','Efectivo',100,?,?)",
        )
        .run(session.user.id, now, now).lastInsertRowid,
    );
    CustomReportService.create(session.user.id, {
      name: 'Saved report',
      type: 'cashflow',
      config: { accountIds: [account], range: 'month' },
    });
    for (const n of [1, 2])
      AttachmentService.save(session.user.id, {
        filename: `image${n}.jpg`,
        mimetype: 'image/jpeg',
        data: Buffer.alloc(700_000, n),
      });
    const exported = await app.inject({ method: 'POST', url: '/api/v1/backup/export', headers });
    expect(exported.statusCode).toBe(200);
    expect(exported.rawPayload.length).toBeGreaterThan(1024 * 1024);
    const backup = exported.json().data;
    const other = await AuthService.register({
      name: 'Other',
      email: 'other@example.test',
      password: 'Other-password-123!',
    });
    const otherHeaders = { authorization: `Bearer ${other.accessToken}` };
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/backup/preview',
          headers: otherHeaders,
          payload: { backup },
        })
      ).statusCode,
    ).toBe(200);
    const restored = await app.inject({
      method: 'POST',
      url: '/api/v1/backup/import',
      headers: otherHeaders,
      payload: { backup, confirmed: true },
    });
    expect(restored.statusCode, restored.body).toBe(200);
    const after = BackupService.export(other.user.id);
    expect(after.data.customReports).toHaveLength(1);
    const report = CustomReportService.list(other.user.id)[0]!;
    expect(report.config.accountIds).not.toEqual([account]);
    expect(report.config.accountIds).toEqual([(after.data.accounts[0] as { id: number }).id]);
    expect(after.data.attachments.map((a) => (a as { fileBase64: string }).fileBase64)).toEqual(
      backup.data.attachments.map((a: { fileBase64: string }) => a.fileBase64),
    );
    expect(CustomReportService.list(session.user.id)).toHaveLength(1);
    const invalid = structuredClone(backup);
    invalid.data.customReports = [{ name: 'Broken', type: 'unknown', config: {} }];
    expect(() => BackupService.import(other.user.id, invalid, true)).toThrow('Reporte');
    expect(CustomReportService.list(other.user.id)[0]?.name).toBe('Saved report');
    delete backup.data.customReports;
    BackupService.import(other.user.id, backup, true);
    expect(CustomReportService.list(other.user.id)).toHaveLength(0);
  } finally {
    await app.close();
  }
});

it('rejects oversized backup requests without changing data and keeps other route limits', async () => {
  const { app, session, headers } = await setup();
  try {
    const huge = 'x'.repeat(MAX_BACKUP_JSON_BYTES + 2048);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/backup/import',
      headers,
      payload: { backup: huge, confirmed: true },
    });
    expect(response.statusCode).toBe(413);
    expect(response.json().error.code).toBe('BACKUP_TOO_LARGE');
    expect((await app.inject({ url: '/api/v1/auth/me', headers })).statusCode).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/api-keys',
          headers,
          payload: { name: 'x'.repeat(1024 * 1024 + 1) },
        })
      ).statusCode,
    ).toBe(413);
    const attachment = AttachmentService.save(session.user.id, {
      filename: 'large.jpg',
      mimetype: 'image/jpeg',
      data: Buffer.from('test'),
    });
    fs.truncateSync(attachment.path, MAX_BACKUP_JSON_BYTES);
    const exported = await app.inject({ method: 'POST', url: '/api/v1/backup/export', headers });
    expect(exported.statusCode).toBe(413);
  } finally {
    await app.close();
  }
});

it('converts HA totals into base currency while individual accounts retain their currency', async () => {
  const { app, session, headers } = await setup();
  try {
    const sql = connection.getSqlite();
    const now = new Date().toISOString();
    const category = sql
      .prepare('SELECT id FROM categories WHERE user_id = ? LIMIT 1')
      .get(session.user.id) as { id: number };
    const account = Number(
      sql
        .prepare(
          "INSERT INTO accounts(user_id,name,type,initial_balance,currency,exchange_rate,created_at,updated_at) VALUES (?,'USD','Efectivo',1000,'USD',20,?,?)",
        )
        .run(session.user.id, now, now).lastInsertRowid,
    );
    sql
      .prepare(
        "INSERT INTO transactions(user_id,account_id,category_id,name,type,amount,date,created_at,updated_at) VALUES (?,?,?,'Expense','Gasto',100,?,?,?)",
      )
      .run(session.user.id, account, category.id, now.slice(0, 10), now, now);
    const status = await app.inject({ url: '/api/v1/ha/status', headers });
    expect(status.statusCode).toBe(200);
    expect(status.json().data.monthly_expenses).toBe(2000);
    expect(status.json().data.consolidated_balance).toBe(18000);
    expect(status.json().data.accounts[0].currency).toBe('USD');
    const sensors = await app.inject({ url: '/api/v1/ha/sensors', headers });
    expect(sensors.statusCode).toBe(200);
    expect(
      sensors
        .json()
        .data.find(
          (s: { entity_id: string }) => s.entity_id === 'sensor.homeledger_monthly_expenses',
        ).state,
    ).toBe(2000);
  } finally {
    await app.close();
  }
});
