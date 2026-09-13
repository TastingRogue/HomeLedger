import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import { initializeDatabase, closeDatabase, getSqlite } from './db/connection.js';
import { seed } from './db/seed.js';
import { assertSecureStartup } from './security-check.js';
import { getDefaultLocale } from './config/locale.js';
import { registerAuthMiddleware, registerRateLimitMiddleware, registerErrorHandler } from './middleware/index.js';
import { requireRole } from './middleware/auth.middleware.js';
import { startScheduler, stopScheduler } from './scheduler/index.js';
import { getSchedulerStatus } from './scheduler/status.js';
import { authRoutes } from './routes/v1/auth.routes.js';
import { accountRoutes } from './routes/v1/accounts.routes.js';
import { transactionRoutes } from './routes/v1/transactions.routes.js';
import { transferRoutes } from './routes/v1/transfers.routes.js';
import { subscriptionRoutes } from './routes/v1/subscriptions.routes.js';
import { goalRoutes } from './routes/v1/goals.routes.js';
import { budgetRoutes } from './routes/v1/budgets.routes.js';
import { categoryRoutes } from './routes/v1/categories.routes.js';
import { rulesRoutes } from './routes/v1/rules.routes.js';
import { importRoutes } from './routes/v1/imports.routes.js';
import { reportRoutes } from './routes/v1/reports.routes.js';
import { backupRoutes } from './routes/v1/backup.routes.js';
import { loanRoutes } from './routes/v1/loans.routes.js';
import { alertRoutes } from './routes/v1/alerts.routes.js';
import { haRoutes } from './routes/v1/ha.routes.js';
import { attachmentRoutes } from './routes/v1/attachments.routes.js';
import { receiptRoutes } from './routes/v1/receipts.routes.js';
import { networthRoutes } from './routes/v1/networth.routes.js';

/**
 * Parse the TRUST_PROXY env into a Fastify `trustProxy` value.
 * Only enable this when HomeLedger runs behind a reverse proxy you control,
 * so `request.ip` (used for rate limiting/logging) reflects the real client
 * from `X-Forwarded-For` instead of the proxy's address. Enabling it without a
 * proxy would let clients spoof their IP, so it is OFF by default.
 *   - unset / "false" / "0" → disabled (direct connections)
 *   - "true" / "1"          → trust the immediate proxy
 *   - anything else         → passed through to Fastify (e.g. a hop count like
 *     "2", or a CIDR/subnet). Fastify accepts a string here.
 */
function parseTrustProxy(raw: string | undefined): boolean | string {
  const value = raw?.trim();
  if (!value || value === 'false' || value === '0') return false;
  if (value === 'true' || value === '1') return true;
  return value;
}

