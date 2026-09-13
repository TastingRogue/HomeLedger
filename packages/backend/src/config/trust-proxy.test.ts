import { describe, it, expect } from 'vitest';
import { parseTrustProxy } from './trust-proxy.js';

// `trustProxy` controls whether Fastify derives `request.ip` from
// X-Forwarded-For. Rate limiting keys on `request.ip`, so this parser is the
// hinge of "rate limiting is correct behind a proxy": OFF by default (so a
// direct client can't spoof its IP), ON only when the operator opts in.
describe('parseTrustProxy', () => {
  it('is disabled by default (unset / empty)', () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy('')).toBe(false);
    expect(parseTrustProxy('   ')).toBe(false);
  });

  it('treats "false" / "0" as disabled', () => {
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('0')).toBe(false);
  });

  it('treats "true" / "1" as trusting the immediate proxy', () => {
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('1')).toBe(true);
  });

  it('passes through a hop count or CIDR/subnet string to Fastify', () => {
    expect(parseTrustProxy('2')).toBe('2');
    expect(parseTrustProxy('127.0.0.1')).toBe('127.0.0.1');
    expect(parseTrustProxy('10.0.0.0/8')).toBe('10.0.0.0/8');
  });

  it('trims surrounding whitespace before interpreting', () => {
    expect(parseTrustProxy('  true  ')).toBe(true);
    expect(parseTrustProxy('  10.0.0.0/8  ')).toBe('10.0.0.0/8');
  });
});
