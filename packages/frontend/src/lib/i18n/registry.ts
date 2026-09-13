import { es, type TranslationKey } from './es';
import { en } from './en';

/**
 * Language registry — the single source of truth for supported languages.
 *
 * To add a new language:
 *   1. Create the dictionary file (e.g. `fr.ts`) typed as
 *      `Record<TranslationKey, string>` — the compiler will force you to
 *      translate every key that exists in the canonical `es` dictionary.
 *   2. Add one entry to `locales` below with its dictionary, display label,
 *      and BCP-47 tag used for Intl date/number formatting.
 *
 * Everything else (the SupportedLocale type, the settings dropdown, the
 * translation fallback, and date formatting) derives from this map, so no
 * other file needs to change.
 */
export const locales = {
  es: { dictionary: es, label: 'Español', intlTag: 'es-MX' },
  en: { dictionary: en, label: 'English (US)', intlTag: 'en-US' },
} satisfies Record<string, LocaleConfig>;

interface LocaleConfig {
  /** Full translation dictionary for this locale. */
  dictionary: Record<TranslationKey, string>;
  /** Human-readable name shown in the language picker. */
  label: string;
  /** BCP-47 tag for Intl.* (date/number) formatting. */
  intlTag: string;
}

/** Union of supported locale codes, derived from the registry keys. */
export type SupportedLocale = keyof typeof locales;

/** All supported locale codes as an array (order = display order). */
export const supportedLocales = Object.keys(locales) as SupportedLocale[];

/**
 * Application default locale. Falls back to English when the requested locale
 * is unknown. P1.6 makes this host-configurable via a build-time env value.
 */
export const DEFAULT_LOCALE: SupportedLocale = 'es';

/** Type guard: is the given value one of the supported locale codes? */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && value in locales;
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
