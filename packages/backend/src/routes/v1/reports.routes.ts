import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ReportService } from '../../services/report.service.js';
import { CustomReportService, CustomReportError } from '../../services/custom-report.service.js';
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

  // ── P4.10: reports depth ──

  /** GET /api/v1/reports/savings-rate?startDate=&endDate= */
  app.get('/savings-rate', async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const { startDate, endDate } = request.query;
    if (!startDate || !endDate) {
      return reply.status(400).send({ success: false, error: { code: 'MISSING_PARAMS', message: 'Los parámetros startDate y endDate son requeridos' } });
    }
    return reply.status(200).send({ success: true, data: ReportService.getSavingsRate(user.userId, { startDate, endDate }) });
  });

  /** GET /api/v1/reports/debt */
  app.get('/debt', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const data = await ReportService.getDebtReport(user.userId);
    return reply.status(200).send({ success: true, data });
  });

  /** GET /api/v1/reports/credit-utilization */
  app.get('/credit-utilization', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const data = await ReportService.getCreditUtilization(user.userId);
    return reply.status(200).send({ success: true, data });
  });

  /** GET /api/v1/reports/merchant?startDate=&endDate=&limit= */
  app.get('/merchant', async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; limit?: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const { startDate, endDate, limit } = request.query;
    if (!startDate || !endDate) {
      return reply.status(400).send({ success: false, error: { code: 'MISSING_PARAMS', message: 'Los parámetros startDate y endDate son requeridos' } });
    }
    const n = limit ? parseInt(limit, 10) : undefined;
    return reply.status(200).send({ success: true, data: ReportService.getMerchantReport(user.userId, { startDate, endDate }, Number.isFinite(n) ? n : undefined) });
  });

  // ── P4.10: custom (saved) reports ──

  /** GET /api/v1/reports/custom — list saved report definitions. */
  app.get('/custom', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    return reply.status(200).send({ success: true, data: CustomReportService.list(user.userId) });
  });

  /** POST /api/v1/reports/custom — save a report definition. */
  app.post('/custom', async (request: FastifyRequest<{ Body: { name?: string; type?: string; config?: Record<string, unknown> } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const body = request.body ?? {};
    try {
      const created = CustomReportService.create(user.userId, { name: body.name ?? '', type: body.type ?? '', config: body.config });
      return reply.status(201).send({ success: true, data: created });
    } catch (error) {
      if (error instanceof CustomReportError) {
        const status = error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ success: false, error: { code: error.code, message: error.message } });
      }
      throw error;
    }
  });

  /** DELETE /api/v1/reports/custom/:id */
  app.delete('/custom/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });
    }
    try {
      CustomReportService.delete(id, user.userId);
      return reply.status(200).send({ success: true, data: { message: 'Reporte eliminado' } });
    } catch (error) {
      if (error instanceof CustomReportError) {
        const status = error.code === 'NOT_FOUND' ? 404 : 400;
        return reply.status(status).send({ success: false, error: { code: error.code, message: error.message } });
      }
      throw error;
    }
  });
}