export async function buildApp() {
  const options: FastifyServerOptions = {
    logger: { level: process.env['LOG_LEVEL'] || 'info' },
    trustProxy: parseTrustProxy(process.env['TRUST_PROXY']),
  };
  const app = Fastify(options);
  // CORS: restrict to configured origins in production. Set CORS_ORIGIN to a
  // comma-separated list of allowed origins (e.g. "https://app.example.com").
  // When unset, reflect the request origin (convenient for local/self-hosted
  // single-origin setups where the frontend is served from the same host).
  const corsEnv = process.env['CORS_ORIGIN']?.trim();
  const corsOrigin = corsEnv
    ? corsEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : true;
  await app.register(cors, { origin: corsOrigin, credentials: true });
  await registerRateLimitMiddleware(app);
  registerAuthMiddleware(app);
  registerErrorHandler(app);
  // Liveness/readiness probe with a real DB connectivity check. Returns 503 when
  // the database can't be reached so Docker/HA healthchecks can detect it.
  app.get('/api/v1/health', async (_request, reply) => {
    let dbOk = true;
    try {
      getSqlite().prepare('SELECT 1').get();
    } catch (error) {
      dbOk = false;
      app.log.error({ error }, 'Health check DB probe failed');
    }
    const payload = {
      status: dbOk ? 'ok' : 'error',
      db: dbOk ? 'ok' : 'error',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
    return reply.code(dbOk ? 200 : 503).send(payload);
  });
  // Public runtime config for the frontend (no auth). Exposes the host's chosen
  // primary language so the UI can default to it before any user preference.
  app.get('/api/v1/config', async () => ({ defaultLocale: getDefaultLocale() }));
  // Admin-only scheduler status: makes a silently-failed cron job visible.
  app.get('/api/v1/health/scheduler', { preHandler: [requireRole(['admin'])] }, async () => ({
    success: true,
    data: getSchedulerStatus(),
  }));
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(accountRoutes, { prefix: '/api/v1/accounts' });
  await app.register(transactionRoutes, { prefix: '/api/v1/transactions' });
  await app.register(transferRoutes, { prefix: '/api/v1/transfers' });
  await app.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' });
  await app.register(goalRoutes, { prefix: '/api/v1/goals' });
  await app.register(budgetRoutes, { prefix: '/api/v1/budgets' });
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  await app.register(rulesRoutes, { prefix: '/api/v1/rules' });
  await app.register(importRoutes, { prefix: '/api/v1/imports' });
  await app.register(reportRoutes, { prefix: '/api/v1/reports' });
  await app.register(backupRoutes, { prefix: '/api/v1/backup' });
  await app.register(loanRoutes, { prefix: '/api/v1/loans' });
  await app.register(alertRoutes, { prefix: '/api/v1/alerts' });
  await app.register(haRoutes, { prefix: '/api/v1/ha' });
  await app.register(attachmentRoutes, { prefix: '/api/v1/attachments' });
  await app.register(receiptRoutes, { prefix: '/api/v1/receipts' });
  await app.register(networthRoutes, { prefix: '/api/v1/networth' });

  try {
    // SvelteKit (adapter-node) generates this file during the frontend build.
    // Keep the module specifier dynamic so backend TypeScript does not require the generated file to exist yet.
    const frontendHandlerModule = '../../../packages/frontend/build/handler.js';
    const { handler } = await import(frontendHandlerModule);
    // Delegate to SvelteKit only for requests the API routes did not match
    // (frontend pages + static assets). API routes keep their own 404s under
    // the /api prefix; everything else is rendered/served by SvelteKit.
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'Not Found' });
        return;
      }
      reply.hijack();
      handler(request.raw, reply.raw);
    });
    app.log.info('SvelteKit frontend mounted');
  } catch (error) {
    app.log.warn({ error }, 'Frontend handler not available (expected in development)');
  }
  return app;
}

async function start(): Promise<void> {
  // Validate security-sensitive config BEFORE building the app or touching the
  // DB. In production, insecure demo secrets abort startup (unless explicitly
  // allowed); otherwise we log a loud warning.
  try {
    const warnings = assertSecureStartup();
    for (const line of warnings) console.warn(line);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const app = await buildApp();
  const port = parseInt(process.env['PORT'] || '3000', 10);
  const host = process.env['HOST'] || '0.0.0.0';
  try {
    initializeDatabase();
    app.log.info('Database initialized and migrations applied.');
  } catch (error) {
    app.log.error(error, 'Failed to initialize database.');
    process.exit(1);
  }
  try {
    await seed();
    app.log.info('Database seeding complete.');
  } catch (error) {
    app.log.error(error, 'Database seeding failed.');
  }
  startScheduler();
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);
    try {
      stopScheduler();
      await app.close();
      closeDatabase();
      app.log.info('Server closed.');
      process.exit(0);
    } catch (error) {
      app.log.error(error, 'Error during shutdown.');
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  try {
    await app.listen({ port, host });
    app.log.info(`HomeLedger API running on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error, 'Failed to start server.');
    process.exit(1);
  }
}

start();
