import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/**
 * OpenAPI 3 spec + Swagger UI (P4.13).
 *
 * Registered early in buildApp (before the route modules) so any per-route
 * `schema` blocks are collected. Even without per-route schemas, this exposes a
 * browsable, self-documenting surface describing auth, the shared response
 * envelopes, and the available endpoint groups.
 *
 *   - Spec JSON:  GET /api/docs/json
 *   - Swagger UI: GET /api/docs
 *
 * Both are public (no auth) so the docs are reachable before logging in — they
 * describe the API shape, not any user data.
 */
export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'HomeLedger API',
        description: [
          'Local-first personal finance API.',
          '',
          '**Authentication.** Every `/api/v1/*` endpoint (except `login`, `register`,',
          '`refresh`, `health`, `config` and these docs) requires either a JWT',
          '`Authorization: Bearer <token>` header or an `X-API-Key: <key>` header.',
          '',
          '**Response envelope.** Success responses are `{ "success": true, "data": ... }`.',
          'Errors are `{ "success": false, "error": { "code": string, "message": string, "details"?: object } }`.',
          '',
          '**Scoped API keys.** An API key may be limited to specific scopes',
          '(e.g. `read:transactions`, `write:transactions`). A key with no scopes has',
          'full access. JWT sessions always have full access.',
        ].join('\n'),
        version: '1.0.0',
      },
      servers: [{ url: '/', description: 'This instance' }],
      tags: [
        { name: 'Auth', description: 'Login, registration, sessions, 2FA' },
        { name: 'API Keys', description: 'Create, list and revoke scoped API keys' },
        { name: 'Webhooks', description: 'User-configured outbound webhooks for domain events' },
        { name: 'Accounts', description: 'Bank/cash/credit accounts' },
        { name: 'Transactions', description: 'Income and expense transactions' },
        { name: 'Transfers', description: 'Transfers between accounts' },
        { name: 'Subscriptions', description: 'Recurring payments' },
        { name: 'Goals', description: 'Savings goals' },
        { name: 'Budgets', description: 'Category and tag budgets' },
        { name: 'Categories', description: 'Categories and subcategories' },
        { name: 'Reports', description: 'Dashboards, cash flow, trends' },
        { name: 'Net Worth', description: 'Assets, liabilities, net-worth history' },
        { name: 'Other', description: 'Rules, imports, backups, loans, alerts, tags, search, receipts' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT access token obtained from POST /api/v1/auth/login.',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'A scoped API key created via POST /api/v1/api-keys.',
          },
        },
      },
      // Applied to every operation unless overridden; either scheme is accepted.
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}
