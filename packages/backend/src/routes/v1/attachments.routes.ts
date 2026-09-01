import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import { AttachmentService } from '../../services/attachment.service.js';
import * as fs from 'fs';

/**
 * Verifies the file content (magic bytes) matches the declared MIME type, so a
 * client cannot upload arbitrary content disguised as an allowed image/PDF.
 */
function contentMatchesMime(buffer: Buffer, mime: string): boolean {
  const startsWith = (bytes: number[], offset = 0): boolean =>
    bytes.every((b, i) => buffer[offset + i] === b);
  switch (mime) {
    case 'image/jpeg':
      return startsWith([0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/gif':
      return startsWith([0x47, 0x49, 0x46, 0x38]); // "GIF8"
    case 'application/pdf':
      return startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
    case 'image/webp':
      // "RIFF"...."WEBP"
      return startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8);
    default:
      return false;
  }
}

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

    // Defense in depth: verify the actual bytes match the declared type so a
    // client cannot smuggle arbitrary content under an allowed MIME type.
    if (!contentMatchesMime(buffer, data.mimetype)) {
      return reply.status(400).send({ success: false, error: { code: 'CONTENT_MISMATCH', message: 'El contenido del archivo no coincide con su tipo declarado' } });
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
   * Serve the attachment file. Use `?inline=1` to display it in the browser
   * (preview); otherwise it is sent as a download.
   */
  app.get('/:id/download', async (request: FastifyRequest<{ Params: { id: string }; Querystring: { inline?: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });

    const attachment = AttachmentService.getById(id, user.userId);
    if (!attachment) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Archivo no encontrado' } });

    const filePath = AttachmentService.getFilePath(attachment);
    if (!fs.existsSync(filePath)) return reply.status(404).send({ success: false, error: { code: 'FILE_MISSING', message: 'Archivo no encontrado en disco' } });

    const disposition = request.query.inline === '1' ? 'inline' : 'attachment';
    // Sanitize the filename before putting it in the header to avoid header
    // injection (strip CR/LF and quotes/backslashes). Also provide an RFC 5987
    // UTF-8 encoded name so non-ASCII names survive.
    const safeName = (attachment.originalName ?? `attachment-${attachment.id}`).replace(/[\r\n"\\]/g, '_');
    const encodedName = encodeURIComponent(attachment.originalName ?? `attachment-${attachment.id}`);

    const stream = fs.createReadStream(filePath);
    return reply
      .header('Content-Type', attachment.mimeType)
      .header('X-Content-Type-Options', 'nosniff')
      .header('Content-Disposition', `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodedName}`)
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
