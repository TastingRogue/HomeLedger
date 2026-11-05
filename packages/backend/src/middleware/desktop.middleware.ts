import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

/** Only the owning Electron session may reach a desktop instance, including registration. */
export function registerDesktopBoundary(app: FastifyInstance, token: string): void {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid desktop instance token');
  const expected = Buffer.from(token);
  app.addHook('onRequest', async (request, reply) => {
    const value = request.headers['x-homeledger-desktop'];
    const actual = Buffer.from(typeof value === 'string' ? value : '');
    const host = `127.0.0.1:${request.raw.socket.localPort}`;
    const origin = request.headers.origin;
    if (request.headers.host !== host || (origin && origin !== `http://${host}`) ||
        actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return reply.code(403).send({ error: 'Desktop session required' });
    }
  });
}
