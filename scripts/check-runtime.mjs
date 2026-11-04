// Run ONLY against an isolated instance with disposable synthetic data.
import assert from 'node:assert/strict';
if (process.env.AUDIT_DISPOSABLE !== 'true') throw new Error('Set AUDIT_DISPOSABLE=true for an isolated test instance');
const base = process.env.AUDIT_BASE_URL;
if (!base || !['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('An explicit localhost AUDIT_BASE_URL is required');
const email = process.env.AUDIT_EMAIL;
const password = process.env.AUDIT_PASSWORD;
if (!email || !password) throw new Error('Test credentials are required');
const browser = { 'X-HomeLedger-Session': 'browser' };
async function post(path, body, headers = {}) {
  return fetch(`${base}/api/v1${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
async function data(response) {
  assert.ok(response.ok, `HTTP ${response.status}`);
  return (await response.json()).data;
}
const login = await post('/auth/login', { email, password }, browser);
const sessionCookie = login.headers.getSetCookie().find(value => value.startsWith('hl_refresh='));
assert.ok(sessionCookie?.includes('HttpOnly'));
assert.ok(sessionCookie.includes('SameSite=Strict'));
const cookie = sessionCookie.split(';')[0];
const credentials = await data(login);
assert.equal(credentials.refreshToken, 'cookie');
const headers = { Authorization: `Bearer ${credentials.accessToken}` };
assert.equal((await fetch(`${base}/api/v1/accounts`)).status, 401);
assert.equal((await post('/auth/refresh', { refreshToken: 'cookie' }, { Cookie: cookie })).status, 401);
assert.ok((await data(await post('/auth/refresh', { refreshToken: 'cookie' }, { ...browser, Cookie: cookie }))).accessToken);
const cors = await fetch(`${base}/api/v1/health`, { headers: { Origin: 'https://untrusted.invalid' } });
assert.equal(cors.headers.get('access-control-allow-origin'), null);
const page = await fetch(`${base}/login`);
assert.match(page.headers.get('content-security-policy') ?? '', /script-src/);
assert.ok((await fetch(`${base}/api/docs/`)).ok);
const blocked = await post('/webhooks', { url: 'http://169.254.169.254/metadata', events: ['transaction.created'] }, headers);
assert.ok(blocked.status >= 400 && blocked.status < 500);
const name = `Audit ${Date.now()}`;
await data(await post('/accounts', { name, type: 'Débito', initialBalance: 1234.56 }, headers));
const backup = await data(await post('/backup/export', {}, headers));
const discarded = `${name} discarded`;
await data(await post('/accounts', { name: discarded, type: 'Débito', initialBalance: 0 }, headers));
await data(await post('/backup/import', { backup, confirmed: true }, headers));
const accounts = await data(await fetch(`${base}/api/v1/accounts`, { headers }));
assert.ok(accounts.some(account => account.name === name));
assert.ok(!accounts.some(account => account.name === discarded));
await data(await post('/auth/logout', { refreshToken: 'cookie' }, { ...headers, ...browser, Cookie: cookie }));
assert.equal((await post('/auth/refresh', { refreshToken: 'cookie' }, { ...browser, Cookie: cookie })).status, 401);
console.log('Runtime check passed: authentication, cookie refresh/revocation, CORS, CSP, webhook boundaries and backup restore.');
