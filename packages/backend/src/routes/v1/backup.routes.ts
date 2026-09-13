import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BackupService, BackupError } from '../../services/backup.service.js';
import { SnapshotService, SnapshotError } from '../../services/snapshot.service.js';
import { requireRole } from '../../middleware/auth.middleware.js';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Maps BackupError codes to appropriate HTTP status codes.
 * CONFIRMATION_REQUIRED → 409 Conflict
 * INVALID_FORMAT, MISSING_VERSION, MISSING_EXPORTED_AT, MISSING_DATA,
 * INVALID_DATE_FORMAT, INVALID_VERSION_FORMAT, INVALID_DATA_FIELD → 400 Bad Request
 * INCOMPATIBLE_VERSION → 400 Bad Request
 */
function handleBackupError(error: BackupError, reply: FastifyReply): FastifyReply {
  const statusCode = error.code === 'CONFIRMATION_REQUIRED' ? 409 : 400;
  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

/**
 * Registers backup API routes.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/backup (applied when registering this plugin)
 *
 * Requirements: 13.3, 13.4
 */
export async function backupRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/backup/export
   * Export all user data to a JSON backup file.
   * Returns the complete backup object with metadata (version, exportedAt) and all entities.
   *
   * Requirements: 13.3, 13.7
   */
  app.post('/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const backup = BackupService.export(user.userId);

    return reply.status(200).send({
      success: true,
      data: backup,
    });
  });

  /**
   * POST /api/v1/backup/import
   * Import data from a JSON backup, replacing all current user data atomically.
   * Requires `confirmed: true` in the request body to proceed.
   *
   * Body: { backup: BackupFile, confirmed: boolean }
   *
   * Requirements: 13.4, 13.8, 13.9
   */
  app.post('/import', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const body = request.body as Record<string, unknown> | null;

    if (!body || typeof body !== 'object') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_BODY',
          message: 'El cuerpo de la solicitud debe ser un objeto JSON válido.',
        },
      });
    }

    const confirmed = body['confirmed'] === true;
    const backup = body['backup'] ?? body;

    try {
      BackupService.import(user.userId, backup, confirmed);

      return reply.status(200).send({
        success: true,
        data: { message: 'Datos importados exitosamente. Los datos anteriores han sido reemplazados.' },
      });
    } catch (error) {
      if (error instanceof BackupError) {
        return handleBackupError(error, reply);
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/backup/history
   * Get backup history for the authenticated user.
   * Note: Full backup history tracking is not yet implemented.
   * Returns an empty array as a placeholder.
   */
  app.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    return reply.status(200).send({
      success: true,
      data: BackupService.getHistory(user.userId),
    });
  });

  // ─── Automated whole-DB snapshots (admin only) ───
  // These operate on the entire database file (all users + system data), not a
  // single user's data, so they are restricted to admins.

  /**
   * GET /api/v1/backup/snapshots
   * List the automated gzip snapshots currently on disk (newest first).
   */
  app.get('/snapshots', { preHandler: [requireRole(['admin'])] }, async (_request, reply) => {
    return reply.status(200).send({ success: true, data: SnapshotService.listSnapshots() });
  });

  /**
   * POST /api/v1/backup/snapshots
   * Manually trigger a snapshot now (also applies retention). Useful for admins
   * and for verifying backups without waiting for the schedule.
   */
  app.post('/snapshots', { preHandler: [requireRole(['admin'])] }, async (_request, reply) => {
    const snap = await SnapshotService.createSnapshot();
    const deleted = SnapshotService.applyRetention();
    return reply.status(201).send({ success: true, data: { snapshot: snap, rotatedOut: deleted } });
  });

  /**
   * POST /api/v1/backup/snapshots/:name/restore
   * Restore the entire database from a snapshot. DESTRUCTIVE: replaces all data
   * for all users. Requires `confirmed: true`. A `.pre-restore` safety copy of
   * the current DB is written before the swap.
   */
  app.post<{ Params: { name: string } }>('/snapshots/:name/restore', { preHandler: [requireRole(['admin'])] }, async (
    request,
    reply,
  ) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (body['confirmed'] !== true) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Debe confirmar la operación. Toda la base de datos será reemplazada por el respaldo.',
        },
      });
    }
    try {
      await SnapshotService.restoreSnapshot(request.params.name);
      return reply.status(200).send({
        success: true,
        data: { message: 'Base de datos restaurada desde el respaldo. Se guardó una copia previa (.pre-restore).' },
      });
    } catch (error) {
      if (error instanceof SnapshotError) {
        const statusCode = error.code === 'SNAPSHOT_NOT_FOUND' ? 404 : 400;
        return reply.status(statusCode).send({ success: false, error: { code: error.code, message: error.message } });
      }
      throw error;
    }
  });
}
