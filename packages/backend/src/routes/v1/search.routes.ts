import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SearchService, type SearchEntity, type SearchFilters } from '../../services/search.service.js';
import type { TokenPayload } from '../../services/auth.service.js';

interface SearchQuery {
  q?: string;
  type?: string;
  accountId?: string;
  categoryId?: string;
  merchant?: string;
  tagId?: string;
  minAmount?: string;
  maxAmount?: string;
  txType?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
}

function toInt(v: string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
function toNum(v: string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Global search routes (P4.9). Prefix: /api/v1/search.
 * Auth handled by the global middleware.
 */
export async function searchRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const query = request.query;

    const type = (['transaction', 'receipt', 'subscription'] as const).includes(query.type as SearchEntity)
      ? (query.type as SearchEntity)
      : undefined;
    const txType = query.txType === 'Ingreso' || query.txType === 'Gasto' ? query.txType : undefined;

    const filters: SearchFilters = {
      q: query.q,
      type,
      accountId: toInt(query.accountId),
      categoryId: toInt(query.categoryId),
      merchant: query.merchant,
      tagId: toInt(query.tagId),
      minAmount: toNum(query.minAmount),
      maxAmount: toNum(query.maxAmount),
      txType,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: toInt(query.limit),
    };

    const data = SearchService.search(user.userId, filters);
    return reply.status(200).send({ success: true, data });
  });
}
