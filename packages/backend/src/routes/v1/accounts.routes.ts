import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AccountService, AccountError } from '../../services/account.service.js';
import { createAccountSchema, updateAccountSchema } from '../../validators/account.schema.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Maps AccountError codes to HTTP status codes.
 * DUPLICATE_ACCOUNT_NAME → 409 Conflict
 * ACCOUNT_NOT_FOUND → 404 Not Found
 */
function handleAccountError(error: AccountError, reply: FastifyReply): FastifyReply {
  const statusCode = error.code === 'ACCOUNT_NOT_FOUND' ? 404 : 409;
  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

/**
 * Registers account API routes.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/accounts (applied when registering this plugin)
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7
 */
export async function accountRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/accounts
   * List all active accounts for the authenticated user with calculated balances.
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const accounts = await AccountService.getActive(user.userId);

    // Calculate balance for each account
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const calculatedBalance = await AccountService.calculateBalance(account.id);
        return { ...account, calculatedBalance };
      })
    );

    return reply.status(200).send({
      success: true,
      data: accountsWithBalance,
    });
  });

  /**
   * GET /api/v1/accounts/:id
   * Get account detail with calculated balance.
   */
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la cuenta debe ser un número válido',
        },
      });
    }

    const account = await AccountService.getById(id);

    if (!account) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Cuenta no encontrada',
        },
      });
    }

    // Ensure the account belongs to the authenticated user
    if (account.userId !== user.userId) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Cuenta no encontrada',
        },
      });
    }

    const balance = await AccountService.calculateBalance(id);

    return reply.status(200).send({
      success: true,
      data: {
        ...account,
        calculatedBalance: balance,
      },
    });
  });

  /**
   * POST /api/v1/accounts
   * Create a new account with validation.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const parsed = createAccountSchema.parse(request.body);

    try {
      const account = await AccountService.create(user.userId, parsed);

      return reply.status(201).send({
        success: true,
        data: account,
      });
    } catch (error) {
      if (error instanceof AccountError) {
        return handleAccountError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/accounts/:id
   * Edit an existing account with validation.
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la cuenta debe ser un número válido',
        },
      });
    }

    // Verify account exists and belongs to user
    const existing = await AccountService.getById(id);
    if (!existing || existing.userId !== user.userId) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Cuenta no encontrada',
        },
      });
    }

    const parsed = updateAccountSchema.parse(request.body);

    try {
      const updated = await AccountService.update(id, parsed);

      return reply.status(200).send({
        success: true,
        data: updated,
      });
    } catch (error) {
      if (error instanceof AccountError) {
        return handleAccountError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PATCH /api/v1/accounts/:id/deactivate
   * Deactivate an account.
   */
  app.patch('/:id/deactivate', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la cuenta debe ser un número válido',
        },
      });
    }

    // Verify account exists and belongs to user
    const existing = await AccountService.getById(id);
    if (!existing || existing.userId !== user.userId) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Cuenta no encontrada',
        },
      });
    }

    try {
      await AccountService.deactivate(id);

      return reply.status(200).send({
        success: true,
        data: { message: 'Cuenta desactivada exitosamente' },
      });
    } catch (error) {
      if (error instanceof AccountError) {
        return handleAccountError(error, reply);
      }
      throw error;
    }
  });
}
