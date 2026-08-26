import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SubscriptionService, SubscriptionError } from '../../services/subscription.service.js';
import { createSubscriptionSchema, updateSubscriptionSchema } from '../../validators/subscription.schema.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Maps SubscriptionError codes to HTTP status codes.
 */
function handleSubscriptionError(error: SubscriptionError, reply: FastifyReply): FastifyReply {
  let statusCode: number;

  switch (error.code) {
    case 'SUBSCRIPTION_NOT_FOUND':
    case 'ACCOUNT_NOT_FOUND':
    case 'CATEGORY_NOT_FOUND':
      statusCode = 404;
      break;
    case 'ALREADY_INACTIVE':
      statusCode = 409;
      break;
    default:
      statusCode = 400;
      break;
  }

  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

/**
 * Registers subscription API routes.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/subscriptions (applied when registering this plugin)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6
 */
export async function subscriptionRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/subscriptions
   * List all subscriptions for the authenticated user.
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const subs = SubscriptionService.list(user.userId);

    return reply.status(200).send({
      success: true,
      data: subs,
    });
  });

  /**
   * POST /api/v1/subscriptions
   * Create a new subscription with validation.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const parsed = createSubscriptionSchema.parse(request.body);

    try {
      const subscription = SubscriptionService.create(user.userId, parsed);

      return reply.status(201).send({
        success: true,
        data: subscription,
      });
    } catch (error) {
      if (error instanceof SubscriptionError) {
        return handleSubscriptionError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/subscriptions/:id
   * Edit an existing subscription with validation.
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la suscripción debe ser un número válido',
        },
      });
    }

    const parsed = updateSubscriptionSchema.parse(request.body);

    try {
      const subscription = SubscriptionService.update(id, user.userId, parsed);

      return reply.status(200).send({
        success: true,
        data: subscription,
      });
    } catch (error) {
      if (error instanceof SubscriptionError) {
        return handleSubscriptionError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PATCH /api/v1/subscriptions/:id/deactivate
   * Deactivate a subscription.
   */
  app.patch('/:id/deactivate', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la suscripción debe ser un número válido',
        },
      });
    }

    try {
      const subscription = SubscriptionService.deactivate(id, user.userId);

      return reply.status(200).send({
        success: true,
        data: subscription,
      });
    } catch (error) {
      if (error instanceof SubscriptionError) {
        return handleSubscriptionError(error, reply);
      }
      throw error;
    }
  });

  /**
   * DELETE /api/v1/subscriptions/:id
   * Permanently delete a subscription.
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });
    }

    try {
      const db = (await import('../../db/connection.js')).getDb();
      const { subscriptions: subsTable } = await import('../../db/schema.js');
      const { eq, and } = await import('drizzle-orm');

      const existing = db.select().from(subsTable).where(and(eq(subsTable.id, id), eq(subsTable.userId, user.userId))).get();
      if (!existing) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Suscripción no encontrada' } });
      }

      db.delete(subsTable).where(eq(subsTable.id, id)).run();
      return reply.status(200).send({ success: true, data: { message: 'Suscripción eliminada' } });
    } catch (error) {
      throw error;
    }
  });

  /**
   * GET /api/v1/subscriptions/calendar
   * Payment calendar: active subscriptions sorted by days remaining ascending.
   * Requirements: 4.3, 8.1, 8.2
   */
  app.get('/calendar', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const calendar = SubscriptionService.getCalendar(user.userId);

    return reply.status(200).send({
      success: true,
      data: calendar,
    });
  });
}
