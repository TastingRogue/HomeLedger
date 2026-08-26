/**
 * Plugin de rutas para importación bancaria.
 *
 * Endpoints:
 * - POST /api/v1/imports/upload      → Subir archivo CSV/OFX/Excel
 * - GET  /api/v1/imports/:id/preview → Preview de transacciones detectadas
 * - POST /api/v1/imports/:id/confirm → Confirmar importación
 * - GET  /api/v1/imports/history     → Historial de importaciones
 * - GET  /api/v1/imports/parsers     → Parsers disponibles (bancos)
 *
 * Requirements: design Import Engine section
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import { ImportService, ImportError } from '../../services/import.service.js';
import { confirmImportSchema } from '../../validators/import.schema.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Maps ImportError codes to HTTP status codes.
 */
function getImportErrorStatusCode(code: string): number {
  switch (code) {
    case 'IMPORT_NOT_FOUND':
    case 'SESSION_DATA_EXPIRED':
      return 404;
    case 'IMPORT_ALREADY_CONFIRMED':
      return 409;
    case 'PARSER_NOT_FOUND':
    case 'UNSUPPORTED_FORMAT':
    case 'EMPTY_FILE':
      return 400;
    case 'PARSE_ERROR':
    case 'NO_TRANSACTIONS':
    case 'NO_CATEGORIES':
      return 422;
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

/**
 * Registers import API routes.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/imports (applied when registering this plugin)
 */
export async function importRoutes(app: FastifyInstance): Promise<void> {
  // Register multipart plugin for file uploads (scoped to this plugin)
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB max file size
      files: 1, // Only 1 file per upload
    },
  });

  /**
   * POST /api/v1/imports/upload
   * Accept multipart form data with a file field, optional parser and accountId fields.
   * Creates an import session and returns parsed transaction preview metadata.
   */
  app.post('/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Se requiere un archivo para la importación',
        },
      });
    }

    // Read file buffer
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    if (fileBuffer.length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'EMPTY_FILE',
          message: 'El archivo está vacío',
        },
      });
    }

    // Extract optional fields from multipart
    const fields = data.fields;
    let parser: string | undefined;
    let accountId: number | undefined;

    if (fields.parser && 'value' in fields.parser) {
      parser = fields.parser.value as string;
    }
    if (fields.accountId && 'value' in fields.accountId) {
      const parsed = parseInt(fields.accountId.value as string, 10);
      if (!isNaN(parsed) && parsed > 0) {
        accountId = parsed;
      }
    }

    try {
      const session = ImportService.upload(user.userId, fileBuffer, data.filename, {
        parser,
        accountId,
      });

      return reply.status(201).send({
        success: true,
        data: session,
      });
    } catch (error) {
      if (error instanceof ImportError) {
        const statusCode = getImportErrorStatusCode(error.code);
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
   * GET /api/v1/imports/:id/preview
   * Return parsed transactions from the import session for user review.
   */
  app.get('/:id/preview', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de importación debe ser un número válido',
        },
      });
    }

    try {
      const preview = ImportService.preview(id, user.userId);

      return reply.status(200).send({
        success: true,
        data: preview,
      });
    } catch (error) {
      if (error instanceof ImportError) {
        const statusCode = getImportErrorStatusCode(error.code);
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
   * POST /api/v1/imports/:id/confirm
   * Accept body with mappings and selected transaction indices, insert into DB.
   */
  app.post('/:id/confirm', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de importación debe ser un número válido',
        },
      });
    }

    // Validate body
    const parseResult = confirmImportSchema.safeParse(request.body);

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

    const body = parseResult.data;

    try {
      const result = ImportService.confirm(id, user.userId, {
        mappings: body.mappings?.map(m => ({
          sourceColumn: m.sourceField,
          targetField: m.targetField as 'date' | 'description' | 'amount' | 'reference' | 'balance',
        })),
        selectedTransactionIds: body.selectedTransactionIds,
        defaultCategoryId: body.defaultCategoryId,
        accountId: (request.body as Record<string, unknown>)?.accountId
          ? parseInt(String((request.body as Record<string, unknown>).accountId), 10)
          : undefined,
      });

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ImportError) {
        const statusCode = getImportErrorStatusCode(error.code);
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
   * GET /api/v1/imports/history
   * Return list of import sessions for the authenticated user.
   */
  app.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const history = ImportService.getHistory(user.userId);

    return reply.status(200).send({
      success: true,
      data: history,
    });
  });

  /**
   * GET /api/v1/imports/parsers
   * Return available parsers (bankId, bankName, supportedFormats).
   */
  app.get('/parsers', async (_request: FastifyRequest, reply: FastifyReply) => {
    const parsers = ImportService.getAvailableParsers();

    return reply.status(200).send({
      success: true,
      data: parsers,
    });
  });
}
