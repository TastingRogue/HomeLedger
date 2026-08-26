import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AuthError } from '../services/auth.service.js';

/**
 * Formats Zod validation errors into field-specific messages.
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    const key = path || '_root';
    fieldErrors[key] = issue.message;
  }

  return fieldErrors;
}

/**
 * Registers the global error handler on the Fastify instance.
 *
 * Error handling priority:
 * 1. Zod validation errors → 422 with field-specific messages
 * 2. AuthError → 401 or 403 depending on the error code
 * 3. Fastify validation errors → 400
 * 4. Generic errors → 500 with "Error interno del servidor"
 *
 * All error messages are in Spanish.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, _request: FastifyRequest, reply: FastifyReply) => {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(422).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Error de validación',
          details: formatZodErrors(error),
        },
      });
    }

    // Handle AuthError
    if (error instanceof AuthError) {
      const statusCode = getAuthErrorStatusCode(error.code);
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    // Handle Fastify built-in validation errors (JSON schema validation)
    if ('validation' in error && error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Solicitud inválida',
          details: error.message,
        },
      });
    }

    // Handle known HTTP errors with statusCode
    if ('statusCode' in error && typeof error.statusCode === 'number' && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: 'CLIENT_ERROR',
          message: error.message || 'Error en la solicitud',
        },
      });
    }

    // Log the error for debugging (in production, use a proper logger)
    app.log.error(error);

    // Generic server error
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
      },
    });
  });
}

/**
 * Maps AuthError codes to HTTP status codes.
 * FORBIDDEN-type errors get 403, everything else gets 401.
 */
function getAuthErrorStatusCode(code: string): number {
  const forbiddenCodes = ['FORBIDDEN', 'INSUFFICIENT_PERMISSIONS'];

  if (forbiddenCodes.includes(code)) {
    return 403;
  }

  return 401;
}
