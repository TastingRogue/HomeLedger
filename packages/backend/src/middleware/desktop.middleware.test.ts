import Fastify from 'fastify';
import { randomBytes } from 'node:crypto';
import { request } from 'node:http';
import { registerDesktopBoundary } from './desktop.middleware.js';

describe('desktop boundary on a real loopback socket', () => {
  it('protects even registration and rejects foreign Host/Origin with a valid token', async () => {
    const app = Fastify();
    const token = randomBytes(32).toString('hex');
    registerDesktopBoundary(app, token);
    app.post('/register', async () => ({ ok: true }));
    const origin = await app.listen({ port: 0, host: '127.0.0.1' });
    try {
      expect((await fetch(`${origin}/register`, { method: 'POST' })).status).toBe(403);
      expect((await fetch(`${origin}/register`, { method: 'POST', headers: { 'x-homeledger-desktop': token, Origin: 'https://attacker.example' } })).status).toBe(403);
      const badHost = await new Promise<number | undefined>((resolve, reject) => {
        const req = request(`${origin}/register`, { method: 'POST', headers: { 'x-homeledger-desktop': token, Host: 'attacker.example' } }, response => { response.resume(); resolve(response.statusCode); });
        req.on('error', reject);
        req.end();
      });
      expect(badHost).toBe(403);
      expect((await fetch(`${origin}/register`, { method: 'POST', headers: { 'x-homeledger-desktop': token, Origin: origin } })).status).toBe(200);
    } finally { await app.close(); }
  });
});
