import { describe, it, expect } from 'vitest';
import { es } from './es';
import { en } from './en';
import {
  supportedLocales,
  isSupportedLocale,
  getIntlTag,
  localeOptions,
  dictionaries,
  DEFAULT_LOCALE,
} from './registry';

describe('i18n dictionary parity', () => {
  const esKeys = Object.keys(es).sort();
  const enKeys = Object.keys(en).sort();

  it('es and en have exactly the same keys', () => {
    const missingInEn = esKeys.filter((k) => !(k in en));
    const missingInEs = enKeys.filter((k) => !(k in es));
    expect(missingInEn, 'keys present in es but missing in en').toEqual([]);
    expect(missingInEs, 'keys present in en but missing in es').toEqual([]);
    expect(enKeys.length).toBe(esKeys.length);
  });

  it('has no empty translation values', () => {
    for (const [k, v] of Object.entries(es)) expect(v, `es.${k}`).not.toBe('');
    for (const [k, v] of Object.entries(en)) expect(v, `en.${k}`).not.toBe('');
  });

  it('keeps interpolation placeholders consistent across locales', () => {
    // Any `{param}` token in the Spanish string must also exist in the English
    // one (and vice-versa), or a runtime interpolation would silently break.
    const tokens = (s: string): string[] => (s.match(/\{[^}]+\}/g) ?? []).sort();
    for (const key of esKeys) {
      expect(tokens(en[key as keyof typeof en]), `placeholders for "${key}"`).toEqual(
        tokens(es[key as keyof typeof es]),
      );
    }
  });
});

describe('i18n registry', () => {
  it('exposes es and en as supported locales', () => {
    expect(supportedLocales).toContain('es');
    expect(supportedLocales).toContain('en');
  });

  it('recognizes supported locales and rejects others', () => {
    expect(isSupportedLocale('es')).toBe(true);
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(42)).toBe(false);
  });

  it('maps locales to BCP-47 Intl tags, falling back to the default', () => {
    expect(getIntlTag('es')).toBe('es-MX');
    expect(getIntlTag('en')).toBe('en-US');
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
