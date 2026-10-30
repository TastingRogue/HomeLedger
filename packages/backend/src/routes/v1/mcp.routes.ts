import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { AuthService, AuthError, type TokenPayload } from '../../services/auth.service.js';
import { authRateLimitPlugin } from '../../middleware/rate-limit.middleware.js';
import { getDb } from '../../db/connection.js';
import { users } from '../../db/schema.js';
import { disableMcp, enableMcp, getMcpStatus, isMcpEnabled } from '../../config/mcp.js';
import { createMcpServer } from '../../mcp/tools.js';

/**
 * MCP (Model Context Protocol) endpoint. Prefix: /api/v1/mcp
 *
 *   POST /api/v1/mcp          MCP Streamable HTTP endpoint (API key only)
 *   GET  /api/v1/mcp/status   Is MCP enabled for me?            (login session only)
 *   POST /api/v1/mcp/enable   Enable after explicit confirmation (login session only)
 *   POST /api/v1/mcp/disable  Disable                            (login session only)
 *
 * MCP exposes a user's financial data to external AI clients, so it is off by
 * default and each user must turn it on knowingly. Enabling needs a login
 * session (an API key cannot enable MCP for itself), an explicit
 * acknowledgement, and the user's password (+ 2FA code when set up).
 */

function error(reply: FastifyReply, status: number, code: string, message: string): FastifyReply {
  return reply.status(status).send({ success: false, error: { code, message } });
}

/** Management endpoints are for a logged-in person, never for an API key. */
function requireSession(request: FastifyRequest, reply: FastifyReply): TokenPayload | null {
  const user = request.user as TokenPayload | null;
  if (!user) {
    error(reply, 401, 'NOT_AUTHENTICATED', 'Not authenticated');
    return null;
  }
  if (request.authSource !== 'jwt') {
    error(reply, 403, 'SESSION_REQUIRED', 'This action requires a login session, not an API key');
    return null;
  }
  return user;
}

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
    else if (typeof value === 'string') headers.set(name, value);
  }
  // Be lenient with simple clients (curl) that omit the Accept pair the spec asks for.
  if (!headers.get('accept')?.includes('text/event-stream')) {
    headers.set('accept', 'application/json, text/event-stream');
  }
  const host = request.headers.host ?? 'localhost';
  const init: RequestInit = { method: request.method, headers };
  if (request.method === 'POST') init.body = JSON.stringify(request.body ?? null);
  return new Request(`${request.protocol}://${host}${request.url}`, init);
}

export async function mcpRoutes(app: FastifyInstance): Promise<void> {
  // ---- Protocol endpoint -------------------------------------------------
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload | null;
    if (!user) return error(reply, 401, 'NOT_AUTHENTICATED', 'Not authenticated');

    if (request.authSource !== 'apikey') {
      return error(reply, 403, 'API_KEY_REQUIRED', 'The MCP endpoint only accepts an API key');
    }
    const account = getDb().select({ disabled: users.disabled }).from(users).where(eq(users.id, user.userId)).get();
    if (!account || account.disabled) {
      return error(reply, 403, 'ACCOUNT_DISABLED', 'The account is disabled');
    }
    if (!isMcpEnabled(user.userId)) {
      return error(reply, 403, 'MCP_DISABLED', 'MCP is not enabled for this user. Enable it in Settings > API.');
    }

    const apiKey = (request.headers['x-api-key'] as string | undefined) ?? request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';

    // Stateless: a fresh server + transport per request, nothing kept in memory.
    const server = createMcpServer({
      app,
      apiKey,
      scopes: request.apiKeyScopes,
      ip: request.ip,
    });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    try {
      await server.connect(transport);
      const response = await transport.handleRequest(toWebRequest(request), { parsedBody: request.body });
      reply.status(response.status);
      response.headers.forEach((value, name) => reply.header(name, value));
      return reply.send(await response.text());
    } finally {
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  });

  // Stateless server: no standalone SSE stream and no sessions to terminate.
  const notAllowed = async (_request: FastifyRequest, reply: FastifyReply) =>
    reply
      .header('Allow', 'POST')
      .status(405)
      .send({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  app.get('/', notAllowed);
  app.delete('/', notAllowed);

  // ---- Consent management ------------------------------------------------
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireSession(request, reply);
    if (!user) return reply;
    return reply.send({ success: true, data: getMcpStatus(user.userId) });
  });

  // Stricter per-IP limit on the endpoints that check a password.
  await app.register(async (sensitive) => {
    await authRateLimitPlugin(sensitive);

    sensitive.post('/enable', async (request: FastifyRequest, reply: FastifyReply) => {
      const user = requireSession(request, reply);
      if (!user) return reply;

      const body = (request.body ?? {}) as { acknowledged?: unknown; password?: unknown; totpCode?: unknown };
      if (body.acknowledged !== true) {
        return error(reply, 400, 'ACK_REQUIRED', 'You must acknowledge that MCP gives AI clients access to your financial data');
      }
      if (typeof body.password !== 'string' || body.password.length === 0) {
        return error(reply, 400, 'PASSWORD_REQUIRED', 'Your password is required to enable MCP');
      }
      try {
        await AuthService.verifyReauth(
          user.userId,
          body.password,
          typeof body.totpCode === 'string' ? body.totpCode : undefined,
        );
      } catch (e) {
        if (e instanceof AuthError) return error(reply, 401, e.code, e.message);
        throw e;
      }
      const status = enableMcp(user.userId);
      request.log.info({ userId: user.userId }, 'MCP enabled');
      return reply.send({ success: true, data: status });
    });

    sensitive.post('/disable', async (request: FastifyRequest, reply: FastifyReply) => {
      const user = requireSession(request, reply);
      if (!user) return reply;
      const status = disableMcp(user.userId);
      request.log.info({ userId: user.userId }, 'MCP disabled');
      return reply.send({ success: true, data: status });
    });
  });
}
