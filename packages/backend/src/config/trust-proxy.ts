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
export function parseTrustProxy(raw: string | undefined): boolean | string {
  const value = raw?.trim();
  if (!value || value === 'false' || value === '0') return false;
  if (value === 'true' || value === '1') return true;
  return value;
}
