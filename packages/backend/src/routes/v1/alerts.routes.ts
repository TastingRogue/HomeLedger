import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AlertService } from '../../services/alert.service.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Alerts API routes.
 * Endpoints:
 *   GET    /             - List all alerts for the current user
 *   PATCH  /:id/read     - Mark a single alert as read
 *   PATCH  /read-all     - Mark all alerts as read
 *   GET    /settings     - Get alert configuration settings
 *   PUT    /settings     - Update alert configuration settings
 *   POST   /evaluate     - Manually trigger alert evaluation
 *   DELETE /:id          - Delete an alert
 */
export async function alertRoutes(app: FastifyInstance) {
  // GET / - List all alerts
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const alerts = AlertService.list(user.userId);

    return reply.send({
      success: true,
      data: alerts,
    });
  });

  // PATCH /:id/read - Mark a single alert as read
  app.patch('/:id/read', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ID', message: 'ID de alerta inválido' },
      });
    }

    AlertService.markAsRead(id);

    return reply.send({
      success: true,
      data: { message: 'Alerta marcada como leída' },
    });
  });

  // PATCH /read-all - Mark all alerts as read
  app.patch('/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    AlertService.markAllAsRead(user.userId);

    return reply.send({
      success: true,
      data: { message: 'Todas las alertas marcadas como leídas' },
    });
  });

  // GET /settings - Get alert configuration settings
  app.get('/settings', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Default settings - all alert types enabled
    // In a more complete implementation, these would be persisted per user
    return reply.send({
      success: true,
      data: {
        balanceLow: true,
        creditHigh: true,
        paymentDue: true,
        paymentOverdue: true,
        goalCompleted: true,
      },
    });
  });

  // PUT /settings - Update alert configuration settings
  app.put('/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, boolean>;

    return reply.send({
      success: true,
      data: {
        balanceLow: body.balanceLow ?? true,
        creditHigh: body.creditHigh ?? true,
        paymentDue: body.paymentDue ?? true,
        paymentOverdue: body.paymentOverdue ?? true,
        goalCompleted: body.goalCompleted ?? true,
      },
    });
  });

  // POST /evaluate - Manually trigger alert evaluation
  app.post('/evaluate', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    try {
      const result = await AlertService.evaluateAll(user.userId);
      const total = result.balanceLow.length + result.creditHigh.length + result.paymentDue.length + result.paymentOverdue.length + result.goalCompleted.length;
      return reply.send({ success: true, data: { generated: total } });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'EVALUATION_ERROR', message: 'Error evaluating alerts' } });
    }
  });

  // DELETE /:id - Delete an alert
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_ID', message: 'ID inválido' } });
    }

    const { getDb } = await import('../../db/connection.js');
    const { alerts } = await import('../../db/schema.js');
    const { eq } = await import('drizzle-orm');
    const db = getDb();

    db.delete(alerts).where(eq(alerts.id, id)).run();
    return reply.send({ success: true, data: { message: 'Alerta eliminada' } });
  });
}
