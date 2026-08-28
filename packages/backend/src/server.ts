import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initializeDatabase, closeDatabase } from './db/connection.js';
import { seed } from './db/seed.js';
import { registerAuthMiddleware, registerRateLimitMiddleware, registerErrorHandler } from './middleware/index.js';
import { startScheduler, stopScheduler } from './scheduler/index.js';
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

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env['LOG_LEVEL'] || 'info' } });
  await app.register(cors, { origin: true, credentials: true });
  await registerRateLimitMiddleware(app);
  registerAuthMiddleware(app);
  registerErrorHandler(app);
  app.get('/api/v1/health', async () => ({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() }));
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

  try {
    // SvelteKit generates this file during the frontend workspace build.
    // Keep the module specifier dynamic so backend TypeScript does not require the generated file to exist yet.
    const frontendHandlerModule = '../../../packages/frontend/build/handler.js';
    const { handler } = await import(frontendHandlerModule);
    app.all('/*', async (request, reply) => {
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
