import { describe, it, expect } from 'vitest';
import { collectSecurityIssues, assertSecureStartup } from './security-check.js';

const STRONG_SECRET = 'a'.repeat(40); // 40 chars, not a known demo value

describe('security-check', () => {
  describe('collectSecurityIssues', () => {
    it('reports no issues for a strong secret and non-demo password', () => {
      const issues = collectSecurityIssues({
        JWT_SECRET: STRONG_SECRET,
        ADMIN_PASSWORD: 'a-very-strong-password',
      });
      expect(issues).toHaveLength(0);
    });

    it('flags a missing JWT_SECRET', () => {
      const issues = collectSecurityIssues({});
      expect(issues.some((i) => i.key === 'JWT_SECRET')).toBe(true);
    });

    it('flags the known demo JWT_SECRET', () => {
      const issues = collectSecurityIssues({
        JWT_SECRET: 'insecure-dev-secret-change-me-min-32-characters-long',
      });
      expect(issues.some((i) => i.key === 'JWT_SECRET')).toBe(true);
    });

    it('flags a too-short JWT_SECRET', () => {
      const issues = collectSecurityIssues({ JWT_SECRET: 'short' });
      expect(issues.some((i) => i.key === 'JWT_SECRET' && /too short/.test(i.message))).toBe(true);
    });

    it('flags the demo ADMIN_PASSWORD', () => {
      const issues = collectSecurityIssues({
        JWT_SECRET: STRONG_SECRET,
        ADMIN_PASSWORD: 'changeme123',
      });
      expect(issues.some((i) => i.key === 'ADMIN_PASSWORD')).toBe(true);
    });
  });

  describe('assertSecureStartup', () => {
    it('throws in production when secrets are insecure and not explicitly allowed', () => {
      expect(() =>
        assertSecureStartup({
          NODE_ENV: 'production',
          JWT_SECRET: 'insecure-dev-secret-change-me-min-32-characters-long',
          ADMIN_PASSWORD: 'changeme123',
        })
      ).toThrow(/Refusing to start/);
    });

    it('warns (does not throw) in production when insecure defaults are explicitly allowed', () => {
      const warnings = assertSecureStartup({
        NODE_ENV: 'production',
        ALLOW_INSECURE_DEFAULTS: 'true',
        JWT_SECRET: 'insecure-dev-secret-change-me-min-32-characters-long',
        ADMIN_PASSWORD: 'changeme123',
      });
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.join('\n')).toMatch(/INSECURE CONFIGURATION/);
    });

    it('warns (does not throw) outside production even without the flag', () => {
      const warnings = assertSecureStartup({
        NODE_ENV: 'development',
        JWT_SECRET: 'short',
      });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('returns no warnings when config is secure in production', () => {
      const warnings = assertSecureStartup({
        NODE_ENV: 'production',
        JWT_SECRET: STRONG_SECRET,
        ADMIN_PASSWORD: 'a-very-strong-password',
      });
      expect(warnings).toHaveLength(0);
    });
  });
});
