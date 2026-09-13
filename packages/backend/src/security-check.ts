/**
 * Startup security validation.
 *
 * A finance app must not run in production with the shipped insecure demo
 * secrets. This checks JWT_SECRET and ADMIN_PASSWORD at boot:
 *
 * - In production (NODE_ENV=production), insecure values REFUSE to start —
 *   unless the operator explicitly opts into the zero-config demo by setting
 *   ALLOW_INSECURE_DEFAULTS=true (that's what the demo Docker image does).
 * - Outside production (dev/test), insecure values only log a loud warning.
 *
 * The goal: anyone deploying "for real" (their own env / compose, or overriding
 * the demo image) is protected by default, while the out-of-the-box demo image
 * still boots for people just trying it.
 */

/** Known-insecure demo values shipped in the Dockerfile / .env.example. */
const DEMO_JWT_SECRETS = new Set([
  'insecure-dev-secret-change-me-min-32-characters-long',
  'homeledger-dev-secret-key-change-in-production-2024',
  // Legacy demo secret from before the rename — keep blocklisted so any install
  // still using it is refused in production.
  'smart-finance-dev-secret-key-change-in-production-2024',
  'test-secret',
  'your-strong-random-secret-min-32-chars',
]);

const DEMO_ADMIN_PASSWORDS = new Set([
  'changeme123',
  'admin12345',
  'your-strong-password',
]);

const MIN_JWT_SECRET_LENGTH = 32;

export interface SecurityIssue {
  key: string;
  message: string;
}

/** Collects security problems with the current environment configuration. */
export function collectSecurityIssues(env: NodeJS.ProcessEnv = process.env): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  const jwtSecret = env['JWT_SECRET'];
  if (!jwtSecret) {
    issues.push({ key: 'JWT_SECRET', message: 'JWT_SECRET is not set.' });
  } else {
    if (DEMO_JWT_SECRETS.has(jwtSecret)) {
      issues.push({ key: 'JWT_SECRET', message: 'JWT_SECRET is a known insecure demo value.' });
    } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
      issues.push({
        key: 'JWT_SECRET',
        message: `JWT_SECRET is too short (${jwtSecret.length} chars; minimum ${MIN_JWT_SECRET_LENGTH}).`,
      });
    }
  }

  const adminPassword = env['ADMIN_PASSWORD'];
  if (adminPassword && DEMO_ADMIN_PASSWORDS.has(adminPassword)) {
    issues.push({ key: 'ADMIN_PASSWORD', message: 'ADMIN_PASSWORD is a known insecure demo value.' });
  }

  return issues;
}

/**
 * Validates security-sensitive env vars at startup.
 * Returns a list of human-readable lines to log. Throws in production when
 * insecure values are present and ALLOW_INSECURE_DEFAULTS is not enabled.
 */
export function assertSecureStartup(env: NodeJS.ProcessEnv = process.env): string[] {
  const issues = collectSecurityIssues(env);
  if (issues.length === 0) return [];

  const isProduction = env['NODE_ENV'] === 'production';
  const allowInsecure = env['ALLOW_INSECURE_DEFAULTS'] === 'true';
  const lines = issues.map((i) => `  - ${i.message}`);

  if (isProduction && !allowInsecure) {
    const msg =
      'Refusing to start: insecure configuration detected in production.\n' +
      lines.join('\n') +
      '\n\nSet strong values for the above (JWT_SECRET must be a random string of ' +
      `at least ${MIN_JWT_SECRET_LENGTH} characters). To run the insecure demo anyway, ` +
      'set ALLOW_INSECURE_DEFAULTS=true (NOT recommended for anything with real data).';
    throw new Error(msg);
  }

  // Dev/test, or production with the explicit demo opt-in: warn loudly.
  return [
    '⚠️  INSECURE CONFIGURATION — do not use for real data:',
    ...lines,
    isProduction
      ? '   Running anyway because ALLOW_INSECURE_DEFAULTS=true.'
      : '   (Warning only outside production.)',
  ];
}
