import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TransactionService, TransactionError } from '../../services/transaction.service.js';
import { TagService, TagError } from '../../services/tag.service.js';
import {
  createTransactionSchema,
  updateTransactionSchema,
  quickTransactionSchema,
} from '../../validators/transaction.schema.js';
import type { TokenPayload } from '../../services/auth.service.js';
import { TransactionType } from '@homeledger/shared';
import { toCsv } from '../../utils/csv.js';
import { z } from 'zod';

/**
 * Schema for the split request body.
 */
const splitBodySchema = z.object({
  splits: z
    .array(
      z.object({
        categoryId: z
          .number()
          .int('El ID de categoría debe ser un número entero')
          .positive('El ID de categoría debe ser un número positivo'),
        amount: z
          .number()
          .positive('El monto debe ser mayor a 0')
          .max(999999999.99, 'El monto no puede exceder 999,999,999.99'),
        note: z.string().max(200, 'La nota no puede exceder 200 caracteres').optional(),
      }),
      { error: 'Debe proporcionar un arreglo de splits' }
    )
    .min(1, 'Debe proporcionar al menos un split'),
});

/**
 * Registers transaction API routes.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/transactions (applied when registering this plugin)
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 11.1, 11.2
 */
export async function transactionRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/transactions
   * List transactions with filters and pagination.
   * Query params: accountId, categoryId, type, startDate, endDate, page, pageSize
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const query = request.query as Record<string, string | undefined>;

    // Validate type query param against TransactionType enum
    const typeParam = query.type as string | undefined;
    const validType = typeParam && Object.values(TransactionType).includes(typeParam as TransactionType)
      ? (typeParam as TransactionType)
      : undefined;

    // P4.1 filters. reconciled accepts 'true'/'false'; status/subtype validated by enum.
    const reconciledParam = query.reconciled;
    const reconciled = reconciledParam === 'true' ? true : reconciledParam === 'false' ? false : undefined;
    const status: 'pending' | 'posted' | undefined =
      query.status === 'pending' ? 'pending' : query.status === 'posted' ? 'posted' : undefined;
    const subtype: 'refund' | 'reimbursement' | 'adjustment' | undefined =
      query.subtype === 'refund' ? 'refund'
        : query.subtype === 'reimbursement' ? 'reimbursement'
          : query.subtype === 'adjustment' ? 'adjustment'
            : undefined;

    const filters = {
      accountId: query.accountId ? parseInt(query.accountId, 10) : undefined,
      categoryId: query.categoryId ? parseInt(query.categoryId, 10) : undefined,
      type: validType,
      startDate: query.startDate || undefined,
      endDate: query.endDate || undefined,
      reconciled,
      status,
      subtype,
      tagId: query.tagId ? parseInt(query.tagId, 10) : undefined,
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
    };

    const result = TransactionService.list(user.userId, filters);

    // Enrich items with account and category names
    const { getDb } = await import('../../db/connection.js');
    const { accounts, categories } = await import('../../db/schema.js');
    const { eq } = await import('drizzle-orm');
    const db = getDb();

    // Bulk-load tags for the page (single query, no N+1). (P4.1 Phase 2)
    const { TagService } = await import('../../services/tag.service.js');
    const tagMap = TagService.mapForTransactions(result.items.map((i) => i.id));

    const enrichedItems = result.items.map((item) => {
      const account = db.select({ name: accounts.name }).from(accounts).where(eq(accounts.id, item.accountId)).get();
      const category = db.select({ name: categories.name }).from(categories).where(eq(categories.id, item.categoryId)).get();
      return {
        ...item,
        accountName: account?.name ?? '—',
        categoryName: category?.name ?? '—',
        tags: tagMap.get(item.id) ?? [],
      };
    });

    return reply.status(200).send({
      success: true,
      data: { ...result, items: enrichedItems },
    });
  });

  /**
   * GET /api/v1/transactions/export.csv
   * Export ALL of the user's transactions matching the current filters as a CSV
   * file (spreadsheet-friendly, separate from the JSON backup). Same query
   * params as the list route. A literal path so it never collides with /:id.
   */
  app.get('/export.csv', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const query = request.query as Record<string, string | undefined>;

    const typeParam = query.type as string | undefined;
    const validType = typeParam && Object.values(TransactionType).includes(typeParam as TransactionType)
      ? (typeParam as TransactionType)
      : undefined;

    const rows = TransactionService.listAllForExport(user.userId, {
      accountId: query.accountId ? parseInt(query.accountId, 10) : undefined,
      categoryId: query.categoryId ? parseInt(query.categoryId, 10) : undefined,
      type: validType,
      startDate: query.startDate || undefined,
      endDate: query.endDate || undefined,
    });

    const headers = ['Date', 'Name', 'Merchant', 'Type', 'Amount', 'Account', 'Category', 'Notes'];
    const body = toCsv(
      headers,
      rows.map((r) => [r.date, r.name, r.merchant, r.type, r.amount, r.accountName, r.categoryName, r.notes])
    );

    const stamp = new Date().toISOString().slice(0, 10);
    // Prepend a UTF-8 BOM so Excel opens accented text (á, ñ, €) correctly.
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="homeledger-transactions-${stamp}.csv"`)
      .status(200)
      .send('\uFEFF' + body);
  });

  /**
   * GET /api/v1/transactions/:id
   * Get transaction detail including splits.
   */
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la transacción debe ser un número válido',
        },
      });
    }

    const transaction = TransactionService.getById(id, user.userId);

    if (!transaction) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'Transacción no encontrada',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: transaction,
    });
  });

  /**
   * POST /api/v1/transactions
   * Create a new transaction.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const parsed = createTransactionSchema.parse(request.body);

    try {
      const transaction = TransactionService.create(user.userId, parsed);

      return reply.status(201).send({
        success: true,
        data: transaction,
      });
    } catch (error) {
      if (error instanceof TransactionError) {
        return handleTransactionError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/transactions/:id
   * Edit an existing transaction.
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la transacción debe ser un número válido',
        },
      });
    }

    const parsed = updateTransactionSchema.parse(request.body);

    try {
      const transaction = TransactionService.update(id, user.userId, parsed);

      return reply.status(200).send({
        success: true,
        data: transaction,
      });
    } catch (error) {
      if (error instanceof TransactionError) {
        return handleTransactionError(error, reply);
      }
      throw error;
    }
  });

  /**
   * DELETE /api/v1/transactions/:id
   * Delete a transaction with balance reversal.
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la transacción debe ser un número válido',
        },
      });
    }

    try {
      TransactionService.delete(id, user.userId);

      return reply.status(200).send({
        success: true,
        data: { message: 'Transacción eliminada exitosamente' },
      });
    } catch (error) {
      if (error instanceof TransactionError) {
        return handleTransactionError(error, reply);
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/transactions/quick
   * Quick registration - auto-fills date/time (CST) and uses category name as transaction name.
   */
  app.post('/quick', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const parsed = quickTransactionSchema.parse(request.body);

    try {
      const transaction = TransactionService.quickCreate(user.userId, parsed);

      return reply.status(201).send({
        success: true,
        data: transaction,
      });
    } catch (error) {
      if (error instanceof TransactionError) {
        return handleTransactionError(error, reply);
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/transactions/:id/split
   * Split a transaction into category splits.
   * Body: { splits: [{ categoryId, amount, note? }] }
   */
  app.post('/:id/split', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la transacción debe ser un número válido',
        },
      });
    }

    const parsed = splitBodySchema.parse(request.body);

    try {
      const splits = TransactionService.split(id, user.userId, parsed.splits);

      return reply.status(201).send({
        success: true,
        data: splits,
      });
    } catch (error) {
      if (error instanceof TransactionError) {
        return handleTransactionError(error, reply);
      }
      throw error;
    }
  });

  /**
   * DELETE /api/v1/transactions/:id/split
   * Clear all splits for a transaction (revert to its main category only).
   */
  app.delete('/:id/split', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'El ID de la transacción debe ser un número válido' } });
    }
    try {
      TransactionService.clearSplits(id, user.userId);
      return reply.status(200).send({ success: true, data: { message: 'Splits eliminados' } });
    } catch (error) {
      if (error instanceof TransactionError) {
        return handleTransactionError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/transactions/:id/tags
   * Replace the full set of tags on a transaction by name (P4.1 Phase 2).
   * Body: { tags: string[] } — names are trimmed, de-duplicated, and created
   * on the fly if they don't exist for the user.
   */
  app.put('/:id/tags', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'El ID de la transacción debe ser un número válido' } });
    }
    const body = (request.body ?? {}) as Record<string, unknown>;
    const rawTags = Array.isArray(body['tags']) ? (body['tags'] as unknown[]) : [];
    const names = rawTags.filter((t): t is string => typeof t === 'string');
    try {
      const tags = TagService.setForTransaction(id, user.userId, names);
      return reply.status(200).send({ success: true, data: tags });
    } catch (error) {
      if (error instanceof TagError) {
        const notFound = error.code.endsWith('_NOT_FOUND');
        return reply.status(notFound ? 404 : 400).send({ success: false, error: { code: error.code, message: error.message } });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/transactions/:id/audit
   * Return the change history (who/when/what) for a transaction. (P4.1 Phase 3)
   */
  app.get('/:id/audit', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'El ID de la transacción debe ser un número válido' } });
    }
    try {
      const history = TransactionService.getAuditHistory(id, user.userId);
      return reply.status(200).send({ success: true, data: history });
    } catch (error) {
      if (error instanceof TransactionError) {
        return handleTransactionError(error, reply);
      }
      throw error;
    }
  });
}

/**
 * Maps TransactionError codes to appropriate HTTP responses.
 */
function handleTransactionError(error: TransactionError, reply: FastifyReply) {
  let statusCode: number;

  switch (error.code) {
    case 'TRANSACTION_NOT_FOUND':
    case 'ACCOUNT_NOT_FOUND':
    case 'CATEGORY_NOT_FOUND':
      statusCode = 404;
      break;
    case 'SPLITS_EMPTY':
    case 'SPLITS_SUM_MISMATCH':
      statusCode = 400;
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
