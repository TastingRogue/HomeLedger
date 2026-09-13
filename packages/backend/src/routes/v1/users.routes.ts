import type { FastifyInstance, FastifyReply } from 'fastify';
import { UserService, UserError } from '../../services/user.service.js';
import { requireRole } from '../../middleware/auth.middleware.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Admin user-management API. All routes require the admin role.
 * Prefix: /api/v1/users
 */
function handleUserError(error: UserError, reply: FastifyReply): FastifyReply {
  const statusByCode: Record<string, number> = {
    USER_NOT_FOUND: 404,
    CANNOT_DISABLE_SELF: 409,
    CANNOT_DELETE_SELF: 409,
    LAST_ADMIN: 409,
    PASSWORD_TOO_SHORT: 400,
  };
  const statusCode = statusByCode[error.code] ?? 400;
  return reply.status(statusCode).send({ success: false, error: { code: error.code, message: error.message } });
}

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // Every route in this plugin is admin-only.
  app.addHook('preHandler', requireRole(['admin']));

  /** GET /api/v1/users — list all users. */
  app.get('/', async (_request, reply) => {
    return reply.status(200).send({ success: true, data: UserService.list() });
  });

  /** PATCH /api/v1/users/:id/disabled — enable/disable a user. Body: { disabled: boolean }. */
  app.patch<{ Params: { id: string }; Body: { disabled?: boolean } }>('/:id/disabled', async (request, reply) => {
    const admin = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'INVALID_ID', message: 'ID inválido' } });
    const disabled = request.body?.disabled;
    if (typeof disabled !== 'boolean') {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_BODY', message: 'Se requiere el campo booleano "disabled".' } });
    }
    try {
      const updated = UserService.setDisabled(id, disabled, admin.userId);
      return reply.status(200).send({ success: true, data: updated });
    } catch (error) {
      if (error instanceof UserError) return handleUserError(error, reply);
      throw error;
    }
  });

  /** POST /api/v1/users/:id/reset-password — admin-set a user's password. Body: { password }. */
  app.post<{ Params: { id: string }; Body: { password?: string } }>('/:id/reset-password', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'INVALID_ID', message: 'ID inválido' } });
    const password = request.body?.password;
    if (typeof password !== 'string') {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_BODY', message: 'Se requiere el campo "password".' } });
    }
    try {
      await UserService.resetPassword(id, password);
      return reply.status(200).send({ success: true, data: { message: 'Contraseña restablecida.' } });
    } catch (error) {
      if (error instanceof UserError) return handleUserError(error, reply);
      throw error;
    }
  });

  /** DELETE /api/v1/users/:id — permanently delete a user and their data. */
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const admin = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'INVALID_ID', message: 'ID inválido' } });
    try {
      UserService.delete(id, admin.userId);
      return reply.status(200).send({ success: true, data: { message: 'Usuario eliminado.' } });
    } catch (error) {
      if (error instanceof UserError) return handleUserError(error, reply);
      throw error;
    }
  });
}
