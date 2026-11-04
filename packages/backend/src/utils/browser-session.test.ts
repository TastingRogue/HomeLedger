import { describe, it, expect } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { sessionResponse, resolveRefreshToken, clearSessionCookie } from './browser-session.js';

describe('browser refresh credentials', () => {
  it('keeps the refresh secret out of JSON and scopes the HttpOnly cookie', () => {
    const headers: Record<string, string> = {};
    const request = { protocol: 'https', headers: { 'x-homeledger-session': 'browser' } } as unknown as FastifyRequest;
    const reply = { header: (name: string, value: string) => { headers[name] = value; } } as unknown as FastifyReply;
    expect(sessionResponse(request, reply, { accessToken: 'access', refreshToken: 'secret' })).toEqual({ accessToken: 'access', refreshToken: 'cookie' });
    expect(headers['Set-Cookie']).toContain('HttpOnly; SameSite=Strict; Path=/api/v1/auth');
    expect(headers['Set-Cookie']).toContain('; Secure');
    request.headers.cookie = 'hl_refresh=secret';
    expect(resolveRefreshToken(request, 'cookie')).toBe('secret');
    delete request.headers['x-homeledger-session'];
    expect(resolveRefreshToken(request, 'cookie')).toBe('');
    expect(resolveRefreshToken(request, 'legacy-api-token')).toBe('legacy-api-token');
    request.headers['x-homeledger-session'] = 'browser';
    clearSessionCookie(request, reply);
    expect(headers['Set-Cookie']).toContain('Max-Age=0');
  });
});
