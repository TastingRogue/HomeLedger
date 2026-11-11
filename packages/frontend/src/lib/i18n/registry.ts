import type { TranslationKey } from './es';
import { locales } from './generated';
export { locales };

/** Union of supported locale codes, derived from the registry keys. */
export type SupportedLocale = keyof typeof locales;

/** All supported locale codes as an array (order = display order). */
export const supportedLocales = Object.keys(locales) as SupportedLocale[];

/**
 * Ultimate fallback locale (English), used for translation fallback and as the
 * last link in the locale resolution chain: stored user choice → host
 * `DEFAULT_LOCALE` (from GET /api/v1/config) → this. The host default is applied
 * at runtime by the locale bootstrap; see `preferences.ts` / `applyHostDefaultLocale`.
 */
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Type guard: is the given value one of the supported locale codes? */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && Object.hasOwn(locales, value);
}

/** Map of locale code -> translation dictionary. */
export const dictionaries = Object.fromEntries(
  supportedLocales.map((code) => [code, locales[code].dictionary]),
) as Record<SupportedLocale, Record<TranslationKey, string>>;

/** BCP-47 tag for Intl formatting for the given locale (falls back to default). */
export function getIntlTag(locale: SupportedLocale): string {
  return (locales[locale] ?? locales[DEFAULT_LOCALE]).intlTag;
}

/** Options for a language picker: `{ value, label }` in registry order. */
export const localeOptions: { value: SupportedLocale; label: string }[] = supportedLocales.map(
  (code) => ({ value: code, label: locales[code].label }),
);
