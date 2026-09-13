import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NetWorthService, NetWorthError } from '../../services/networth.service.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Net worth API routes (assets, liabilities, net worth summary and history).
 * Prefix: /api/v1/networth
 * All routes require authentication (global auth middleware).
 */
function handleError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof NetWorthError) {
    const notFound = error.code.endsWith('_NOT_FOUND');
    return reply.status(notFound ? 404 : 400).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  });
}

function parseAmount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/** Coerce a value to a trimmed non-empty string, or null (empty/undefined → null). */
function str(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

/** Parse an integer or return null (empty/undefined/non-numeric → null). Used for optional FK ids. */
function intOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

const ASSET_STATUSES = ['active', 'sold', 'disposed'] as const;
type AssetStatus = (typeof ASSET_STATUSES)[number];

/** Validate an asset status, defaulting to 'active' when missing/invalid. */
function assetStatus(value: unknown): AssetStatus {
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (ASSET_STATUSES as readonly string[]).includes(s) ? (s as AssetStatus) : 'active';
}

export async function networthRoutes(app: FastifyInstance): Promise<void> {
  // GET /current - Net worth summary (accounts + assets - liabilities) + lists
  app.get('/current', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    try {
      const data = await NetWorthService.getCurrent(user.userId);
      return reply.send({ success: true, data });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // GET /history?startDate=&endDate= - Net worth snapshots in range
  app.get('/history', async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const { startDate, endDate } = request.query;
    const range = {
      startDate: startDate || '1970-01-01',
      endDate: endDate || new Date().toISOString().split('T')[0]!,
    };
    return reply.send({ success: true, data: NetWorthService.getHistory(user.userId, range) });
  });

  // ── Assets ──
  app.get('/assets', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    return reply.send({ success: true, data: NetWorthService.listAssets(user.userId) });
  });

  app.post('/assets', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const body = (request.body ?? {}) as Record<string, unknown>;
    // Accept currentValue (new) or value (legacy clients) for the estimated value.
    const currentValue = parseAmount(body['currentValue'] ?? body['value']);
    if (currentValue === undefined || Number.isNaN(currentValue)) {
      return reply.status(400).send({ success: false, error: { code: 'ASSET_VALUE_REQUIRED', message: 'El valor del activo es obligatorio y debe ser numérico' } });
    }
    const purchasePrice = parseAmount(body['purchasePrice']);
    if (purchasePrice !== undefined && Number.isNaN(purchasePrice)) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Precio de compra inválido' } });
    }
    try {
      const created = NetWorthService.createAsset(user.userId, {
        name: String(body['name'] ?? ''),
        currentValue,
        type: String(body['type'] ?? ''),
        brand: str(body['brand']),
        model: str(body['model']),
        serialNumber: str(body['serialNumber']),
        category: str(body['category']),
        purchaseDate: str(body['purchaseDate']),
        purchasePrice: purchasePrice ?? null,
        location: str(body['location']),
        status: assetStatus(body['status']),
        purchaseTransactionId: intOrNull(body['purchaseTransactionId']),
        receiptAttachmentId: intOrNull(body['receiptAttachmentId']),
        notes: str(body['notes']),
      });
      return reply.status(201).send({ success: true, data: created });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.put('/assets/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });
    const body = (request.body ?? {}) as Record<string, unknown>;
    const rawValue = body['currentValue'] ?? body['value'];
    const currentValue = parseAmount(rawValue);
    if (currentValue !== undefined && Number.isNaN(currentValue)) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Valor numérico inválido' } });
    }
    const purchasePrice = parseAmount(body['purchasePrice']);
    if (purchasePrice !== undefined && Number.isNaN(purchasePrice)) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Precio de compra inválido' } });
    }
    try {
      const updated = NetWorthService.updateAsset(id, user.userId, {
        ...(body['name'] !== undefined ? { name: String(body['name']) } : {}),
        ...(currentValue !== undefined ? { currentValue } : {}),
        ...(body['type'] !== undefined ? { type: String(body['type']) } : {}),
        ...(body['brand'] !== undefined ? { brand: str(body['brand']) } : {}),
        ...(body['model'] !== undefined ? { model: str(body['model']) } : {}),
        ...(body['serialNumber'] !== undefined ? { serialNumber: str(body['serialNumber']) } : {}),
        ...(body['category'] !== undefined ? { category: str(body['category']) } : {}),
        ...(body['purchaseDate'] !== undefined ? { purchaseDate: str(body['purchaseDate']) } : {}),
        ...(body['purchasePrice'] !== undefined ? { purchasePrice: purchasePrice ?? null } : {}),
        ...(body['location'] !== undefined ? { location: str(body['location']) } : {}),
        ...(body['status'] !== undefined ? { status: assetStatus(body['status']) } : {}),
        ...(body['purchaseTransactionId'] !== undefined ? { purchaseTransactionId: intOrNull(body['purchaseTransactionId']) } : {}),
        ...(body['receiptAttachmentId'] !== undefined ? { receiptAttachmentId: intOrNull(body['receiptAttachmentId']) } : {}),
        ...(body['notes'] !== undefined ? { notes: (body['notes'] as string | null) ?? null } : {}),
      });
      return reply.send({ success: true, data: updated });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.delete('/assets/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });
    try {
      return reply.send({ success: true, data: NetWorthService.deleteAsset(id, user.userId) });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ── Liabilities ──
  app.get('/liabilities', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    return reply.send({ success: true, data: NetWorthService.listLiabilities(user.userId) });
  });

  app.post('/liabilities', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const body = (request.body ?? {}) as Record<string, unknown>;
    const balance = parseAmount(body['balance']);
    if (balance === undefined || Number.isNaN(balance)) {
      return reply.status(400).send({ success: false, error: { code: 'LIABILITY_BALANCE_REQUIRED', message: 'El balance del pasivo es obligatorio y debe ser numérico' } });
    }
    try {
      const created = NetWorthService.createLiability(user.userId, {
        name: String(body['name'] ?? ''),
        balance,
        type: String(body['type'] ?? ''),
        notes: (body['notes'] as string | null | undefined) ?? null,
      });
      return reply.status(201).send({ success: true, data: created });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.put('/liabilities/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });
    const body = (request.body ?? {}) as Record<string, unknown>;
    const balance = parseAmount(body['balance']);
    if (balance !== undefined && Number.isNaN(balance)) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Valor numérico inválido' } });
    }
    try {
      const updated = NetWorthService.updateLiability(id, user.userId, {
        ...(body['name'] !== undefined ? { name: String(body['name']) } : {}),
        ...(balance !== undefined ? { balance } : {}),
        ...(body['type'] !== undefined ? { type: String(body['type']) } : {}),
        ...(body['notes'] !== undefined ? { notes: (body['notes'] as string | null) ?? null } : {}),
      });
      return reply.send({ success: true, data: updated });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.delete('/liabilities/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });
    try {
      return reply.send({ success: true, data: NetWorthService.deleteLiability(id, user.userId) });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}
