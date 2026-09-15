import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TagService, TagError } from '../../services/tag.service.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Tag catalog API (P4.1 Phase 2). Prefix: /api/v1/tags
 * Reusable per-user labels; the M2M attach/detach to a transaction lives on the
 * transactions routes (PUT /transactions/:id/tags). All routes require auth.
 */
function handleError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof TagError) {
    const notFound = error.code.endsWith('_NOT_FOUND');
    return reply.status(notFound ? 404 : 400).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  });
}

export async function tagRoutes(app: FastifyInstance): Promise<void> {
  // GET / — list the user's tags
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    return reply.send({ success: true, data: TagService.list(user.userId) });
  });

  // POST / — create (or get existing) a tag by name
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = typeof body['name'] === 'string' ? body['name'] : '';
    const color = typeof body['color'] === 'string' ? body['color'] : null;
    try {
      const tag = TagService.create(user.userId, { name, color });
      return reply.status(201).send({ success: true, data: tag });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // DELETE /:id — remove a tag from the catalog (cascades its associations)
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });
    }
    try {
      return reply.send({ success: true, data: TagService.delete(id, user.userId) });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}
