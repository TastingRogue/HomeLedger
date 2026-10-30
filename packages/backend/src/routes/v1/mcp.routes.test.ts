import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';

// Env must be set before the db/attachment modules are loaded.
const DATA_DIR = vi.hoisted(() => {
  process.env['JWT_SECRET'] = 'test-secret-key-for-unit-tests-only';
  process.env['DATA_DIR'] = './data/test-mcp';
  process.env['LOG_LEVEL'] = 'silent';
  return './data/test-mcp';
});

import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../server.js';
import { initializeDatabase, closeDatabase } from '../../db/connection.js';
import { AuthService } from '../../services/auth.service.js';
import { generateTotp } from '../../utils/totp.js';
import { setRegistrationMode } from '../../config/registration.js';

const PASSWORD = 'correct-horse-battery';

interface RpcResult {
  status: number;
  body: any;
}

describe('MCP endpoint', () => {
  let app: FastifyInstance;
  let jwt: string;
  let fullKey: string;
  let readOnlyKey: string;
  let otherUserKey: string;
  let accountId: number;
  let categoryId: number;

  async function rpc(
    key: string,
    method: string,
    params: Record<string, unknown> = {},
    how: 'bearer' | 'x-api-key' = 'bearer',
  ): Promise<RpcResult> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/mcp',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(how === 'bearer' ? { authorization: `Bearer ${key}` } : { 'x-api-key': key }),
      },
      payload: { jsonrpc: '2.0', id: 1, method, params },
    });
    return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null };
  }

  async function callTool(key: string, name: string, args: Record<string, unknown> = {}) {
    const res = await rpc(key, 'tools/call', { name, arguments: args });
    expect(res.status).toBe(200);
    const result = res.body.result;
    return { isError: Boolean(result.isError), text: result.content[0].text as string };
  }

  const session = (extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) => ({
    method: 'POST' as const,
    headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json', ...headers },
    payload: extra,
  });

  beforeAll(async () => {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    initializeDatabase();
    setRegistrationMode('open');
    app = await buildApp();

    const a = await AuthService.register({ email: 'mcp-a@example.com', password: PASSWORD, name: 'A' });
    jwt = a.accessToken;
    fullKey = (await AuthService.generateApiKey(a.user.id, 'full')).key;
    readOnlyKey = (
      await AuthService.generateApiKey(a.user.id, 'ro', ['read:accounts', 'read:categories', 'read:transactions'])
    ).key;

    const b = await AuthService.register({ email: 'mcp-b@example.com', password: PASSWORD, name: 'B' });
    otherUserKey = (await AuthService.generateApiKey(b.user.id, 'b')).key;

    const account = await app.inject({
      method: 'POST',
      url: '/api/v1/accounts',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { name: 'Checking', type: 'Débito', initialBalance: 100 },
    });
    expect(account.statusCode).toBe(201);
    accountId = account.json().data.id;
    const cats = await app.inject({ method: 'GET', url: '/api/v1/categories', headers: { authorization: `Bearer ${jwt}` } });
    categoryId = cats.json().data.find((c: { type: string }) => c.type !== 'Ingreso').id;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  });

  it('requires authentication', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/mcp', payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it('is off by default, even for a valid API key', async () => {
    const res = await rpc(fullKey, 'tools/list');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MCP_DISABLED');
  });

  it('rejects a login session (JWT) on the protocol endpoint', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/mcp',
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      payload: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('API_KEY_REQUIRED');
  });

  it('reports disabled status to a session', async () => {
    const res = await app.inject({ ...session(), method: 'GET', url: '/api/v1/mcp/status' });
    expect(res.json().data).toEqual({ enabled: false, enabledAt: null });
  });

  it('refuses to enable without acknowledgement', async () => {
    const res = await app.inject({ ...session({ password: PASSWORD }), url: '/api/v1/mcp/enable' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ACK_REQUIRED');
  });

  it('refuses to enable with a wrong password', async () => {
    const res = await app.inject({ ...session({ acknowledged: true, password: 'nope-nope-nope' }), url: '/api/v1/mcp/enable' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('INVALID_PASSWORD');
  });

  it('does not let an API key enable MCP for itself', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/mcp/enable',
      headers: { 'x-api-key': fullKey, 'content-type': 'application/json' },
      payload: { acknowledged: true, password: PASSWORD },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('SESSION_REQUIRED');
    // ...and it is still off afterwards.
    expect((await rpc(fullKey, 'tools/list')).status).toBe(403);
  });

  it('enables after acknowledgement + password', async () => {
    const res = await app.inject({ ...session({ acknowledged: true, password: PASSWORD }), url: '/api/v1/mcp/enable' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.enabled).toBe(true);
    expect(res.json().data.enabledAt).toEqual(expect.any(String));
  });

  it('lists tools (Bearer or X-API-Key) and offers no delete tool', async () => {
    for (const how of ['bearer', 'x-api-key'] as const) {
      const res = await rpc(fullKey, 'tools/list', {}, how);
      expect(res.status).toBe(200);
      const names = res.body.result.tools.map((t: { name: string }) => t.name);
      expect(names).toContain('list_transactions');
      expect(names).toContain('create_transaction');
      expect(names.some((n: string) => n.includes('delete'))).toBe(false);
    }
  });

  it('keeps other users disabled', async () => {
    const res = await rpc(otherUserKey, 'tools/list');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MCP_DISABLED');
  });

  it('lets a read-only key read but not write', async () => {
    const accounts = await callTool(readOnlyKey, 'list_accounts');
    expect(accounts.isError).toBe(false);
    expect(JSON.parse(accounts.text)[0].name).toBe('Checking');

    const write = await callTool(readOnlyKey, 'create_transaction', {
      name: 'Nope', accountId, categoryId, date: '2026-01-15', amount: 5, type: 'Gasto',
    });
    expect(write.isError).toBe(true);
    expect(write.text).toContain('INSUFFICIENT_SCOPE');
    const list = JSON.parse((await callTool(readOnlyKey, 'list_transactions')).text);
    expect(list.total).toBe(0);
  });

  it('enforces read scopes per tool', async () => {
    const goals = await callTool(readOnlyKey, 'list_goals');
    expect(goals.isError).toBe(true);
    expect(goals.text).toContain('INSUFFICIENT_SCOPE');
  });

  it('lets a full-access key create and update a transaction', async () => {
    const created = await callTool(fullKey, 'create_transaction', {
      name: 'Coffee', accountId, categoryId, date: '2026-01-15', amount: 4.5, type: 'Gasto',
    });
    expect(created.isError).toBe(false);
    const id = JSON.parse(created.text).id as number;

    const updated = await callTool(fullKey, 'update_transaction', { id, name: 'Latte' });
    expect(updated.isError).toBe(false);

    const list = JSON.parse((await callTool(readOnlyKey, 'list_transactions', { type: 'Gasto' })).text);
    expect(list.total).toBe(1);
    expect(list.items[0].name).toBe('Latte');
  });

  it('surfaces REST validation errors to the client', async () => {
    const bad = await callTool(fullKey, 'create_transaction', {
      name: 'Bad', accountId: 99999, categoryId, date: '2026-01-15', amount: 1, type: 'Gasto',
    });
    expect(bad.isError).toBe(true);
  });

  it('does not allow GET or DELETE (stateless server)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/mcp', headers: { 'x-api-key': fullKey } });
    expect(res.statusCode).toBe(405);
  });

  it('also requires a 2FA code when the user has 2FA enabled', async () => {
    const c = await AuthService.register({ email: 'mcp-c@example.com', password: PASSWORD, name: 'C' });
    const { secret } = await AuthService.beginTotpEnrollment(c.user.id);
    await AuthService.confirmTotpEnrollment(c.user.id, generateTotp(secret));
    const enable = (payload: Record<string, unknown>) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/mcp/enable',
        headers: { authorization: `Bearer ${c.accessToken}`, 'content-type': 'application/json' },
        payload,
      });

    const missing = await enable({ acknowledged: true, password: PASSWORD });
    expect(missing.statusCode).toBe(401);
    expect(missing.json().error.code).toBe('TOTP_REQUIRED');

    const wrong = await enable({ acknowledged: true, password: PASSWORD, totpCode: '000000' });
    expect(wrong.json().error.code).toBe('TOTP_INVALID');

    const ok = await enable({ acknowledged: true, password: PASSWORD, totpCode: generateTotp(secret) });
    expect(ok.statusCode).toBe(200);
  });

  describe('API-key scopes on the REST API', () => {
    const rest = (key: string, method: 'GET' | 'POST' | 'DELETE', url: string, payload?: Record<string, unknown>) =>
      app.inject({ method, url, headers: { 'x-api-key': key }, ...(payload ? { payload } : {}) });

    it('lets a read-only key read the resources it was granted', async () => {
      expect((await rest(readOnlyKey, 'GET', '/api/v1/accounts')).statusCode).toBe(200);
      expect((await rest(readOnlyKey, 'GET', '/api/v1/transactions')).statusCode).toBe(200);
    });

    it('blocks writes and unrelated resources for a scoped key', async () => {
      const write = await rest(readOnlyKey, 'POST', '/api/v1/transactions', {
        name: 'Nope', accountId, categoryId, date: '2026-01-15T12:00:00', amount: 5, type: 'Gasto',
      });
      expect(write.statusCode).toBe(403);
      expect(write.json().error.code).toBe('INSUFFICIENT_SCOPE');
      expect((await rest(readOnlyKey, 'GET', '/api/v1/goals')).statusCode).toBe(403);
    });

    it('stops a scoped key from minting a broader API key', async () => {
      const res = await rest(readOnlyKey, 'POST', '/api/v1/api-keys', { name: 'escalate' });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('INSUFFICIENT_SCOPE');
    });

    it('does not restrict a full-access key', async () => {
      expect((await rest(fullKey, 'GET', '/api/v1/goals')).statusCode).toBe(200);
      expect((await rest(fullKey, 'GET', '/api/v1/api-keys')).statusCode).toBe(200);
    });
  });

  it('blocks the key again once disabled', async () => {
    const off = await app.inject({ ...session(), url: '/api/v1/mcp/disable' });
    expect(off.json().data.enabled).toBe(false);
    const res = await rpc(fullKey, 'tools/list');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MCP_DISABLED');
  });
});
