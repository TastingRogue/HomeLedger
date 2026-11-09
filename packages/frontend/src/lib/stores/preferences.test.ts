import { afterEach, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('lang');
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('updates the document language when preferences change and restores it on reload', async () => {
  const { setLocale } = await import('./preferences');
  expect(document.documentElement.lang).toBe('en');

  setLocale('es');
  expect(document.documentElement.lang).toBe('es');
  setLocale('pt-BR');
  expect(document.documentElement.lang).toBe('pt-BR');

  document.documentElement.lang = 'en';
  vi.resetModules();
  await import('./preferences');
  expect(document.documentElement.lang).toBe('pt-BR');
});

it('applies the host language to the document on first run', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ defaultLocale: 'pt-BR' }),
  })));
  const { applyInstanceConfig } = await import('./preferences');
  await applyInstanceConfig();
  expect(document.documentElement.lang).toBe('pt-BR');
});
