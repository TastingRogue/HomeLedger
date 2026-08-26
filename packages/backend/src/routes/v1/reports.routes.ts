import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ReportService } from '../../services/report.service.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Registers report API routes.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/reports (applied when registering this plugin)
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
export async function reportRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/reports/dashboard
   * Main dashboard data: consolidated balance, monthly summary,
   * category breakdown, account health, next subscriptions, active goals.
   */
  app.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const data = await ReportService.getDashboard(user.userId);

    return reply.status(200).send({
      success: true,
      data,
    });
  });

  /**
   * GET /api/v1/reports/cashflow
   * Cash flow report by period.
   * Query params: startDate (required), endDate (required)
   */
  app.get('/cashflow', async (request: FastifyRequest<{
    Querystring: { startDate?: string; endDate?: string };
  }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const { startDate, endDate } = request.query;

    if (!startDate || !endDate) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Los parámetros startDate y endDate son requeridos',
        },
      });
    }

    const data = ReportService.getCashFlow(user.userId, { startDate, endDate });

    return reply.status(200).send({
      success: true,
      data,
    });
  });

  /**
   * GET /api/v1/reports/trends
   * Monthly trends report (income/expenses evolution).
   * Query params: months (optional, default 6)
   */
  app.get('/trends', async (request: FastifyRequest<{
    Querystring: { months?: string };
  }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const months = request.query.months ? parseInt(request.query.months, 10) : 6;

    if (isNaN(months) || months < 1) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El parámetro months debe ser un número mayor a 0',
        },
      });
    }

    const data = ReportService.getTrends(user.userId, months);

    return reply.status(200).send({
      success: true,
      data,
    });
  });

  /**
   * GET /api/v1/reports/categories
   * Category analysis report.
   * Query params: startDate (optional), endDate (optional)
   */
  app.get('/categories', async (request: FastifyRequest<{
    Querystring: { startDate?: string; endDate?: string };
  }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const { startDate, endDate } = request.query;

    const dateRange = startDate && endDate
      ? { startDate, endDate }
      : undefined;

    const data = await ReportService.getCategoryAnalysis(user.userId, dateRange);

    return reply.status(200).send({
      success: true,
      data,
    });
  });

  /**
   * GET /api/v1/reports/budget-vs-actual
   * Budget comparison report: allocated vs actual spending per category.
   */
  app.get('/budget-vs-actual', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const data = ReportService.getBudgetVsActual(user.userId);

    return reply.status(200).send({
      success: true,
      data,
    });
  });
}
