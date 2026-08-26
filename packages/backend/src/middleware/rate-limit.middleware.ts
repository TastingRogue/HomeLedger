import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

/**
 * Rate limit configuration for the HomeLedger API.
 *
 * - Auth endpoints (/api/v1/auth/*): 100 requests per minute per IP
 * - General API: 1000 requests per minute per IP
 */
export async function registerRateLimitMiddleware(app: FastifyInstance): Promise<void> {
  // Register global rate limit: 1000 req/min for general API
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.ip;
    },
    errorResponseBuilder: (_request, context) => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Límite de solicitudes excedido. Intente de nuevo en ${Math.ceil((context.ttl ?? 60000) / 1000)} segundos.`,
        },
      };
    },
  });
}

/**
 * Applies stricter rate limiting for auth routes.
 * Register this on the auth route plugin.
 *
 * Usage in auth routes:
 *   app.register(authRateLimitPlugin)
 */
export async function authRateLimitPlugin(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.ip;
    },
    errorResponseBuilder: (_request, context) => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Demasiados intentos de autenticación. Intente de nuevo en ${Math.ceil((context.ttl ?? 60000) / 1000)} segundos.`,
        },
      };
    },
  });
}
