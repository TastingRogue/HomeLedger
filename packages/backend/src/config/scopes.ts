/**
 * API-key scopes (P4.13).
 *
 * A scope is `<action>:<resource>` where action is `read` or `write`, plus the
 * coarse wildcards `read:*` and `write:*`. An API key with NO scopes (null or
 * empty array) has full access — this keeps pre-P4.13 keys working and lets a
 * user create an unrestricted key on purpose. JWT sessions always have full
 * access (scopes only ever restrict API keys).
 *
 * `write:<resource>` implies `read:<resource>` (you can't sensibly write without
 * reading). `write:*` implies everything; `read:*` implies every read scope.
 */

export const SCOPE_RESOURCES = [
  'accounts',
  'transactions',
  'transfers',
  'subscriptions',
  'goals',
  'budgets',
  'categories',
  'reports',
  'networth',
] as const;

export type ScopeResource = (typeof SCOPE_RESOURCES)[number];
export type ScopeAction = 'read' | 'write';

/** All individually-selectable scopes, plus the two coarse wildcards. */
export const ALL_SCOPES: string[] = [
  'read:*',
  'write:*',
  ...SCOPE_RESOURCES.flatMap((r) => [`read:${r}`, `write:${r}`]),
];

const SCOPE_SET = new Set(ALL_SCOPES);

/** True if `scope` is a recognized scope string. */
export function isValidScope(scope: string): boolean {
  return SCOPE_SET.has(scope);
}

/**
 * Does the granted scope list satisfy `required`?
 *
 * - An empty/undefined grant = full access → always true.
 * - `write:*` satisfies anything.
 * - `read:*` satisfies any `read:<resource>`.
 * - `write:<resource>` satisfies both `write:<resource>` and `read:<resource>`.
 * - otherwise an exact match is required.
 */
export function scopesSatisfy(granted: string[] | null | undefined, required: string): boolean {
  if (!granted || granted.length === 0) return true; // full access
  if (granted.includes('write:*')) return true;
  if (granted.includes(required)) return true;

  const [action, resource] = required.split(':') as [ScopeAction, string];
  if (action === 'read') {
    if (granted.includes('read:*')) return true;
    if (granted.includes(`write:${resource}`)) return true; // write implies read
  }
  return false;
}

/**
 * Normalize a user-supplied scope list: trim, dedupe, drop invalid entries.
 * Returns null when the result is empty (meaning "full access").
 */
export function normalizeScopes(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned = [...new Set(input.map((s) => String(s).trim()).filter((s) => s && isValidScope(s)))];
  return cleaned.length > 0 ? cleaned : null;
}

const SCOPE_RESOURCE_SET = new Set<string>(SCOPE_RESOURCES);

/**
 * The scope an API key must hold to call `METHOD path`, or null when the route
 * enforces its own access rules.
 *
 * - `/api/v1/<resource>/...` for a scoped resource: `read:<resource>` for
 *   GET/HEAD/OPTIONS, `write:<resource>` otherwise.
 * - `/api/v1/ha/*` (Home Assistant summary data): `read:reports`.
 * - `/api/v1/mcp/*`: null. The MCP tools check scopes themselves and the
 *   enable/disable routes accept login sessions only.
 * - Everything else (api-keys, webhooks, backup, auth, loans, ...) has no
 *   scope of its own, so it needs the wildcard: `read:*` to read, `write:*`
 *   to change. This keeps a narrowly scoped key from reaching it, e.g. from
 *   minting a broader API key.
 *
 * Keys with no scopes have full access and are never restricted by this.
 */
export function requiredScopeFor(method: string, url: string): string | null {
  const path = (url.split('?')[0] ?? url).replace(/\/+$/, '');
  const action: ScopeAction = ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) ? 'read' : 'write';
  const prefix = '/api/v1/';
  const first = path.startsWith(prefix) ? (path.slice(prefix.length).split('/')[0] ?? '') : '';

  if (first === 'mcp') return null;
  if (first === 'ha') return 'read:reports';
  if (SCOPE_RESOURCE_SET.has(first)) return `${action}:${first}`;
  return `${action}:*`;
}
