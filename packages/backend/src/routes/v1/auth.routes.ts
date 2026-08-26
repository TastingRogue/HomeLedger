import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService, AuthError } from '../../services/auth.service.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../../validators/auth.schema.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Auth API routes.
 * These are PUBLIC routes (no auth middleware required for login/register/refresh).
 *
 * Endpoints:
 *   POST /api/v1/auth/register  - Create a new user
 *   POST /api/v1/auth/login     - Login and get tokens
 *   POST /api/v1/auth/refresh   - Refresh access token
 *   POST /api/v1/auth/logout    - Invalidate refresh token
 *   GET  /api/v1/auth/me        - Get current user profile
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/auth/register
   * Create a new user. First user becomes admin.
   */
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerSchema.parse(request.body);

    try {
      const result = await AuthService.register(parsed);

      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        const statusCode = error.code === 'EMAIL_EXISTS' ? 409 : 400;
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
   * POST /api/v1/auth/login
   * Authenticate with email/password, returns access + refresh tokens.
   */
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.parse(request.body);

    try {
      const result = await AuthService.login(parsed);

      return reply.status(200).send({
        success: true,
        data: result,
      });
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
      throw error;
    }
  });

  /**
   * POST /api/v1/auth/refresh
   * Issue a new access token using a valid refresh token.
   */
  app.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = refreshTokenSchema.parse(request.body);

    try {
      const result = await AuthService.refresh(parsed.refreshToken);

      return reply.status(200).send({
        success: true,
        data: result,
      });
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
      throw error;
    }
  });

  /**
   * POST /api/v1/auth/logout
   * Invalidate the refresh token.
   */
  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown> | null;
    const refreshToken = body?.refreshToken as string | undefined;

    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    return reply.status(200).send({
      success: true,
      data: { message: 'Sesión cerrada exitosamente' },
    });
  });

  /**
   * GET /api/v1/auth/me
   * Get the current authenticated user's profile.
   */
  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload | null;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'No autenticado' },
      });
    }

    // Query DB for full user data
    const { getDb } = await import('../../db/connection.js');
    const { users } = await import('../../db/schema.js');
    const { eq } = await import('drizzle-orm');
    const db = getDb();
    const dbUser = db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).where(eq(users.id, user.userId)).get();

    if (!dbUser) {
      return reply.status(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
    }

    return reply.status(200).send({
      success: true,
      data: dbUser,
    });
  });

  /**
   * PUT /api/v1/auth/me
   * Update current user's profile (name).
   */
  app.put('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload | null;
    if (!user) {
      return reply.status(401).send({ success: false, error: { code: 'NOT_AUTHENTICATED', message: 'No autenticado' } });
    }

    const body = request.body as Record<string, unknown> | null;
    if (!body) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Body requerido' } });
    }

    const { getDb } = await import('../../db/connection.js');
    const { users } = await import('../../db/schema.js');
    const { eq } = await import('drizzle-orm');
    const db = getDb();

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.name && typeof body.name === 'string') updates.name = body.name.trim();

    const result = db.update(users).set(updates as any).where(eq(users.id, user.userId)).returning().get();

    return reply.status(200).send({
      success: true,
      data: { id: result!.id, name: result!.name, email: result!.email, role: result!.role },
    });
  });

  /**
   * POST /api/v1/auth/change-password
   * Change user's password (requires current password).
   */
  app.post('/change-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload | null;
    if (!user) {
      return reply.status(401).send({ success: false, error: { code: 'NOT_AUTHENTICATED', message: 'No autenticado' } });
    }

    const body = request.body as Record<string, unknown> | null;
    const currentPassword = body?.currentPassword as string | undefined;
    const newPassword = body?.newPassword as string | undefined;

    if (!currentPassword || !newPassword) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Se requieren contraseña actual y nueva' } });
    }

    if (newPassword.length < 6) {
      return reply.status(400).send({ success: false, error: { code: 'WEAK_PASSWORD', message: 'La nueva contraseña debe tener al menos 6 caracteres' } });
    }

    const { getDb } = await import('../../db/connection.js');
    const { users } = await import('../../db/schema.js');
    const { eq } = await import('drizzle-orm');
    const bcrypt = await import('bcrypt');
    const db = getDb();

    const dbUser = db.select().from(users).where(eq(users.id, user.userId)).get();
    if (!dbUser) {
      return reply.status(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
    }

    const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_PASSWORD', message: 'La contraseña actual es incorrecta' } });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    db.update(users).set({ passwordHash: newHash, updatedAt: new Date().toISOString() }).where(eq(users.id, user.userId)).run();

    return reply.status(200).send({ success: true, data: { message: 'Contraseña actualizada exitosamente' } });
  });

  /**
   * POST /api/v1/auth/revoke-all-sessions
   * Revoke all refresh tokens for the current user.
   */
  app.post('/revoke-all-sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload | null;
    if (!user) {
      return reply.status(401).send({ success: false, error: { code: 'NOT_AUTHENTICATED', message: 'No autenticado' } });
    }

    const { getDb } = await import('../../db/connection.js');
    const { refreshTokens } = await import('../../db/schema.js');
    const { eq } = await import('drizzle-orm');
    const db = getDb();

    db.delete(refreshTokens).where(eq(refreshTokens.userId, user.userId)).run();

    return reply.status(200).send({ success: true, data: { message: 'Todas las sesiones han sido cerradas' } });
  });
}
