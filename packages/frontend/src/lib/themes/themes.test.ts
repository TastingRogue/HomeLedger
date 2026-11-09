import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { themes, createThemeRegistry } from './registry';
import { resolveAppearance } from './runtime';
import { buildAppearanceBootstrap } from './bootstrap';
import type { ThemeDefinition } from './types';

const base = themes.find(definition => definition.id === 'normal');
if (!base) throw new Error('Missing fallback theme');
const contributorTheme: ThemeDefinition = {
  ...base,
  id: 'community-paper',
  name: { es: 'Papel', en: 'Paper', 'pt-BR': 'Papel' },
  description: { es: 'Tema comunitario de prueba.', en: 'Community test theme.', 'pt-BR': 'Tema comunitário de teste.' },
  colorScheme: 'light',
  browserThemeColor: '#fff8ee',
};

describe('theme registration and resolution', () => {
  it('supports a third theme using only its metadata and preserves the preferred mode', () => {
    const registry = createThemeRegistry([...themes, contributorTheme]);
    expect(resolveAppearance(registry, 'community-paper', 'dark')).toEqual({
      id: 'community-paper', mode: 'dark', colorScheme: 'light', browserThemeColor: '#fff8ee',
    });
    expect(resolveAppearance(registry, 'normal', 'dark').colorScheme).toBe('dark');
  });

  it('rejects duplicate IDs, unsafe IDs and missing fallback themes', () => {
    expect(() => createThemeRegistry([...themes, contributorTheme, contributorTheme])).toThrow(/duplicate/);
    expect(() => createThemeRegistry([...themes, { ...contributorTheme, id: 'bad id' }])).toThrow(/Invalid/);
    expect(() => createThemeRegistry([contributorTheme])).toThrow(/fallback/);
  });

  it('falls back safely when a saved community theme has been removed', () => {
    expect(resolveAppearance(themes, 'removed-theme', 'light')).toMatchObject({
      id: 'normal', mode: 'light', colorScheme: 'light',
    });
  });
});

describe('pre-paint appearance bootstrap', () => {
  it.each(['normal', 'cyberpunk', 'community-paper', 'removed-theme'])(
    'matches runtime resolution for %s, including browser chrome color', savedId => {
      const registry = createThemeRegistry([...themes, contributorTheme]);
      const script = buildAppearanceBootstrap(registry);
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.append(meta);
      try {
        runInNewContext(script.slice('<script>'.length, -'</script>'.length), {
          document,
          localStorage: { getItem: (key: string) => key === 'sf_ui_skin' ? savedId : 'light' },
        });
        const expected = resolveAppearance(registry, savedId, 'light');
        expect(document.documentElement.getAttribute('data-ui')).toBe(expected.id);
        expect(document.documentElement.getAttribute('data-theme')).toBe(expected.mode);
        expect(document.documentElement.style.colorScheme).toBe(expected.colorScheme);
        expect(meta.content).toBe(expected.browserThemeColor);
      } finally { meta.remove(); }
    },
  );

  it('still applies the default when localStorage is blocked', () => {
    const script = buildAppearanceBootstrap(themes);
    runInNewContext(script.slice(8, -9), {
      document,
      localStorage: { getItem: () => { throw new Error('Blocked'); } },
    });
    expect(document.documentElement.getAttribute('data-ui')).toBe('normal');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('escapes descriptor text so metadata cannot terminate the inline script', () => {
    const script = buildAppearanceBootstrap([
      ...themes, { ...contributorTheme, browserThemeColor: '</script><script>alert(1)</script>' },
    ]);
    expect(script.match(/<\/script>/g)).toHaveLength(1);
    expect(script).toContain('\\u003c/script>');
  });
});
