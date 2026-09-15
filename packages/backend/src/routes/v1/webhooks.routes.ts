import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebhookService, WebhookError, WEBHOOK_EVENTS } from '../../services/webhook.service.js';
import { createWebhookSchema, updateWebhookSchema } from '../../validators/webhook.schema.js';
import type { TokenPayload } from '../../services/auth.service.js';

function handleWebhookError(error: unknown, reply: FastifyReply) {
  if (error instanceof WebhookError) {
    const status = error.code === 'WEBHOOK_NOT_FOUND' ? 404 : 400;
    return reply.status(status).send({ success: false, error: { code: error.code, message: error.message } });
  }
  throw error;
}

function parseId(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): number | null {
  const id = parseInt(request.params.id, 10);
  if (isNaN(id)) {
    reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'El ID del webhook debe ser un número válido' } });
    return null;
  }
  return id;
}

/**
 * Webhook management (P4.13). All routes require authentication; a user manages
 * only their own webhooks.
 *
 * Prefix: /api/v1/webhooks
 */
export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  /** GET /api/v1/webhooks/events — the catalog of subscribable events. */
  app.get('/events', {
    schema: { tags: ['Webhooks'], summary: 'List subscribable webhook events' },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ success: true, data: WEBHOOK_EVENTS });
  });

  /** GET /api/v1/webhooks — list the caller's webhooks. */
  app.get('/', {
    schema: { tags: ['Webhooks'], summary: 'List the current user\'s webhooks' },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    return reply.status(200).send({ success: true, data: WebhookService.list(user.userId) });
  });

  /** POST /api/v1/webhooks — create a webhook. */
  app.post('/', {
    schema: { tags: ['Webhooks'], summary: 'Create a webhook' },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const parsed = createWebhookSchema.parse(request.body);
    try {
      const created = WebhookService.create(user.userId, {
        url: parsed.url,
        secret: parsed.secret ?? null,
        events: parsed.events,
        enabled: parsed.enabled,
      });
      return reply.status(201).send({ success: true, data: created });
    } catch (error) {
      return handleWebhookError(error, reply);
    }
  });

  /** PUT /api/v1/webhooks/:id — update a webhook. */
  app.put('/:id', {
    schema: { tags: ['Webhooks'], summary: 'Update a webhook' },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseId(request, reply);
    if (id === null) return reply;
    const parsed = updateWebhookSchema.parse(request.body);
    try {
      const updated = WebhookService.update(id, user.userId, parsed);
      return reply.status(200).send({ success: true, data: updated });
    } catch (error) {
      return handleWebhookError(error, reply);
    }
  });

  /** DELETE /api/v1/webhooks/:id — delete a webhook. */
  app.delete('/:id', {
    schema: { tags: ['Webhooks'], summary: 'Delete a webhook' },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseId(request, reply);
    if (id === null) return reply;
    try {
      WebhookService.remove(id, user.userId);
      return reply.status(200).send({ success: true, data: { message: 'Webhook eliminado' } });
    } catch (error) {
      return handleWebhookError(error, reply);
    }
  });

  /** POST /api/v1/webhooks/:id/test — send a test delivery. */
  app.post('/:id/test', {
    schema: { tags: ['Webhooks'], summary: 'Send a test event to a webhook' },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseId(request, reply);
    if (id === null) return reply;
    try {
      const result = await WebhookService.test(id, user.userId);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      return handleWebhookError(error, reply);
    }
  });
}
