import type { TokenPayload } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload | null;
  }
}
