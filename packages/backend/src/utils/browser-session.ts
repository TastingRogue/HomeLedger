import type { FastifyRequest, FastifyReply } from 'fastify';

const cookieName = 'hl_refresh';
export const cookieMarker = 'cookie';

export function browserSession(request: FastifyRequest): boolean {
  return request.headers['x-homeledger-session'] === 'browser';
}

export function sessionResponse<T extends { refreshToken: string }>(request: FastifyRequest, reply: FastifyReply, result: T): T {
  if (!browserSession(request)) return result;
  const secure = request.protocol === 'https' ? '; Secure' : '';
  reply.header('Set-Cookie', `${cookieName}=${encodeURIComponent(result.refreshToken)}; HttpOnly; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800${secure}`);
  return { ...result, refreshToken: cookieMarker };
}

export function resolveRefreshToken(request: FastifyRequest, value: string): string {
  if (value !== cookieMarker) return value;
  if (!browserSession(request)) return '';
  const cookie = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
  try { return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : ''; }
  catch { return ''; }
}

export function clearSessionCookie(request: FastifyRequest, reply: FastifyReply): void {
  if (browserSession(request)) reply.header('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/api/v1/auth; Max-Age=0${request.protocol === 'https' ? '; Secure' : ''}`);
}
