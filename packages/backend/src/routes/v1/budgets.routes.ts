import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BudgetService, BudgetError } from '../../services/budget.service.js';
import { createBudgetSchema, updateBudgetSchema } from '../../validators/budget.schema.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Maps BudgetError codes to HTTP status codes.
 * BUDGET_NOT_FOUND → 404 Not Found
 * CATEGORY_NOT_FOUND, INVALID_PERIOD, NEXT_BUDGET_NOT_FOUND → 400 Bad Request
 */
function handleBudgetError(error: BudgetError, reply: FastifyReply): FastifyReply {
  const statusCode = error.code === 'BUDGET_NOT_FOUND' ? 404 : 400;
  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

/**
 * Registers budget API routes.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/budgets (applied when registering this plugin)
 *
 * Requirements: 7.2
 */
export async function budgetRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/budgets/summary
   * Get budget summary: spent vs available for the current period.
   * Must be registered BEFORE /:id to avoid route conflicts.
   */
  app.get('/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    try {
      const summary = BudgetService.getSummary(user.userId);

      return reply.status(200).send({
        success: true,
        data: summary,
      });
    } catch (error) {
      if (error instanceof BudgetError) {
        return handleBudgetError(error, reply);
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/budgets
   * List active budgets for the current period with spending progress.
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const currentBudgets = BudgetService.getCurrent(user.userId);

    return reply.status(200).send({
      success: true,
      data: currentBudgets,
    });
  });

  /**
   * GET /api/v1/budgets/:id
   * Get budget detail with per-category progress.
   */
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID del presupuesto debe ser un número válido',
        },
      });
    }

    const budget = BudgetService.getById(id, user.userId);

    if (!budget) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'BUDGET_NOT_FOUND',
          message: 'Presupuesto no encontrado',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: budget,
    });
  });

  /**
   * POST /api/v1/budgets
   * Create a new budget with category allocations.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const parsed = createBudgetSchema.parse(request.body);

    try {
      const budget = BudgetService.create(user.userId, parsed);

      return reply.status(201).send({
        success: true,
        data: budget,
      });
    } catch (error) {
      if (error instanceof BudgetError) {
        return handleBudgetError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/budgets/:id
   * Edit an existing budget.
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID del presupuesto debe ser un número válido',
        },
      });
    }

    const parsed = updateBudgetSchema.parse(request.body);

    try {
      const updated = BudgetService.update(id, user.userId, parsed);

      return reply.status(200).send({
        success: true,
        data: updated,
      });
    } catch (error) {
      if (error instanceof BudgetError) {
        return handleBudgetError(error, reply);
      }
      throw error;
    }
  });

  /**
   * DELETE /api/v1/budgets/:id
   * Delete a budget and its category allocations.
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID del presupuesto debe ser un número válido',
        },
      });
    }

    try {
      BudgetService.delete(id, user.userId);

      return reply.status(200).send({
        success: true,
        data: { message: 'Presupuesto eliminado exitosamente' },
      });
    } catch (error) {
      if (error instanceof BudgetError) {
        return handleBudgetError(error, reply);
      }
      throw error;
    }
  });
}
