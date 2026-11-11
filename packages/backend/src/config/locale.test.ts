import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDefaultLocale, isSupportedLocale } from './locale.js';

afterEach(() => vi.unstubAllEnvs());

describe('host locale resolution', () => {
  it.each(['pt-BR', 'pt-br', 'PT_BR', ' pt-BR ', 'pt'])(
    'resolves %s to Brazilian Portuguese',
    (value) => {
      vi.stubEnv('DEFAULT_LOCALE', value);
      expect(getDefaultLocale()).toBe('pt-BR');
    },
  );

  it.each([
    ['es-MX', 'es'],
    ['en-US', 'en'],
    ['zz', 'en'],
    ['pt-PT', 'en'],
    ['', 'en'],
  ])('preserves fallback behavior for %s', (value, expected) => {
    vi.stubEnv('DEFAULT_LOCALE', value);
    expect(getDefaultLocale()).toBe(expected);
  });

  it('accepts the canonical locale returned to the frontend', () => {
    expect(isSupportedLocale('pt-BR')).toBe(true);
    expect(isSupportedLocale('pt-PT')).toBe(false);
  });
});
