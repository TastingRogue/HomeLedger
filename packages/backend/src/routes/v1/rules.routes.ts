import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RulesEngineService, RulesEngineError } from '../../services/rules-engine.service.js';
import { createRuleSchema, updateRuleSchema } from '../../validators/rule.schema.js';
import type { TokenPayload } from '../../services/auth.service.js';
import { z } from 'zod';

/**
 * Schema for POST /test endpoint body.
 * Reuses rule conditions/actions schemas and adds optional transactionIds.
 */
const testRuleBodySchema = createRuleSchema.extend({
  transactionIds: z.array(z.number().int().positive()).optional(),
});

/**
 * Maps RulesEngineError codes to HTTP status codes.
 * RULE_NOT_FOUND → 404
 * INVALID_RULE, INVALID_CONDITION, INVALID_REGEX → 400
 */
function handleRulesEngineError(error: RulesEngineError, reply: FastifyReply): FastifyReply {
  let statusCode: number;

  switch (error.code) {
    case 'RULE_NOT_FOUND':
      statusCode = 404;
      break;
    case 'INVALID_RULE':
    case 'INVALID_CONDITION':
    case 'INVALID_REGEX':
      statusCode = 400;
      break;
    default:
      statusCode = 400;
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
 * Registers rules API routes for auto-categorization engine.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/rules (applied when registering this plugin)
 *
 * Requirements: design Rules Engine section
 */
export async function rulesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/rules
   * List all rules for the authenticated user, ordered by priority.
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const rulesList = RulesEngineService.list(user.userId);

    return reply.status(200).send({
      success: true,
      data: rulesList,
    });
  });

  /**
   * POST /api/v1/rules
   * Create a new auto-categorization rule.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const parsed = createRuleSchema.parse(request.body);

    try {
      const rule = RulesEngineService.create(user.userId, parsed);

      return reply.status(201).send({
        success: true,
        data: rule,
      });
    } catch (error) {
      if (error instanceof RulesEngineError) {
        return handleRulesEngineError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/rules/:id
   * Edit an existing rule.
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la regla debe ser un número válido',
        },
      });
    }

    const parsed = updateRuleSchema.parse(request.body);

    try {
      const updated = RulesEngineService.update(id, user.userId, parsed);

      return reply.status(200).send({
        success: true,
        data: updated,
      });
    } catch (error) {
      if (error instanceof RulesEngineError) {
        return handleRulesEngineError(error, reply);
      }
      throw error;
    }
  });

  /**
   * DELETE /api/v1/rules/:id
   * Delete a rule.
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la regla debe ser un número válido',
        },
      });
    }

    try {
      RulesEngineService.delete(id, user.userId);

      return reply.status(200).send({
        success: true,
        data: { message: 'Regla eliminada exitosamente' },
      });
    } catch (error) {
      if (error instanceof RulesEngineError) {
        return handleRulesEngineError(error, reply);
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/rules/test
   * Test a rule against existing transactions (dry-run).
   * Body contains the rule definition (conditions, actions) and optional transactionIds.
   */
  app.post('/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const parsed = testRuleBodySchema.parse(request.body);

    try {
      const { transactionIds, ...ruleInput } = parsed;
      const result = RulesEngineService.test(user.userId, ruleInput, transactionIds);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof RulesEngineError) {
        return handleRulesEngineError(error, reply);
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/rules/apply
   * Apply all enabled rules to uncategorized transactions for the user.
   * No body needed.
   */
  app.post('/apply', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    try {
      const result = RulesEngineService.applyToUncategorized(user.userId);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof RulesEngineError) {
        return handleRulesEngineError(error, reply);
      }
      throw error;
    }
  });
}
