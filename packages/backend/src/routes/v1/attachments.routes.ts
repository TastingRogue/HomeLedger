import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import { AttachmentService } from '../../services/attachment.service.js';
import * as fs from 'fs';

/**
 * Routes for file attachments (receipts, invoices).
 * Prefix: /api/v1/attachments
 */
export async function attachmentRoutes(app: FastifyInstance): Promise<void> {
  // Register multipart for file uploads
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });
  /**
   * POST /api/v1/attachments/upload
   * Upload a file and optionally link to a transaction or transfer.
   * Multipart form: file + optional transactionId/transferId fields.
   */
  app.post('/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, error: { code: 'NO_FILE', message: 'No se adjuntó ningún archivo' } });
    }

    const buffer = await data.toBuffer();
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      return reply.status(400).send({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'El archivo no debe exceder 10MB' } });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/gif'];
    if (!allowedMimes.includes(data.mimetype)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_TYPE', message: 'Solo se permiten imágenes (JPG, PNG, WEBP, GIF) y PDFs' } });
    }

    // Parse optional link fields from multipart
    const fields = data.fields as Record<string, any>;
    const transactionId = fields?.transactionId?.value ? parseInt(fields.transactionId.value, 10) : undefined;
    const transferId = fields?.transferId?.value ? parseInt(fields.transferId.value, 10) : undefined;

    const attachment = AttachmentService.save(
      user.userId,
      { filename: data.filename, data: buffer, mimetype: data.mimetype },
      { transactionId, transferId }
    );

    return reply.status(201).send({ success: true, data: attachment });
  });

  /**
   * GET /api/v1/attachments
   * List all attachments. Query params: transactionId, transferId
   */
  app.get('/', async (request: FastifyRequest<{ Querystring: { transactionId?: string; transferId?: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const { transactionId, transferId } = request.query;

    const filter: { transactionId?: number; transferId?: number } = {};
    if (transactionId) filter.transactionId = parseInt(transactionId, 10);
    if (transferId) filter.transferId = parseInt(transferId, 10);

    const list = AttachmentService.list(user.userId, Object.keys(filter).length > 0 ? filter : undefined);
    return reply.status(200).send({ success: true, data: list });
  });

  /**
   * GET /api/v1/attachments/:id/download
   * Download the attachment file.
   */
  app.get('/:id/download', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });

    const attachment = AttachmentService.getById(id, user.userId);
    if (!attachment) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Archivo no encontrado' } });

    const filePath = AttachmentService.getFilePath(attachment);
    if (!fs.existsSync(filePath)) return reply.status(404).send({ success: false, error: { code: 'FILE_MISSING', message: 'Archivo no encontrado en disco' } });

    const stream = fs.createReadStream(filePath);
    return reply
      .header('Content-Type', attachment.mimeType)
      .header('Content-Disposition', `attachment; filename="${attachment.originalName}"`)
      .send(stream);
  });

  /**
   * PUT /api/v1/attachments/:id/link
   * Link/unlink an attachment to a transaction or transfer.
   */
  app.put('/:id/link', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const id = parseInt(request.params.id, 10);
    const body = request.body as Record<string, unknown> | null;

    if (isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });

    const linkTo: { transactionId?: number; transferId?: number } = {};
    if (body?.transactionId) linkTo.transactionId = Number(body.transactionId);
    if (body?.transferId) linkTo.transferId = Number(body.transferId);

    const result = AttachmentService.link(id, user.userId, linkTo);
    if (!result) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Archivo no encontrado' } });

    return reply.status(200).send({ success: true, data: result });
  });

  /**
   * DELETE /api/v1/attachments/:id
   * Delete an attachment (file + record).
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });

    const deleted = AttachmentService.delete(id, user.userId);
    if (!deleted) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Archivo no encontrado' } });

    return reply.status(200).send({ success: true, data: { message: 'Archivo eliminado' } });
  });
}
