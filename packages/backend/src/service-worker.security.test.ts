import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

// Execute the actual worker with browser APIs mocked, including legacy caches.
function worker() {
  const listeners: Record<string, (event: unknown) => void> = {};
  const caches = {
    keys: vi.fn(async () => ['homeledger-api-old', 'homeledger-cache-old', 'unrelated-app']),
    delete: vi.fn(async (_key: string) => true),
    match: vi.fn(async () => new Response('previous user data')),
    open: vi.fn(),
  };
  const fetch = vi.fn(async () => new Response('current user data'));
  const source = readFileSync(new URL('../../frontend/src/service-worker.ts', import.meta.url), 'utf8')
    .replace(/import .* from '\$app\/manifest';/, "const immutable = [], assets = [], prerendered = [];")
    .replace(/import .* from '\$app\/env';/, "const version = 'test';");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  runInNewContext(code, {
    self: { location: { origin: 'https://ledger.test' }, addEventListener: (name: string, fn: (event: unknown) => void) => { listeners[name] = fn; }, clients: { claim: vi.fn() } },
    caches, fetch, URL, Response,
  });
  return { listeners, caches, fetch };
}

describe('service worker private data isolation', () => {
  it('never returns a previous user API response when offline', async () => {
    const { listeners, caches, fetch } = worker();
    fetch.mockRejectedValue(new TypeError('Offline'));
    let response: Promise<Response> | undefined;
    listeners['fetch']?.({ request: new Request('https://ledger.test/api/v1/accounts'), respondWith: (value: Promise<Response>) => { response = value; } });
    await expect(response).rejects.toThrow('Offline');
    expect(caches.match).not.toHaveBeenCalled();
    expect(caches.open).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(expect.any(Request), { cache: 'no-store' });
  });

  it('purges legacy private caches on activation without deleting unrelated caches', async () => {
    const { listeners, caches } = worker();
    let activated: Promise<unknown> | undefined;
    listeners['activate']?.({ waitUntil: (value: Promise<unknown>) => { activated = value; } });
    await activated;
    expect(caches.delete.mock.calls.map(([key]) => key)).toEqual(['homeledger-api-old', 'homeledger-cache-old']);
  });
});
