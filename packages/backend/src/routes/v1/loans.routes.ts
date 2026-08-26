import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LoanService, LoanError } from '../../services/loan.service.js';
import { createLoanSchema, updateLoanSchema, recordPaymentSchema } from '../../validators/loan.schema.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Maps LoanError codes to HTTP status codes.
 * LOAN_NOT_FOUND → 404
 * LOAN_ALREADY_PAID → 409
 * PAYMENT_AMOUNT_MISMATCH and others → 400
 */
function handleLoanError(error: LoanError, reply: FastifyReply): FastifyReply {
  let statusCode: number;

  switch (error.code) {
    case 'LOAN_NOT_FOUND':
      statusCode = 404;
      break;
    case 'LOAN_ALREADY_PAID':
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
 * Registers loan API routes.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/loans (applied when registering this plugin)
 *
 * Routes:
 * - GET    /api/v1/loans             - Listar préstamos
 * - POST   /api/v1/loans             - Crear préstamo
 * - PUT    /api/v1/loans/:id         - Editar préstamo
 * - POST   /api/v1/loans/:id/payment - Registrar pago
 * - GET    /api/v1/loans/:id/schedule - Tabla de amortización
 */
export async function loanRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/loans
   * List all loans for the authenticated user.
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const loansList = LoanService.list(user.userId);

    return reply.status(200).send({
      success: true,
      data: loansList,
    });
  });

  /**
   * POST /api/v1/loans
   * Create a new loan.
   * remainingAmount is automatically set to principal.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const parsed = createLoanSchema.parse(request.body);

    try {
      const loan = LoanService.create(user.userId, parsed);

      return reply.status(201).send({
        success: true,
        data: loan,
      });
    } catch (error) {
      if (error instanceof LoanError) {
        return handleLoanError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/loans/:id
   * Edit an existing loan.
   * Cannot edit a loan with status 'paid'.
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID del préstamo debe ser un número válido',
        },
      });
    }

    const parsed = updateLoanSchema.parse(request.body);

    try {
      const loan = LoanService.update(id, user.userId, parsed);

      return reply.status(200).send({
        success: true,
        data: loan,
      });
    } catch (error) {
      if (error instanceof LoanError) {
        return handleLoanError(error, reply);
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/loans/:id/payment
   * Record a payment against a loan.
   * Reduces remainingAmount by the principal portion.
   * Sets status to 'paid' when remainingAmount reaches 0.
   */
  app.post('/:id/payment', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID del préstamo debe ser un número válido',
        },
      });
    }

    const parsed = recordPaymentSchema.parse(request.body);

    try {
      const result = LoanService.recordPayment(id, user.userId, parsed);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof LoanError) {
        return handleLoanError(error, reply);
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/loans/:id/schedule
   * Generate and return the amortization schedule for a loan.
   * Calculates the full payment breakdown by month.
   */
  app.get('/:id/schedule', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID del préstamo debe ser un número válido',
        },
      });
    }

    try {
      const schedule = LoanService.generateSchedule(id, user.userId);

      return reply.status(200).send({
        success: true,
        data: schedule,
      });
    } catch (error) {
      if (error instanceof LoanError) {
        return handleLoanError(error, reply);
      }
      throw error;
    }
  });
}
