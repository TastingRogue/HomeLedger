import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService, AuthError, type TokenPayload } from '../../services/auth.service.js';
import { createApiKeySchema } from '../../validators/auth.schema.js';
import { ALL_SCOPES } from '../../config/scopes.js';

/**
 * API-key management (P4.13). All routes require authentication (global auth
 * middleware). A user manages only their own keys.
 *
 * Prefix: /api/v1/api-keys
 */
export async function apiKeyRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/api-keys
   * List the caller's API keys (metadata only — never the secret).
   */
  app.get('/', {
    schema: {
      tags: ['API Keys'],
      summary: 'List the current user\'s API keys (no secrets)',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const keys = AuthService.listApiKeys(user.userId);
    return reply.status(200).send({ success: true, data: keys });
  });

  /**
   * GET /api/v1/api-keys/scopes
   * The catalog of assignable scopes (for building the UI).
   */
  app.get('/scopes', {
    schema: {
      tags: ['API Keys'],
      summary: 'List all assignable API-key scopes',
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ success: true, data: ALL_SCOPES });
  });

  /**
   * POST /api/v1/api-keys
   * Create an API key. The raw key is returned ONCE and never stored in plaintext.
   */
  app.post('/', {
    schema: {
      tags: ['API Keys'],
      summary: 'Create an API key (raw key returned once)',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const parsed = createApiKeySchema.parse(request.body);

    const created = await AuthService.generateApiKey(user.userId, parsed.name, parsed.scopes ?? null);
    return reply.status(201).send({ success: true, data: created });
  });

  /**
   * DELETE /api/v1/api-keys/:id
   * Revoke an API key by id.
   */
  app.delete('/:id', {
    schema: {
      tags: ['API Keys'],
      summary: 'Revoke an API key',
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PARAM', message: 'El ID de la API key debe ser un número válido' },
      });
    }
    try {
      await AuthService.revokeApiKey(id, user.userId);
      return reply.status(200).send({ success: true, data: { message: 'API key revocada' } });
    } catch (error) {
      if (error instanceof AuthError) {
        const status = error.code === 'API_KEY_NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ success: false, error: { code: error.code, message: error.message } });
      }
      throw error;
    }
  });
}
