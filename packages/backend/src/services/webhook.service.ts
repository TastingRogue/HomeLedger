import crypto from 'node:crypto';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { webhooks } from '../db/schema.js';

/** Domain events a webhook can subscribe to (P4.13). */
export const WEBHOOK_EVENTS = [
  'transaction.created',
  'budget.exceeded',
  'goal.completed',
  'subscription.upcoming',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookInfo {
  id: number;
  url: string;
  hasSecret: boolean;
  events: string[];
  enabled: boolean;
  lastStatus: string | null;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookInput {
  url: string;
  secret?: string | null;
  events: string[];
  enabled?: boolean;
}

export interface UpdateWebhookInput {
  url?: string;
  secret?: string | null;
  events?: string[];
  enabled?: boolean;
}

export class WebhookError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'WebhookError';
    this.code = code;
  }
}

// Delivery timeout — keep short so a dead endpoint never ties up resources.
const DELIVERY_TIMEOUT_MS = 5000;

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function validEvents(events: string[]): string[] {
  const allowed = new Set<string>(WEBHOOK_EVENTS);
  return [...new Set(events.map((e) => e.trim()).filter((e) => allowed.has(e)))];
}

function toInfo(row: typeof webhooks.$inferSelect): WebhookInfo {
  let events: string[] = [];
  try {
    const parsed = JSON.parse(row.events) as unknown;
    if (Array.isArray(parsed)) events = parsed.map((e) => String(e));
  } catch {
    events = [];
  }
  return {
    id: row.id,
    url: row.url,
    hasSecret: !!row.secret,
    events,
    enabled: row.enabled,
    lastStatus: row.lastStatus ?? null,
    lastAttemptAt: row.lastAttemptAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class WebhookService {
  static list(userId: number): WebhookInfo[] {
    const db = getDb();
    return db
      .select()
      .from(webhooks)
      .where(eq(webhooks.userId, userId))
      .orderBy(desc(webhooks.createdAt))
      .all()
      .map(toInfo);
  }

  static create(userId: number, input: CreateWebhookInput): WebhookInfo {
    if (!isValidHttpUrl(input.url)) {
      throw new WebhookError('La URL del webhook no es válida (debe ser http/https)', 'INVALID_URL');
    }
    const events = validEvents(input.events);
    if (events.length === 0) {
      throw new WebhookError('Debes seleccionar al menos un evento válido', 'NO_EVENTS');
    }
    const db = getDb();
    const now = new Date().toISOString();
    const row = db
      .insert(webhooks)
      .values({
        userId,
        url: input.url,
        secret: input.secret?.trim() ? input.secret.trim() : null,
        events: JSON.stringify(events),
        enabled: input.enabled ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return toInfo(row);
  }

  static update(id: number, userId: number, input: UpdateWebhookInput): WebhookInfo {
    const db = getDb();
    const existing = db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)))
      .get();
    if (!existing) {
      throw new WebhookError('Webhook no encontrado', 'WEBHOOK_NOT_FOUND');
    }

    const patch: Partial<typeof webhooks.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (input.url !== undefined) {
      if (!isValidHttpUrl(input.url)) {
        throw new WebhookError('La URL del webhook no es válida (debe ser http/https)', 'INVALID_URL');
      }
      patch.url = input.url;
    }
    if (input.secret !== undefined) {
      patch.secret = input.secret?.trim() ? input.secret.trim() : null;
    }
    if (input.events !== undefined) {
      const events = validEvents(input.events);
      if (events.length === 0) {
        throw new WebhookError('Debes seleccionar al menos un evento válido', 'NO_EVENTS');
      }
      patch.events = JSON.stringify(events);
    }
    if (input.enabled !== undefined) {
      patch.enabled = input.enabled;
    }

    const row = db.update(webhooks).set(patch).where(eq(webhooks.id, id)).returning().get();
    return toInfo(row);
  }

  static remove(id: number, userId: number): void {
    const db = getDb();
    const deleted = db
      .delete(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)))
      .returning()
      .all();
    if (deleted.length === 0) {
      throw new WebhookError('Webhook no encontrado', 'WEBHOOK_NOT_FOUND');
    }
  }

  /**
   * Send a test event to a single webhook (used by the "Test" button).
   * Returns the recorded status. Awaited (unlike deliver) so the UI can show it.
   */
  static async test(id: number, userId: number): Promise<{ status: string }> {
    const db = getDb();
    const row = db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)))
      .get();
    if (!row) {
      throw new WebhookError('Webhook no encontrado', 'WEBHOOK_NOT_FOUND');
    }
    const status = await WebhookService.post(row, 'test', { message: 'HomeLedger webhook test' });
    return { status };
  }

  /**
   * Fire an event to all of a user's enabled webhooks subscribed to it.
   *
   * FIRE-AND-FORGET + BEST-EFFORT: never throws into the caller and never blocks
   * the request path. Callers may `void`-call this.
   */
  static deliver(userId: number, event: WebhookEvent, data: unknown): void {
    // Do the DB read + network work on the next tick so we never block or throw
    // into the domain operation that triggered us.
    queueMicrotask(() => {
      try {
        const db = getDb();
        const rows = db
          .select()
          .from(webhooks)
          .where(and(eq(webhooks.userId, userId), eq(webhooks.enabled, true)))
          .all();
        for (const row of rows) {
          let events: string[] = [];
          try {
            const parsed = JSON.parse(row.events) as unknown;
            if (Array.isArray(parsed)) events = parsed.map((e) => String(e));
          } catch {
            events = [];
          }
          if (!events.includes(event)) continue;
          void WebhookService.post(row, event, data).catch(() => {
            /* best-effort; status already recorded in post() */
          });
        }
      } catch {
        /* best-effort: a delivery failure must never affect the caller */
      }
    });
  }

  /**
   * POST the signed payload to the webhook URL and record the outcome.
   * Returns a short status string (e.g. "200", "timeout", "error").
   */
  private static async post(
    row: typeof webhooks.$inferSelect,
    event: string,
    data: unknown,
  ): Promise<string> {
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HomeLedger-Webhook/1.0',
      'X-HomeLedger-Event': event,
    };
    // Sign with HMAC-SHA256 when a secret is configured, so the receiver can
    // verify authenticity (header value: "sha256=<hex>").
    if (row.secret) {
      const sig = crypto.createHmac('sha256', row.secret).update(body).digest('hex');
      headers['X-HomeLedger-Signature'] = `sha256=${sig}`;
    }

    let status: string;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const res = await fetch(row.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      status = String(res.status);
    } catch (error) {
      status = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'error';
    } finally {
      clearTimeout(timer);
    }

    // Record the last outcome (best-effort).
    try {
      getDb()
        .update(webhooks)
        .set({ lastStatus: status, lastAttemptAt: new Date().toISOString() })
        .where(eq(webhooks.id, row.id))
        .run();
    } catch {
      /* ignore bookkeeping failures */
    }
    return status;
  }
}
