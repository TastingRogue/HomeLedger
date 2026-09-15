import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { WebhookService, WebhookError } from './webhook.service.js';
import { getSqlite, closeDatabase } from '../db/connection.js';
import fs from 'node:fs';

process.env['DATA_DIR'] = './data/test-webhook-service';
process.env['JWT_SECRET'] = 'test-secret';

describe('WebhookService (P4.13)', () => {
  let userId: number;

  beforeAll(() => {
    const sqlite = getSqlite();
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password_hash TEXT, name TEXT, role TEXT DEFAULT 'user', disabled INTEGER DEFAULT 0, totp_secret TEXT, totp_enabled INTEGER NOT NULL DEFAULT 0, totp_backup_codes TEXT, created_at TEXT, updated_at TEXT);
      CREATE TABLE IF NOT EXISTS webhooks (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, url TEXT NOT NULL, secret TEXT, events TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, last_status TEXT, last_attempt_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    `);
  });

  beforeEach(() => {
    const sqlite = getSqlite();
    sqlite.exec('DELETE FROM webhooks');
    sqlite.exec('DELETE FROM users');
    const now = new Date().toISOString();
    userId = Number(
      sqlite
        .prepare("INSERT INTO users (email, password_hash, name, role, created_at, updated_at) VALUES ('a@b.c','x','T','user',?,?)")
        .run(now, now).lastInsertRowid,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    closeDatabase();
    fs.rmSync('./data/test-webhook-service', { recursive: true, force: true });
  });

  describe('CRUD + validation', () => {
    it('creates a webhook with valid url + events', () => {
      const wh = WebhookService.create(userId, { url: 'https://example.com/hook', events: ['transaction.created'] });
      expect(wh.url).toBe('https://example.com/hook');
      expect(wh.events).toEqual(['transaction.created']);
      expect(wh.enabled).toBe(true);
      expect(wh.hasSecret).toBe(false);
    });

    it('rejects an invalid url', () => {
      expect(() => WebhookService.create(userId, { url: 'ftp://nope', events: ['goal.completed'] })).toThrow(WebhookError);
    });

    it('drops unknown events and rejects when none remain', () => {
      const wh = WebhookService.create(userId, { url: 'https://x.io', events: ['bogus.event', 'goal.completed'] });
      expect(wh.events).toEqual(['goal.completed']);
      expect(() => WebhookService.create(userId, { url: 'https://x.io', events: ['bogus.event'] })).toThrow(WebhookError);
    });

    it('lists, updates, and removes', () => {
      const created = WebhookService.create(userId, { url: 'https://x.io', events: ['budget.exceeded'] });
      expect(WebhookService.list(userId).length).toBe(1);

      const updated = WebhookService.update(created.id, userId, { enabled: false, events: ['goal.completed', 'budget.exceeded'] });
      expect(updated.enabled).toBe(false);
      expect(updated.events.sort()).toEqual(['budget.exceeded', 'goal.completed']);

      WebhookService.remove(created.id, userId);
      expect(WebhookService.list(userId).length).toBe(0);
    });

    it('scopes ownership: cannot update/remove another user\'s webhook', () => {
      const created = WebhookService.create(userId, { url: 'https://x.io', events: ['budget.exceeded'] });
      const otherUser = userId + 999;
      expect(() => WebhookService.update(created.id, otherUser, { enabled: false })).toThrow(WebhookError);
      expect(() => WebhookService.remove(created.id, otherUser)).toThrow(WebhookError);
    });
  });

  describe('delivery', () => {
    it('test() posts and signs with HMAC-SHA256 when a secret is set', async () => {
      const secret = 'topsecret';
      const wh = WebhookService.create(userId, { url: 'https://x.io/hook', secret, events: ['transaction.created'] });

      let capturedBody = '';
      let capturedSig = '';
      const fetchMock = vi.fn(async (_url: string, init: { body?: string; headers?: Record<string, string> }) => {
        capturedBody = init.body ?? '';
        capturedSig = init.headers?.['X-HomeLedger-Signature'] ?? '';
        return { status: 200 } as Response;
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await WebhookService.test(wh.id, userId);
      expect(res.status).toBe('200');
      expect(fetchMock).toHaveBeenCalledOnce();

      const expectedSig = 'sha256=' + crypto.createHmac('sha256', secret).update(capturedBody).digest('hex');
      expect(capturedSig).toBe(expectedSig);

      // status recorded on the row
      const listed = WebhookService.list(userId)[0]!;
      expect(listed.lastStatus).toBe('200');
    });

    it('records "error" and never throws when delivery fails', async () => {
      const wh = WebhookService.create(userId, { url: 'https://x.io/hook', events: ['transaction.created'] });
      vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));

      const res = await WebhookService.test(wh.id, userId);
      expect(res.status).toBe('error');
      expect(WebhookService.list(userId)[0]!.lastStatus).toBe('error');
    });

    it('deliver() only reaches enabled webhooks subscribed to the event (fire-and-forget)', async () => {
      WebhookService.create(userId, { url: 'https://x.io/a', events: ['transaction.created'] });
      WebhookService.create(userId, { url: 'https://x.io/b', events: ['goal.completed'] });
      WebhookService.create(userId, { url: 'https://x.io/c', events: ['transaction.created'], enabled: true });
      // disable one that would otherwise match
      const list = WebhookService.list(userId);
      const cId = list.find((w) => w.url === 'https://x.io/c')!.id;
      WebhookService.update(cId, userId, { enabled: false });

      const fetchMock = vi.fn(async () => ({ status: 204 } as Response));
      vi.stubGlobal('fetch', fetchMock);

      // Must not throw synchronously.
      expect(() => WebhookService.deliver(userId, 'transaction.created', { id: 1 })).not.toThrow();
      // Let the queued microtask + fetch resolve.
      await new Promise((r) => setTimeout(r, 20));

      // Only the single enabled webhook subscribed to transaction.created (a).
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
