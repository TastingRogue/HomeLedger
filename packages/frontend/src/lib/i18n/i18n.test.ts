import { describe, it, expect } from 'vitest';
import { es } from './es';
import {
  supportedLocales,
  isSupportedLocale,
  getIntlTag,
  localeOptions,
  dictionaries,
  DEFAULT_LOCALE,
} from './registry';

describe('i18n dictionary parity', () => {
  const canonicalKeys = Object.keys(es).sort();
  const tokens = (value: string): string[] => (value.match(/\{[^}]+\}/g) ?? []).sort();

  for (const locale of supportedLocales) {
    const dictionary = dictionaries[locale];
    it(`${locale} has every canonical key, nonempty values, and matching placeholders`, () => {
      expect(Object.keys(dictionary).sort()).toEqual(canonicalKeys);
      for (const key of canonicalKeys as (keyof typeof es)[]) {
        expect(dictionary[key].trim(), `${locale}.${key}`).not.toBe('');
        expect(tokens(dictionary[key]), `${locale}.${key} placeholders`).toEqual(tokens(es[key]));
      }
    });
  }
});

describe('i18n registry', () => {
  it('exposes es and en as supported locales', () => {
    expect(supportedLocales).toContain('es');
    expect(supportedLocales).toContain('en');
    expect(supportedLocales).toContain('pt-BR');
  });

  it('recognizes supported locales and rejects others', () => {
    expect(isSupportedLocale('es')).toBe(true);
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('pt-BR')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(42)).toBe(false);
  });

  it('maps locales to BCP-47 Intl tags, falling back to the default', () => {
    expect(getIntlTag('es')).toBe('es-MX');
    expect(getIntlTag('en')).toBe('en-US');
    expect(getIntlTag('pt-BR')).toBe('pt-BR');
    // Unknown locale → default locale's tag.
    expect(getIntlTag('fr' as never)).toBe(getIntlTag(DEFAULT_LOCALE));
  });

  it('builds picker options for every supported locale', () => {
    expect(localeOptions.map((o) => o.value).sort()).toEqual([...supportedLocales].sort());
    for (const opt of localeOptions) expect(opt.label).toBeTruthy();
  });

  it('exposes a dictionary for each supported locale', () => {
    for (const loc of supportedLocales) {
      expect(dictionaries[loc]).toBeDefined();
      expect(Object.keys(dictionaries[loc]).length).toBeGreaterThan(0);
    }
  });
});
