import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService, AuthError, type TokenPayload } from '../services/auth.service.js';

/**
 * Routes that do not require authentication.
 */
const PUBLIC_ROUTES: string[] = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/health',
];

/**
 * Check if a given URL matches a public route.
 * Supports exact match and prefix match for nested paths.
 */
function isPublicRoute(url: string): boolean {
  // Remove query string if present
  const path = url.split('?')[0] ?? url;
  return PUBLIC_ROUTES.some((route) => path === route);
}

/**
 * Extracts the Bearer token from the Authorization header.
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1] ?? null;
}

/**
 * Extracts the API key from the X-API-Key header.
 */
function extractApiKey(request: FastifyRequest): string | null {
  const apiKey = request.headers['x-api-key'];
  if (typeof apiKey === 'string' && apiKey.length > 0) {
    return apiKey;
  }
  return null;
}

/**
 * Registers the authentication hook on the Fastify instance.
 * Decorates the request with a `user` property containing the TokenPayload.
 *
 * Authentication flow:
 * 1. If route is public → skip authentication
 * 2. If Authorization: Bearer <token> header present → validate JWT
 * 3. If X-API-Key: <key> header present → validate API key
 * 4. If neither → return 401
 */
export function registerAuthMiddleware(app: FastifyInstance): void {
  // Decorate request with user property (null initially)
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for public routes
    if (isPublicRoute(request.url)) {
      return;
    }

    // Try JWT Bearer token first
    const bearerToken = extractBearerToken(request.headers.authorization);
    if (bearerToken) {
      try {
        const payload = AuthService.validateToken(bearerToken);
        (request as FastifyRequest & { user: TokenPayload }).user = payload;
        return;
      } catch (error) {
        if (error instanceof AuthError) {
          return reply.status(401).send({
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: 'Error de autenticación',
          },
        });
      }
    }

    // Try API key
    const apiKey = extractApiKey(request);
    if (apiKey) {
      try {
        const payload = await AuthService.validateApiKey(apiKey);
        if (payload) {
          (request as FastifyRequest & { user: TokenPayload }).user = payload;
          return;
        }
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'API key inválida',
          },
        });
      } catch (_error) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'API_KEY_ERROR',
            message: 'Error al validar la API key',
          },
        });
      }
    }

    // No authentication provided
    return reply.status(401).send({
      success: false,
      error: {
        code: 'NO_AUTH',
        message: 'Se requiere autenticación. Incluya un token Bearer o una API key.',
      },
    });
  });
}

/**
 * Factory function to create a role-based access control hook.
 * Use as a preHandler on specific routes.
 *
 * @param roles - Array of allowed roles (e.g., ['admin', 'user'])
 * @returns Fastify preHandler hook
 *
 * @example
 * app.get('/admin-only', { preHandler: [requireRole(['admin'])] }, handler)
 */
export function requireRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (request as FastifyRequest & { user: TokenPayload | null }).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'NO_AUTH',
          message: 'Se requiere autenticación',
        },
      });
    }

    if (!roles.includes(user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'No tiene permisos para acceder a este recurso',
        },
      });
    }
  };
}
