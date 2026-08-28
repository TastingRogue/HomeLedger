import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ReceiptService } from '../../services/receipt.service.js';

export async function receiptRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    return reply.send({ success: true, data: ReceiptService.list(user.userId) });
  });

  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const id = Number(request.params.id);
    if (!Number.isInteger(id)) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });
    const receipt = ReceiptService.get(id, user.userId);
    if (!receipt) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Análisis no encontrado' } });
    return reply.send({ success: true, data: receipt });
  });

  app.post('/:attachmentId/analyze', async (request: FastifyRequest<{ Params: { attachmentId: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const attachmentId = Number(request.params.attachmentId);
    if (!Number.isInteger(attachmentId)) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'ID inválido' } });
    try {
      const receipt = await ReceiptService.analyze(attachmentId, user.userId);
      return reply.send({ success: true, data: receipt });
    } catch (error) {
      return reply.status(400).send({ success: false, error: { code: 'ANALYSIS_FAILED', message: error instanceof Error ? error.message : 'No se pudo analizar el archivo' } });
    }
  });
}
