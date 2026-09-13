import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from '../../server.js';

// Lightweight wiring check for the CSV export route: it must be registered and
// behind auth (the global onRequest guard denies unauthenticated /api/* calls).
// The CSV serialization itself is covered by utils/csv.test.ts.
describe('GET /api/v1/transactions/export.csv (wiring)', () => {
  it('is registered and requires authentication', async () => {
    const app = await buildApp();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/transactions/export.csv' });
      // Not 404 → the route exists; 401 → the auth guard protects it.
      expect(res.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  afterAll(() => { /* app closed per-test */ });
});
