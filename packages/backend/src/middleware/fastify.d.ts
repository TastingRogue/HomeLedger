import type { TokenPayload } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload | null;
    // How the request was authenticated (P4.13). JWT sessions have full access;
    // API keys may be scope-restricted.
    authSource: 'jwt' | 'apikey' | null;
    // The authenticating API key's scopes (null = full access). Only meaningful
    // when authSource === 'apikey'.
    apiKeyScopes: string[] | null;
  }
}
