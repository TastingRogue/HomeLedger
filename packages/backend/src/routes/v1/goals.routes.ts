import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GoalService, GoalError } from '../../services/goal.service.js';
import { createGoalSchema, updateGoalSchema, fundGoalSchema } from '../../validators/goal.schema.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Maps GoalError codes to HTTP status codes.
 * GOAL_NOT_FOUND → 404
 * GOAL_ALREADY_COMPLETED → 409
 * INVALID_GOAL_TYPE and others → 400
 */
function handleGoalError(error: GoalError, reply: FastifyReply): FastifyReply {
  let statusCode: number;

  switch (error.code) {
    case 'GOAL_NOT_FOUND':
      statusCode = 404;
      break;
    case 'GOAL_ALREADY_COMPLETED':
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
 * Registers goals API routes.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/goals (applied when registering this plugin)
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
export async function goalRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/goals
   * List all goals for the authenticated user.
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const goals = GoalService.list(user.userId);

    return reply.status(200).send({
      success: true,
      data: goals,
    });
  });

  /**
   * POST /api/v1/goals
   * Create a new savings goal.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const parsed = createGoalSchema.parse(request.body);

    try {
      const goal = GoalService.create(user.userId, parsed);

      return reply.status(201).send({
        success: true,
        data: goal,
      });
    } catch (error) {
      if (error instanceof GoalError) {
        return handleGoalError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/goals/:id
   * Edit an existing goal.
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la meta debe ser un número válido',
        },
      });
    }

    const parsed = updateGoalSchema.parse(request.body);

    try {
      const goal = GoalService.update(id, user.userId, parsed);

      return reply.status(200).send({
        success: true,
        data: goal,
      });
    } catch (error) {
      if (error instanceof GoalError) {
        return handleGoalError(error, reply);
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/goals/:id/fund
   * Assign funds to a savings goal.
   * The effective amount is capped at (targetAmount - savedAmount).
   */
  app.post('/:id/fund', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la meta debe ser un número válido',
        },
      });
    }

    const parsed = fundGoalSchema.parse(request.body);

    try {
      const goal = GoalService.fund(id, user.userId, parsed);

      return reply.status(200).send({
        success: true,
        data: goal,
      });
    } catch (error) {
      if (error instanceof GoalError) {
        return handleGoalError(error, reply);
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/goals/:id/withdraw
   * Withdraw funds from a savings goal.
   * The effective amount is capped at savedAmount (floor of 0).
   */
  app.post('/:id/withdraw', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la meta debe ser un número válido',
        },
      });
    }

    const parsed = fundGoalSchema.parse(request.body);

    try {
      const goal = GoalService.withdraw(id, user.userId, parsed);

      return reply.status(200).send({
        success: true,
        data: goal,
      });
    } catch (error) {
      if (error instanceof GoalError) {
        return handleGoalError(error, reply);
      }
      throw error;
    }
  });
}
