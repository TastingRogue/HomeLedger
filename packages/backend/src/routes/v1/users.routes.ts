import type { FastifyInstance, FastifyReply } from 'fastify';
import { UserService, UserError } from '../../services/user.service.js';
import { requireRole } from '../../middleware/auth.middleware.js';
import type { TokenPayload } from '../../services/auth.service.js';
import {
  REGISTRATION_MODES,
  type RegistrationMode,
  getRegistrationMode,
  getRegistrationAllowlist,
  setRegistrationMode,
  setRegistrationAllowlist,
} from '../../config/registration.js';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  getInstanceCurrency,
  setInstanceCurrency,
} from '../../config/currency.js';

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

  /** GET /api/v1/users/registration — current registration policy. */
  app.get('/registration', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      data: { mode: getRegistrationMode(), allowlist: getRegistrationAllowlist(), modes: REGISTRATION_MODES },
    });
  });

  /** GET /api/v1/users/currency — the instance currency (single-currency model). */
  app.get('/currency', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      data: { currency: getInstanceCurrency(), supported: SUPPORTED_CURRENCIES },
    });
  });

  /** PUT /api/v1/users/currency — set the instance currency. Body: { currency }. */
  app.put<{ Body: { currency?: string } }>('/currency', async (request, reply) => {
    const currency = request.body?.currency;
    if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency ?? '')) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_CURRENCY', message: `currency debe ser una de: ${SUPPORTED_CURRENCIES.join(', ')}` } });
    }
    setInstanceCurrency(currency as SupportedCurrency);
    return reply.status(200).send({ success: true, data: { currency: getInstanceCurrency() } });
  });

  /** PUT /api/v1/users/registration — update the registration policy. Body: { mode?, allowlist? }. */
  app.put<{ Body: { mode?: string; allowlist?: string[] | string } }>('/registration', async (request, reply) => {
    const body = request.body ?? {};
    if (body.mode !== undefined) {
      if (!(REGISTRATION_MODES as readonly string[]).includes(body.mode)) {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_MODE', message: `mode debe ser uno de: ${REGISTRATION_MODES.join(', ')}` } });
      }
      setRegistrationMode(body.mode as RegistrationMode);
    }
    if (body.allowlist !== undefined) {
      const list = Array.isArray(body.allowlist)
        ? body.allowlist.map(String)
        : String(body.allowlist).split(',');
      setRegistrationAllowlist(list);
    }
    return reply.status(200).send({
      success: true,
      data: { mode: getRegistrationMode(), allowlist: getRegistrationAllowlist() },
    });
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
