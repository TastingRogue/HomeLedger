import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TransferService, TransferError } from '../../services/transfer.service.js';
import { createTransferSchema } from '../../validators/transfer.schema.js';
import { AccountService } from '../../services/account.service.js';

/**
 * Plugin de rutas para transferencias entre cuentas.
 * 
 * Endpoints:
 * - GET  /api/v1/transfers      → Listar transferencias del usuario
 * - POST /api/v1/transfers      → Crear transferencia con validación
 * - DELETE /api/v1/transfers/:id → Eliminar transferencia (revierte movimiento)
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export async function transferRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/transfers
   * Lista todas las transferencias del usuario autenticado, ordenadas por fecha descendente.
   * Includes source and destination account names.
   * Requirement: 3.4
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const transfers = TransferService.list(user.userId);

    // Enrich with account names
    const enriched = await Promise.all(
      transfers.map(async (t) => {
        const source = await AccountService.getById(t.sourceAccountId);
        const dest = await AccountService.getById(t.destinationAccountId);
        return {
          ...t,
          fromAccountName: source?.name ?? '—',
          toAccountName: dest?.name ?? '—',
        };
      })
    );

    return reply.status(200).send({
      success: true,
      data: enriched,
    });
  });

  /**
   * POST /api/v1/transfers
   * Crea una nueva transferencia entre cuentas del usuario.
   * Valida con Zod: nombre, fecha, monto, cuentas origen/destino diferentes.
   * Requirements: 3.1, 3.2, 3.3, 3.6
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;

    // Validate request body with Zod schema
    const parseResult = createTransferSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(422).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Error de validación',
          details: formatZodErrors(parseResult.error),
        },
      });
    }

    try {
      const transfer = TransferService.create(user.userId, parseResult.data);

      return reply.status(201).send({
        success: true,
        data: transfer,
      });
    } catch (error) {
      if (error instanceof TransferError) {
        const statusCode = getTransferErrorStatusCode(error.code);
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/transfers/:id
   * Actualiza una transferencia existente.
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });
    }

    const body = request.body as Record<string, unknown> | null;
    if (!body) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Body requerido' } });
    }

    try {
      const input: Record<string, unknown> = {};
      if (body.name) input.name = String(body.name);
      if (body.amount) input.amount = Number(body.amount);
      if (body.date) input.date = String(body.date);
      if (body.sourceAccountId) input.sourceAccountId = Number(body.sourceAccountId);
      if (body.destinationAccountId) input.destinationAccountId = Number(body.destinationAccountId);

      const transfer = TransferService.update(id, user.userId, input as any);
      return reply.status(200).send({ success: true, data: transfer });
    } catch (error) {
      if (error instanceof TransferError) {
        const statusCode = getTransferErrorStatusCode(error.code);
        return reply.status(statusCode).send({ success: false, error: { code: error.code, message: error.message } });
      }
      throw error;
    }
  });

  /**
   * DELETE /api/v1/transfers/:id
   * Elimina una transferencia y revierte el movimiento (suma a origen, resta a destino).
   * Requirement: 3.5
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'El ID de transferencia debe ser un número entero positivo',
        },
      });
    }

    try {
      TransferService.delete(id, user.userId);

      return reply.status(200).send({
        success: true,
        data: { message: 'Transferencia eliminada exitosamente' },
      });
    } catch (error) {
      if (error instanceof TransferError) {
        const statusCode = getTransferErrorStatusCode(error.code);
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }
      throw error;
    }
  });
}

/**
 * Mapea códigos de error de TransferError a códigos HTTP.
 * - SAME_ACCOUNT → 400 (solicitud inválida)
 * - INSUFFICIENT_FUNDS → 400 (solicitud inválida)
 * - TRANSFER_NOT_FOUND → 404 (no encontrado)
 * - SOURCE_NOT_FOUND, DESTINATION_NOT_FOUND → 404
 * - SOURCE_INACTIVE, DESTINATION_INACTIVE → 400
 * - ACCOUNT_NOT_FOUND → 404
 */
function getTransferErrorStatusCode(code: string): number {
  switch (code) {
    case 'SAME_ACCOUNT':
    case 'INSUFFICIENT_FUNDS':
    case 'SOURCE_INACTIVE':
    case 'DESTINATION_INACTIVE':
      return 400;
    case 'TRANSFER_NOT_FOUND':
    case 'NOT_FOUND':
    case 'SOURCE_NOT_FOUND':
    case 'DESTINATION_NOT_FOUND':
    case 'ACCOUNT_NOT_FOUND':
      return 404;
    default:
      return 400;
  }
}

/**
 * Formatea errores de Zod en un mapa campo → mensaje.
 */
function formatZodErrors(error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> }): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.map(String).join('.');
    const key = path || '_root';
    fieldErrors[key] = issue.message;
  }

  return fieldErrors;
}
